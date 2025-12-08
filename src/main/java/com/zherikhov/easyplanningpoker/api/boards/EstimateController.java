package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserProfilesService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import com.zherikhov.easyplanningpoker.infrastructure.security.CurrentUserProvider;
import com.zherikhov.easyplanningpoker.infrastructure.sse.SseHub;
import com.zherikhov.easyplanningpoker.infrastructure.events.RedisEventBus;
import com.zherikhov.easyplanningpoker.infrastructure.state.RedisRoundStateService;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Minimal in-memory implementation of planning poker estimation per board with SSE.
 * This is intentionally stateless in DB to keep changes minimal.
 */
@Slf4j
@RestController
@RequestMapping("/api/boards/{id}")
public class EstimateController {

    private final UserService userService;
    private final BoardService boardService;
    private final UserProfilesService userProfilesService;
    private final CurrentUserProvider currentUserProvider;

    private final SseHub sseHub;
    private final RedisEventBus eventBus;
    private final RedisRoundStateService redisState;

    public EstimateController(UserService userService, BoardService boardService, UserProfilesService userProfilesService, CurrentUserProvider currentUserProvider, SseHub sseHub, RedisEventBus eventBus, RedisRoundStateService redisState) {
        this.userService = userService;
        this.boardService = boardService;
        this.userProfilesService = userProfilesService;
        this.currentUserProvider = currentUserProvider;
        this.sseHub = sseHub;
        this.eventBus = eventBus;
        this.redisState = redisState;
    }

    // Allowed Fibonacci values
    private static final List<String> FIBONACCI = List.of("0", "1", "2", "3", "5", "8", "13", "21", "34", "55");

    // In-memory state per board
    private static final Map<UUID, RoundState> STATES = new ConcurrentHashMap<>();
    private static final Map<UUID, List<RoundSnapshot>> HISTORY = new ConcurrentHashMap<>();
    private static final Map<UUID, ConcurrentHashMap<UUID, SseEmitter>> EMITTERS = new ConcurrentHashMap<>(); // deprecated: kept for backward compatibility until full Redis state migration

    // --- Models ---
    public record TaskDto(String key, String title, String link, String description) {
    }

    public enum RoundStatus {voting, revealed}

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

    public record VoteRequest(@NotBlank String value) {
    }

    public record RoundRequest(String taskId, String title, String link, String description) {
    }

