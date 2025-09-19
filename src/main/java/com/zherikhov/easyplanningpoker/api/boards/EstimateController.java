package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardMembersService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserProfilesService;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Minimal in-memory implementation of planning poker estimation per board with SSE.
 * This is intentionally stateless in DB to keep changes minimal.
 */
@RestController
@RequestMapping({"/api/boards/{id}", "/boards/{id}"})
public class EstimateController {

    private final JwtProvider jwtProvider;
    private final UserService userService;
    private final BoardService boardService;
    private final BoardMembersService boardMembersService;
    private final UserProfilesService userProfilesService;

    public EstimateController(JwtProvider jwtProvider, UserService userService, BoardService boardService, BoardMembersService boardMembersService, UserProfilesService userProfilesService) {
        this.jwtProvider = jwtProvider;
        this.userService = userService;
        this.boardService = boardService;
        this.boardMembersService = boardMembersService;
        this.userProfilesService = userProfilesService;
    }

    // Allowed Fibonacci values
    private static final List<String> FIBONACCI = List.of("0","1","2","3","5","8","13","21","34");

    // In-memory state per board
    private static final Map<UUID, RoundState> STATES = new ConcurrentHashMap<>();
    private static final Map<UUID, List<RoundSnapshot>> HISTORY = new ConcurrentHashMap<>();
    private static final Map<UUID, ConcurrentHashMap<UUID, SseEmitter>> EMITTERS = new ConcurrentHashMap<>();

    // --- Models ---
    public record TaskDto(String key, String title, String link, String description) {}
    public enum RoundStatus { voting, revealed }

    public static class ParticipantDto {
        public UUID userId;
        public String name;
        public String initials;
        public String status; // waiting, voted, offline
        public boolean online;
        public String voteMasked; // "?" or "V" or null
        public String vote; // revealed value (null before reveal)
    }

    public static class RoundState {
        public UUID boardId;
        public RoundStatus status = RoundStatus.voting;
        public TaskDto task;
        public Map<UUID, String> votes = new HashMap<>(); // userId -> value
        public Map<UUID, Instant> lastSeen = new HashMap<>();
        public boolean autoReveal = true;
        public Instant startedAt = Instant.now();
        public Summary summary; // only after reveal
    }

    public static class Summary {
        public String min;
        public String max;
        public String median;
        public String mode;
        public boolean consensus;
    }

    public static class RoundSnapshot {
        public TaskDto task;
        public Instant startedAt;
        public Instant endedAt;
        public Map<UUID, String> votes;
        public Summary summary;
    }

    public record VoteRequest(@NotBlank String value) {}
    public record RoundRequest(String taskId, String title, String link, String description) {}