    @GetMapping({"/state", "/estimate"})
    public ResponseEntity<?> state(@PathVariable UUID id) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        ResponseEntity<?> access = checkBoardAccess(id, uo.get());
        if (access.getStatusCode().isError()) return access;
        Board board = (Board) access.getBody();
        RoundState s = redisState.getState(id);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", s.status.name());
        resp.put("task", s.task);
        assert board != null;
        resp.put("participants", participants(board, s));
        resp.put("allowedValues", FIBONACCI);
        resp.put("summary", s.status == RoundStatus.revealed ? s.summary : null);
        resp.put("facilitatorId", board.getOwner().getId());
        log.debug("State fetched: boardId={}, status={}, votes={}, task={}", id, s.status, s.votes.size(), s.task != null ? s.task.key() : null);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/join")
    public ResponseEntity<?> join(@PathVariable UUID id) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        RoundState s = redisState.getState(id);
        s.lastSeen.put(user.getId(), Instant.now());
        redisState.saveState(id, s);
        // Emit event
        log.info("User joined: boardId={}, userId={}", id, user.getId());
        eventBus.publish(id, "USER_JOINED", Map.of("userId", user.getId(), "name", user.getEmail()));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/vote")
    public ResponseEntity<?> vote(@PathVariable UUID id, @RequestBody VoteRequest dto) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        RoundState s = redisState.getState(id);
        if (s.status == RoundStatus.revealed)
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(error("REVEALED", "Voting closed"));
        if (!FIBONACCI.contains(dto.value()))
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("BAD_VALUE", "Value not allowed"));
        // Idempotent by userId
        s.votes.put(user.getId(), dto.value());
        s.lastSeen.put(user.getId(), Instant.now());
        redisState.saveState(id, s);
        log.info("Vote cast: boardId={}, userId={}", id, user.getId());
        eventBus.publish(id, "VOTE_CAST", Map.of("userId", user.getId(), "masked", true));
        // auto-reveal if enabled and all online participants voted
        if (s.autoReveal) {
            boolean allVoted = participants(b.get(), s).stream().filter(p -> p.online).allMatch(p -> s.votes.containsKey(p.userId));
            if (allVoted && !s.votes.isEmpty()) {
                doReveal(b.get(), s);
                redisState.saveState(id, s);
                log.info("Auto reveal triggered: boardId={}, votes={} ", id, s.votes.size());
                eventBus.publish(id, "REVEALED", buildRevealPayload(b.get(), s));
            }
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/reveal")
    public ResponseEntity<?> reveal(@PathVariable UUID id) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        if (!isFacilitator(b.get(), user))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Only facilitator can reveal"));
        RoundState s = redisState.getState(id);
        if (s.status == RoundStatus.revealed)
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("ALREADY_REVEALED", "Already revealed"));
        doReveal(b.get(), s);
        redisState.saveState(id, s);
        log.info("Revealed manually: boardId={}, byUserId={}, votes={}", id, user.getId(), s.votes.size());
        eventBus.publish(id, "REVEALED", buildRevealPayload(b.get(), s));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(HttpServletRequest request, @PathVariable UUID id) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty()) {
            // 401 до начала SSE
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid token");
        }

        // Проверяем доступ к доске ДО создания эмиттера, чтобы не коммитить SSE при ошибках
        ResponseEntity<?> access = checkBoardAccess(id, uo.get());
        if (access.getStatusCode().isError()) {
            HttpStatus status = (HttpStatus) access.getStatusCode();
            String reason = null;
            Object body = access.getBody();
            if (body instanceof Map<?, ?> map) {
                Object msg = map.get("message");
                if (msg instanceof String s) reason = s;
            }
            throw new org.springframework.web.server.ResponseStatusException(status, reason);
        }

        long timeoutMs = 120L * 60L * 1000L;
        UUID userId = uo.get().getId();
        SseEmitter emitter = sseHub.register(id, userId, timeoutMs);
        try {
            emitter.send(SseEmitter.event().name("CONNECTED").data(Map.of("time", Instant.now().toString())));
        } catch (IOException | IllegalStateException ex) {
            sseHub.close(id, userId);
        }
        return emitter;
    }

    @DeleteMapping("/participants/{userId}")
    public ResponseEntity<?> removeParticipant(@PathVariable UUID id, @PathVariable UUID userId) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User requester = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        if (!isFacilitator(b.get(), requester))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Only facilitator can remove participants"));
        // cannot remove facilitator himself from participant list
        if (b.get().getOwner().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("BAD_REQUEST", "Cannot remove facilitator"));
        }
        RoundState s = redisState.getState(id);
        boolean changed = false;
        if (s.votes.remove(userId) != null) changed = true;
        if (s.lastSeen.remove(userId) != null) changed = true;
        if (changed) redisState.saveState(id, s);
        // Also drop SSE emitter for that user if present (they can reconnect later)
        try {
            sseHub.close(id, userId);
        } catch (Exception ignored) {}
        if (changed) {
            log.info("Participant removed from session: boardId={}, removedUserId={}, byUserId={}", id, userId, requester.getId());
        }
        eventBus.publish(id, "USER_REMOVED", Map.of("userId", userId));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/round")
    public ResponseEntity<?> round(@PathVariable UUID id, @RequestBody RoundRequest dto) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        if (!isFacilitator(b.get(), user))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Only facilitator can start new round"));
        RoundState s = redisState.getState(id);
        // Start new round with optional task
        s.task = new TaskDto(dto.taskId(), dto.title(), dto.link(), dto.description());
        s.votes.clear();
        s.status = RoundStatus.voting;
        s.summary = null;
        s.startedAt = Instant.now();
        redisState.saveState(id, s);
        log.info("Round started: boardId={}, byUserId={}, taskKey={}", id, user.getId(), s.task != null ? s.task.key() : null);
        eventBus.publish(id, "ROUND_STARTED", Map.of("task", s.task));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(@PathVariable UUID id, @RequestParam(name = "limit", required = false, defaultValue = "20") int limit) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        List<Map<String, Object>> history = redisState.getHistory(id, limit);
        log.debug("History fetched: boardId={}, returned={}", id, history.size());
        return ResponseEntity.ok(history);
    }


    private boolean isFacilitator(Board board, User user) {
        return board.getOwner().getId().equals(user.getId());
    }

    private RoundState stateForBoard(UUID boardId) { return redisState.getState(boardId); }

    private void emit(UUID boardId, String eventName, Object data) { eventBus.publish(boardId, eventName, data); }

    private static Map<String, String> error(String code, String message) {
        return Map.of("error", code, "message", message);
    }

    private List<ParticipantDto> participants(Board board, RoundState s) {
        // Status: online if lastSeen within 30 m
        Instant now = Instant.now();
        long offlineThresholdMs = 1000L * 60L * 30L;

        Set<UUID> ids = new HashSet<>(s.lastSeen.keySet());
        // also include an owner as facilitator
        ids.add(board.getOwner().getId());
        // Map to names
        List<ParticipantDto> list = new ArrayList<>();

        for (UUID uid : ids) {
            Optional<User> optionalUser = userService.findById(uid);
            if (optionalUser.isEmpty()) continue;
            User user = optionalUser.get();
            ParticipantDto participantDto = new ParticipantDto();
            participantDto.userId = user.getId();
            String displayName = userProfilesService.findByUserId(user.getId()).map(UserProfile::getDisplayName).orElse(null);
            if (displayName == null || displayName.isBlank())
                displayName = user.getUsername() != null && !user.getUsername().isBlank() ? user.getUsername() : user.getEmail();
            participantDto.name = displayName;
            String initials = "";
            if (displayName != null && !displayName.isBlank()) initials = displayName.substring(0, 1).toUpperCase();
            participantDto.initials = initials;
            boolean online = s.lastSeen.containsKey(uid) && (now.toEpochMilli() - s.lastSeen.get(uid).toEpochMilli() < offlineThresholdMs);
            participantDto.online = online;
            String v = s.votes.get(uid);
            boolean hasVoted = v != null;
            participantDto.status = online ? (hasVoted ? "voted" : "waiting") : "offline";
            participantDto.vote = (s.status == RoundStatus.revealed) ? v : null;
            participantDto.voteMasked = (s.status == RoundStatus.revealed) ? null : (hasVoted ? "V" : "?");
            list.add(participantDto);
        }

        // Sort: facilitator first (owner), then by name
        list.sort((a, b) -> {
            boolean af = a.userId.equals(board.getOwner().getId());
            boolean bf = b.userId.equals(board.getOwner().getId());
            if (af && !bf) return -1;
            if (bf && !af) return 1;
            return a.name.compareToIgnoreCase(b.name);
        });
        return list;
    }

    private Summary computeSummary(Collection<String> values) {
        List<Integer> nums = values.stream().filter(Objects::nonNull).map(Integer::parseInt).sorted().toList();
        if (nums.isEmpty()) return null;
        Summary summary = new Summary();
        summary.min = String.valueOf(nums.getFirst());
        summary.max = String.valueOf(nums.getLast());
        int mid = nums.size() / 2;
        if (nums.size() % 2 == 0) {
            summary.median = String.valueOf(nums.get(mid - 1));
        } else {
            summary.median = String.valueOf(nums.get(mid));
        }

        // mode
        Map<Integer, Long> freq = nums.stream().collect(Collectors.groupingBy(x -> x, Collectors.counting()));
        int mode = nums.getFirst();
        long best = 0;
        for (Map.Entry<Integer, Long> e : freq.entrySet()) {
            if (e.getValue() > best) {
                best = e.getValue();
                mode = e.getKey();
            }
        }
        summary.mode = String.valueOf(mode);
        summary.consensus = freq.size() == 1;
        return summary;
    }

    private ResponseEntity<?> checkBoardAccess(UUID id, User user) {
        Optional<Board> optionalBoard = boardService.findById(id);
        if (optionalBoard.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        }
        // For minimal viable: allow an owner and any member who has joined via join endpoint
        return ResponseEntity.ok(optionalBoard.get());
    }

    private void doReveal(Board board, RoundState s) {
        s.status = RoundStatus.revealed;
        s.summary = computeSummary(s.votes.values());
    }

    private Map<String, Object> buildRevealPayload(Board board, RoundState s) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", s.status.name());
        payload.put("participants", participants(board, s));
        payload.put("summary", s.summary);
        return payload;
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(@PathVariable UUID id) {
        Optional<User> uo = currentUserProvider.getCurrentUser();
        if (uo.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing or invalid token"));
        User user = uo.get();
        Optional<Board> b = boardService.findById(id);
        if (b.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        if (!isFacilitator(b.get(), user))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Only facilitator can reset"));
        RoundState s = redisState.getState(id);
        if (s.status == RoundStatus.voting && s.votes.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("ALREADY_RESET", "Nothing to reset"));
        }
        // Save to history
        RoundSnapshot snap = new RoundSnapshot();
        snap.task = s.task;
        snap.startedAt = s.startedAt;
        snap.endedAt = Instant.now();
        snap.votes = new HashMap<>(s.votes);
        snap.summary = s.summary;
        // persist snapshot to Redis history
        redisState.addHistory(id, snap);
        // Reset
        s.votes.clear();
        s.status = RoundStatus.voting;
        s.summary = null;
        s.startedAt = Instant.now();
        redisState.saveState(id, s);
        log.info("Round reset: boardId={}, byUserId={}", id, user.getId());
        eventBus.publish(id, "RESET", Map.of("status", "voting"));
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