    // --- Helpers ---
    private Optional<User> currentUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        Object principal = auth.getPrincipal();
        try {
            String idStr;
            if (principal instanceof org.springframework.security.core.userdetails.User u) {
                idStr = u.getUsername();
            } else if (principal instanceof String s) {
                idStr = s;
            } else {
                return Optional.empty();
            }
            UUID userId = UUID.fromString(idStr);
            return userService.findById(userId);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private boolean isFacilitator(Board board, User user) {
        return board.getOwner().getId().equals(user.getId());
    }

    private RoundState stateForBoard(UUID boardId) {
        return STATES.computeIfAbsent(boardId, id -> {
            RoundState s = new RoundState();
            s.boardId = id;
            s.status = RoundStatus.voting;
            s.task = null;
            s.autoReveal = true;
            s.startedAt = Instant.now();
            return s;
        });
    }

    private void emit(UUID boardId, String eventName, Object data) {
        ConcurrentHashMap<UUID, SseEmitter> map = EMITTERS.computeIfAbsent(boardId, k -> new ConcurrentHashMap<>());
        List<UUID> deadUsers = new ArrayList<>();
        for (Map.Entry<UUID, SseEmitter> entry : map.entrySet()) {
            UUID userId = entry.getKey();
            SseEmitter emitter = entry.getValue();
            try {
                SseEmitter.SseEventBuilder builder = SseEmitter.event()
                        .name(eventName)
                        .data(data);
                emitter.send(builder);
            } catch (IllegalStateException | IOException ex) {
                deadUsers.add(userId);
                try { emitter.completeWithError(ex); } catch (Exception ignored) {}
            } catch (Exception ex) {
                deadUsers.add(userId);
                try { emitter.completeWithError(ex); } catch (Exception ignored) {}
            }
        }
        for (UUID uid : deadUsers) { map.remove(uid); }
    }

    private static Map<String, String> error(String code, String message) {
        return Map.of("error", code, "message", message);
    }

    private List<ParticipantDto> participants(Board board, RoundState s) {
        // For minimal implementation, participants = board members in DB if any; otherwise only users who joined (tracked via lastSeen)
        // Status: online if lastSeen within 60s
        Instant now = Instant.now();
        long offlineThresholdMs = 60_000L;
        Set<UUID> ids = new HashSet<>(s.lastSeen.keySet());
        // also include owner as facilitator
        ids.add(board.getOwner().getId());
        // Map to names
        List<ParticipantDto> list = new ArrayList<>();
        for (UUID uid : ids) {
            Optional<User> uo = userService.findById(uid);
            if (uo.isEmpty()) continue;
            User u = uo.get();
            ParticipantDto p = new ParticipantDto();
            p.userId = u.getId();
            String displayName = userProfilesService.findByUserId(u.getId()).map(UserProfile::getDisplayName).orElse(null);
            if (displayName == null || displayName.isBlank()) displayName = u.getUsername()!=null && !u.getUsername().isBlank() ? u.getUsername() : u.getEmail();
            p.name = displayName;
            String initials = "";
            if (displayName != null && !displayName.isBlank()) initials = displayName.substring(0,1).toUpperCase();
            p.initials = initials;
            boolean online = s.lastSeen.containsKey(uid) && (now.toEpochMilli() - s.lastSeen.get(uid).toEpochMilli() < offlineThresholdMs);
            p.online = online;
            String v = s.votes.get(uid);
            boolean hasVoted = v != null;
            p.status = online ? (hasVoted ? "voted" : "waiting") : "offline";
            p.vote = (s.status == RoundStatus.revealed) ? v : null;
            p.voteMasked = (s.status == RoundStatus.revealed) ? null : (hasVoted ? "V" : "?");
            list.add(p);
        }
        // Sort: facilitator first (owner), then by name
        list.sort((a,b) -> {
            boolean af = a.userId.equals(board.getOwner().getId());
            boolean bf = b.userId.equals(board.getOwner().getId());
            if (af && !bf) return -1; if (bf && !af) return 1; return a.name.compareToIgnoreCase(b.name);
        });
        return list;
    }

    private Summary computeSummary(Collection<String> values) {
        List<Integer> nums = values.stream().filter(Objects::nonNull).map(Integer::parseInt).sorted().toList();
        if (nums.isEmpty()) return null;
        Summary s = new Summary();
        s.min = String.valueOf(nums.get(0));
        s.max = String.valueOf(nums.get(nums.size()-1));
        int mid = nums.size()/2;
        if (nums.size()%2==0) {
            s.median = String.valueOf(nums.get(mid-1));
        } else {
            s.median = String.valueOf(nums.get(mid));
        }
        // mode
        Map<Integer, Long> freq = nums.stream().collect(Collectors.groupingBy(x->x, Collectors.counting()));
        int mode = nums.get(0);
        long best = 0;
        for (Map.Entry<Integer, Long> e : freq.entrySet()) {
            if (e.getValue() > best) { best = e.getValue(); mode = e.getKey(); }
        }
        s.mode = String.valueOf(mode);
        s.consensus = freq.size() == 1;
        return s;
    }

    private ResponseEntity<?> checkBoardAccess(UUID id, User user) {
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        // For minimal viable: allow owner and any member who has joined via join endpoint
        return ResponseEntity.ok(b.get());
    }

    // --- Endpoints ---

    @GetMapping({"/state", "/estimate"})
    public ResponseEntity<?> state(@PathVariable UUID id) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        ResponseEntity<?> access = checkBoardAccess(id, uo.get());
        if (access.getStatusCode().isError()) return access;
        Board board = (Board) access.getBody();
        RoundState s = stateForBoard(id);
        Map<String,Object> resp = new LinkedHashMap<>();
        resp.put("status", s.status.name());
        resp.put("task", s.task);
        resp.put("participants", participants(board, s));
        resp.put("allowedValues", FIBONACCI);
        resp.put("summary", s.status==RoundStatus.revealed ? s.summary : null);
        return ResponseEntity.ok(resp);
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(HttpServletRequest request, @PathVariable UUID id) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return null;
        // 120 minutes timeout
        long timeoutMs = 120L * 60L * 1000L;
        SseEmitter emitter = new SseEmitter(timeoutMs);
        // Remove previous emitter for same user on resubscribe to avoid leaks
        UUID userId = uo.get().getId();
        ConcurrentHashMap<UUID, SseEmitter> map = EMITTERS.computeIfAbsent(id, k -> new ConcurrentHashMap<>());
        SseEmitter prev = map.put(userId, emitter);
        if (prev != null) {
            try { prev.complete(); } catch (Exception ignored) {}
        }
        Runnable remove = () -> {
            SseEmitter current = map.get(userId);
            if (current == emitter) {
                map.remove(userId);
            }
        };
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(t -> remove.run());
        try {
            emitter.send(SseEmitter.event().name("CONNECTED").data(Map.of("time", Instant.now().toString())));
        } catch (IOException | IllegalStateException ex) {
            try { emitter.completeWithError(ex); } catch (Exception ignored) {}
            remove.run();
        }
        return emitter;
    }

    @PostMapping("/join")
    public ResponseEntity<?> join(@PathVariable UUID id) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        RoundState s = stateForBoard(id);
        s.lastSeen.put(user.getId(), Instant.now());
        // Emit event
        emit(id, "USER_JOINED", Map.of("userId", user.getId(), "name", user.getEmail()));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/vote")
    public ResponseEntity<?> vote(@PathVariable UUID id, @RequestBody VoteRequest dto) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        RoundState s = stateForBoard(id);
        if (s.status == RoundStatus.revealed) return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(error("REVEALED","Voting closed"));
        if (!FIBONACCI.contains(dto.value())) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("BAD_VALUE","Value not allowed"));
        // Idempotent by userId
        s.votes.put(user.getId(), dto.value());
        s.lastSeen.put(user.getId(), Instant.now());
        emit(id, "VOTE_CAST", Map.of("userId", user.getId(), "masked", true));
        // auto-reveal if enabled and all online participants voted
        if (s.autoReveal) {
            boolean allVoted = participants(b.get(), s).stream().filter(p -> p.online).allMatch(p -> s.votes.containsKey(p.userId));
            if (allVoted && !s.votes.isEmpty()) {
                doReveal(b.get(), s);
                emit(id, "REVEALED", buildRevealPayload(b.get(), s));
            }
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/reveal")
    public ResponseEntity<?> reveal(@PathVariable UUID id) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        if (!isFacilitator(b.get(), user)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN","Only facilitator can reveal"));
        RoundState s = stateForBoard(id);
        if (s.status == RoundStatus.revealed) return ResponseEntity.status(HttpStatus.CONFLICT).body(error("ALREADY_REVEALED","Already revealed"));
        doReveal(b.get(), s);
        emit(id, "REVEALED", buildRevealPayload(b.get(), s));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private void doReveal(Board board, RoundState s) {
        s.status = RoundStatus.revealed;
        s.summary = computeSummary(s.votes.values());
    }

    private Map<String,Object> buildRevealPayload(Board board, RoundState s) {
        Map<String,Object> payload = new LinkedHashMap<>();
        payload.put("status", s.status.name());
        payload.put("participants", participants(board, s));
        payload.put("summary", s.summary);
        return payload;
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(@PathVariable UUID id) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        if (!isFacilitator(b.get(), user)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN","Only facilitator can reset"));
        RoundState s = stateForBoard(id);
        if (s.status == RoundStatus.voting && s.votes.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("ALREADY_RESET","Nothing to reset"));
        }
        // Save to history
        RoundSnapshot snap = new RoundSnapshot();
        snap.task = s.task;
        snap.startedAt = s.startedAt;
        snap.endedAt = Instant.now();
        snap.votes = new HashMap<>(s.votes);
        snap.summary = s.summary;
        HISTORY.computeIfAbsent(id, k -> new ArrayList<>()).add(0, snap);
        // Reset
        s.votes.clear();
        s.status = RoundStatus.voting;
        s.summary = null;
        s.startedAt = Instant.now();
        emit(id, "RESET", Map.of("status","voting"));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/round")
    public ResponseEntity<?> round(@PathVariable UUID id, @RequestBody RoundRequest dto) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        if (!isFacilitator(b.get(), user)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN","Only facilitator can start new round"));
        RoundState s = stateForBoard(id);
        // Start new round with optional task
        s.task = new TaskDto(dto.taskId(), dto.title(), dto.link(), dto.description());
        s.votes.clear();
        s.status = RoundStatus.voting;
        s.summary = null;
        s.startedAt = Instant.now();
        emit(id, "ROUND_STARTED", Map.of("task", s.task));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(@PathVariable UUID id, @RequestParam(name = "limit", required = false, defaultValue = "20") int limit) {
        Optional<User> uo = currentUser();
        if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED","Missing or invalid token"));
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND","Board not found"));
        List<RoundSnapshot> items = HISTORY.getOrDefault(id, List.of());
        if (items.size() > limit) {
            items = new ArrayList<>(items.subList(0, limit));
        }
        return ResponseEntity.ok(items);
    }
}
