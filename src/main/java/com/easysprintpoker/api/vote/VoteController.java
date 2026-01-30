package com.easysprintpoker.api.vote;

import com.easysprintpoker.domain.entity.*;
import com.easysprintpoker.domain.enums.ItemStatus;
import com.easysprintpoker.domain.enums.MembershipStatus;
import com.easysprintpoker.domain.enums.ParticipantType;
import com.easysprintpoker.domain.enums.SessionRole;
import com.easysprintpoker.infrastructure.persistence.repository.*;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping(path = "/api/v1/boards/{boardId}/vote", produces = MediaType.APPLICATION_JSON_VALUE)
public class VoteController {

    private final BoardJpaRepository boards;
    private final BoardMembershipJpaRepository memberships;
    private final UserJpaRepository users;
    private final EstimationSessionJpaRepository sessions;
    private final SessionItemJpaRepository items;
    private final SessionParticipantJpaRepository participants;
    private final SessionScaleItemJpaRepository scaleRepo;
    private final VoteJpaRepository votes;
    private final ObjectMapper json;

    public VoteController(BoardJpaRepository boards,
                          BoardMembershipJpaRepository memberships,
                          UserJpaRepository users,
                          EstimationSessionJpaRepository sessions,
                          SessionItemJpaRepository items,
                          SessionParticipantJpaRepository participants,
                          SessionScaleItemJpaRepository scaleRepo,
                          VoteJpaRepository votes,
                          ObjectMapper json) {
        this.boards = boards;
        this.memberships = memberships;
        this.users = users;
        this.sessions = sessions;
        this.items = items;
        this.participants = participants;
        this.scaleRepo = scaleRepo;
        this.votes = votes;
        this.json = json;
    }

    private UUID getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof Map<?,?> map) {
            Object val = map.get("userId");
            if (val != null) {
                try { return UUID.fromString(val.toString()); } catch (Exception ignore) {}
            }
        }
        return null;
    }

    private Map<String, Object> parseSettings(String jsonStr) {
        try {
            if (jsonStr == null || jsonStr.isBlank()) return new HashMap<>();
            return json.readValue(jsonStr, new TypeReference<Map<String, Object>>(){});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String writeSettings(Map<String, Object> map) {
        try { return json.writeValueAsString(map); } catch (Exception e) { return "{}"; }
    }

    private boolean canModerate(BoardEntity board, UUID userId) {
        if (board.getOwner() != null && userId.equals(board.getOwner().getId())) return true;
        // для минимального варианта: проверим активное членство и роль ADMIN
        Optional<BoardMembershipEntity> m = memberships.findByBoard_IdAndUser_Id(board.getId(), userId);
        return m.filter(mm -> mm.getStatus() == MembershipStatus.ACTIVE)
                .map(mm -> mm.getRole() == com.easysprintpoker.domain.enums.BoardRole.ADMIN)
                .orElse(false);
    }

    private EstimationSessionEntity getOrCreateActiveSession(BoardEntity board, UUID userId) {
        // MVP: используем самую новую сессию ACTIVE для доски или создаём новую
        List<EstimationSessionEntity> all = sessions.findAll();
        Optional<EstimationSessionEntity> existing = all.stream()
                .filter(s -> s.getBoard() != null && s.getBoard().getId().equals(board.getId()))
                .max(Comparator.comparing(EstimationSessionEntity::getLastActivityAt, Comparator.nullsFirst(Comparator.naturalOrder())));
        if (existing.isPresent()) return existing.get();

        UserEntity user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        EstimationSessionEntity s = new EstimationSessionEntity();
        s.setBoard(board);
        s.setCreatedBy(user);
        s.setTitle(Optional.ofNullable(board.getName()).orElse("Session"));
        OffsetDateTime now = OffsetDateTime.now().withNano(0);
        s.setStartedAt(now);
        s.setLastActivityAt(now);
        Map<String, Object> settings = new HashMap<>();
        settings.put("revealed", false);
        settings.put("scale", "fib");
        s.setSettingsSnapshot(writeSettings(settings));
        EstimationSessionEntity saved = sessions.save(s);

        // current item default
        SessionItemEntity item = new SessionItemEntity();
        item.setSession(saved);
        item.setCreatedBy(user);
        item.setTitle("Story #1");
        item.setDescription(null);
        item.setPosition(1);
        item.setStatus(ItemStatus.PENDING);
        SessionItemEntity savedItem = items.save(item);
        saved.setCurrentItemId(savedItem.getId());
        sessions.save(saved);

        // init FIB scale
        String[] fib = new String[]{"1","2","3","5","8","13","21","?"};
        for (int i = 0; i < fib.length; i++) {
            SessionScaleItemEntity si = new SessionScaleItemEntity();
            SessionScaleItemId id = new SessionScaleItemId(saved.getId(), i);
            si.setId(id);
            si.setSession(saved);
            si.setLabel(fib[i]);
            si.setNumericValue(parseNumeric(fib[i]));
            si.setSpecial("?".equals(fib[i]));
            scaleRepo.save(si);
        }

        // ensure current user as participant
        ensureParticipant(saved, userId);

        return saved;
    }

    private BigDecimal parseNumeric(String label) {
        try { return new BigDecimal(label); } catch (Exception e) { return null; }
    }

    private SessionParticipantEntity ensureParticipant(EstimationSessionEntity session, UUID userId) {
        return participants.findBySession_IdAndUser_Id(session.getId(), userId)
                .orElseGet(() -> {
                    UserEntity u = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
                    SessionParticipantEntity p = new SessionParticipantEntity();
                    p.setSession(session);
                    p.setParticipantType(ParticipantType.USER);
                    p.setUser(u);
                    String disp = Optional.ofNullable(u.getDisplayName()).filter(s -> !s.isBlank()).orElse(null);
                    if (disp == null) disp = Optional.ofNullable(u.getEmail()).orElse("User");
                    p.setDisplayNameSnapshot(disp);
                    p.setRole(SessionRole.VOTER);
                    p.setJoinedAt(OffsetDateTime.now().withNano(0));
                    return participants.save(p);
                });
    }

    // GET state
    @GetMapping("/state")
    public VoteStateResponse getState(Authentication auth, @PathVariable("boardId") UUID boardId) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));
        // Разрешаем доступ любому аутентифицированному пользователю (требование задачи)

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);
        // Не добавляем текущего пользователя автоматически в участники.
        // Требуется явный "перезаход" после удаления.
        // lazily ensure participants for all active members so список участников отображался
        List<BoardMembershipEntity> activeMembers = memberships.findByBoardIdWithStatuses(boardId, List.of(MembershipStatus.ACTIVE));
        for (BoardMembershipEntity m : activeMembers) {
            if (m.getUser() != null) ensureParticipant(session, m.getUser().getId());
        }

        return buildState(session, userId, board);
    }

    private VoteStateResponse buildState(EstimationSessionEntity session, UUID userId, BoardEntity board) {
        UUID itemId = session.getCurrentItemId();
        Map<String, Object> settings = parseSettings(session.getSettingsSnapshot());
        boolean revealed = Boolean.TRUE.equals(settings.get("revealed"));

        List<SessionScaleItemEntity> scale = scaleRepo.findBySession_IdOrderById_PositionAsc(session.getId());
        List<ScaleItemDto> scaleDto = new ArrayList<>();
        for (int i = 0; i < scale.size(); i++) {
            SessionScaleItemEntity s = scale.get(i);
            scaleDto.add(new ScaleItemDto(i, s.getLabel(), s.getNumericValue()));
        }

        List<SessionParticipantEntity> parts = participants.findBySession_Id(session.getId());
        List<VoteEntity> votesList = (itemId != null) ? votes.findById_ItemId(itemId) : List.of();
        Map<UUID, VoteEntity> votesByPart = new HashMap<>();
        for (VoteEntity v : votesList) {
            votesByPart.put(v.getId().getSessionParticipantId(), v);
        }

        List<ParticipantState> pStates = new ArrayList<>();
        String myVote = null;
        int presentCount = 0;
        int votedCount = 0;
        for (SessionParticipantEntity p : parts) {
            boolean present = p.getLeftAt() == null;
            VoteEntity v = votesByPart.get(p.getId());
            boolean hasVote = v != null;
            if (present) {
                presentCount++;
                if (hasVote) votedCount++;
            }
            String shown = revealed ? (v != null ? v.getValueLabel() : null) : null;
            if (p.getUser() != null && p.getUser().getId().equals(userId) && v != null) {
                myVote = v.getValueLabel();
            }
            // Карточки участников должны показываться только для присутствующих (не kicked/left)
            if (present) {
                String name = Optional.ofNullable(p.getDisplayNameSnapshot()).orElse("User");
                // Пробрасываем актуальный avatarUrl пользователя-участника, чтобы клиенты видели аватарки друг друга
                String avatarUrl = null;
                UUID participantUserId = null;
                if (p.getUser() != null) {
                    participantUserId = p.getUser().getId();
                    avatarUrl = Optional.ofNullable(p.getUser().getAvatarUrl()).orElse(null);
                }
                pStates.add(new ParticipantState(p.getId(), participantUserId, name, hasVote, shown, avatarUrl));
            }
        }

        boolean canModerate = canModerate(board, userId);

        ItemDto currentItem = null;
        if (itemId != null) {
            Optional<SessionItemEntity> it = items.findById(itemId);
            if (it.isPresent()) {
                SessionItemEntity e = it.get();
                currentItem = new ItemDto(e.getId(), e.getTitle(), e.getDescription());
            }
        }

        // Флаг закрытия: раскрыто и все присутствующие проголосовали, и текущий айтем финализирован
        boolean closed = false;
        if (itemId != null) {
            Optional<SessionItemEntity> it = items.findById(itemId);
            if (it.isPresent()) {
                SessionItemEntity e = it.get();
                closed = revealed && presentCount > 0 && votedCount == presentCount && e.getFinalizedAt() != null;
            }
        }

        return new VoteStateResponse(board.getId(), session.getId(), revealed, closed, currentItem, scaleDto, pStates, myVote,
                new PermissionsDto(canModerate, canModerate));
    }

    public record VoteRequest(String valueLabel, BigDecimal numericValue) {}

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public VoteStateResponse castVote(Authentication auth,
                                      @PathVariable("boardId") UUID boardId,
                                      @RequestBody VoteRequest req) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));
        // Разрешаем голосование любому аутентифицированному пользователю

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);
        // Пользователь должен быть участником сессии и не быть кикнутым (leftAt == null)
        SessionParticipantEntity me = participants.findBySession_IdAndUser_Id(session.getId(), userId)
                .orElseThrow(() -> new ForbiddenException("You have been removed from this board. Please re-enter to participate."));
        if (me.getLeftAt() != null) {
            throw new ForbiddenException("You have been removed from this board. Please re-enter to participate.");
        }
        UUID itemId = session.getCurrentItemId();
        if (itemId == null) throw new NotFoundException("No active item");

        // Блокируем изменения, если айтем финализирован
        SessionItemEntity curItem = items.findById(itemId).orElseThrow(() -> new NotFoundException("Item not found"));
        if (curItem.getFinalizedAt() != null) {
            throw new ForbiddenException("Voting is closed for this item");
        }

        VoteId id = new VoteId(itemId, me.getId());
        VoteEntity v = votes.findById(id).orElseGet(() -> {
            VoteEntity nv = new VoteEntity();
            nv.setId(id);
            nv.setSessionId(session.getId());
            nv.setVotedAt(OffsetDateTime.now().withNano(0));
            return nv;
        });
        String label = Optional.ofNullable(req.valueLabel()).map(String::trim).orElse(null);
        if (label == null || label.isBlank()) throw new IllegalArgumentException("valueLabel is required");
        v.setValueLabel(label);
        v.setNumericValue(req.numericValue());
        votes.save(v);

        session.setLastActivityAt(OffsetDateTime.now().withNano(0));
        sessions.save(session);

        // Если раскрыто и после этого все проголосовали — финализируем
        Map<String, Object> settings = parseSettings(session.getSettingsSnapshot());
        boolean revealed = Boolean.TRUE.equals(settings.get("revealed"));
        if (revealed) {
            List<SessionParticipantEntity> parts = participants.findBySession_Id(session.getId());
            List<VoteEntity> votesList = votes.findById_ItemId(itemId);
            Set<UUID> votedPartIds = new HashSet<>();
            for (VoteEntity ve : votesList) votedPartIds.add(ve.getId().getSessionParticipantId());
            boolean allVoted = parts.stream().filter(p -> p.getLeftAt() == null).allMatch(p -> votedPartIds.contains(p.getId()));
            if (allVoted) {
                curItem.setFinalizedAt(OffsetDateTime.now().withNano(0));
                curItem.setFinalizedBy(users.findById(userId).orElse(null));
                items.save(curItem);
            }
        }

        return buildState(session, userId, board);
    }

    // Явное присоединение/перезаход в голосование текущего пользователя
    @PostMapping(path = "/join")
    @Transactional
    public VoteStateResponse join(Authentication auth, @PathVariable("boardId") UUID boardId) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);
        SessionParticipantEntity me = participants.findBySession_IdAndUser_Id(session.getId(), userId).orElse(null);
        if (me == null) {
            // создать нового участника
            ensureParticipant(session, userId);
        } else if (me.getLeftAt() != null) {
            // реактивировать кикнутого
            me.setLeftAt(null);
            me.setJoinedAt(OffsetDateTime.now().withNano(0));
            participants.save(me);
        }

        session.setLastActivityAt(OffsetDateTime.now().withNano(0));
        sessions.save(session);

        return buildState(session, userId, board);
    }

    public record RevealRequest(Boolean revealed) {}

    @PostMapping(path = "/reveal", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public VoteStateResponse toggleReveal(Authentication auth,
                                          @PathVariable("boardId") UUID boardId,
                                          @RequestBody(required = false) RevealRequest req) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));
        if (!canModerate(board, userId)) throw new ForbiddenException("No permission to reveal");

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);
        Map<String, Object> settings = parseSettings(session.getSettingsSnapshot());
        boolean current = Boolean.TRUE.equals(settings.get("revealed"));
        boolean next = (req != null && req.revealed() != null) ? req.revealed() : !current;
        settings.put("revealed", next);
        session.setSettingsSnapshot(writeSettings(settings));
        session.setLastActivityAt(OffsetDateTime.now().withNano(0));
        sessions.save(session);

        // set revealedAt on item when revealing
        if (next && session.getCurrentItemId() != null) {
            items.findById(session.getCurrentItemId()).ifPresent(it -> {
                if (it.getRevealedAt() == null) {
                    it.setRevealedAt(OffsetDateTime.now().withNano(0));
                    items.save(it);
                }
            });
            // Если при раскрытии все проголосовали — финализировать
            UUID itemId = session.getCurrentItemId();
            if (itemId != null) {
                List<SessionParticipantEntity> parts = participants.findBySession_Id(session.getId());
                List<VoteEntity> votesList = votes.findById_ItemId(itemId);
                Set<UUID> votedPartIds = new HashSet<>();
                for (VoteEntity ve : votesList) votedPartIds.add(ve.getId().getSessionParticipantId());
                boolean allVoted = parts.stream().filter(p -> p.getLeftAt() == null).allMatch(p -> votedPartIds.contains(p.getId()));
                if (allVoted) {
                    items.findById(itemId).ifPresent(it -> {
                        if (it.getFinalizedAt() == null) {
                            it.setFinalizedAt(OffsetDateTime.now().withNano(0));
                            it.setFinalizedBy(users.findById(userId).orElse(null));
                            items.save(it);
                        }
                    });
                }
            }
        }

        return buildState(session, userId, board);
    }

    @PostMapping(path = "/reset")
    @Transactional
    public VoteStateResponse resetVotes(Authentication auth, @PathVariable("boardId") UUID boardId) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));
        if (!canModerate(board, userId)) throw new ForbiddenException("No permission to reset");

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);
        UUID itemId = session.getCurrentItemId();
        if (itemId != null) {
            votes.deleteById_ItemId(itemId);
            // Гарантируем немедленную фиксацию удаления в текущей транзакции
            try { votes.flush(); } catch (Exception ignore) {}
            // reset revealed flag
            Map<String, Object> settings = parseSettings(session.getSettingsSnapshot());
            settings.put("revealed", false);
            session.setSettingsSnapshot(writeSettings(settings));
            session.setLastActivityAt(OffsetDateTime.now().withNano(0));
            sessions.save(session);
            // clear item revealedAt
            items.findById(itemId).ifPresent(it -> {
                it.setRevealedAt(null);
                it.setFinalizedAt(null);
                it.setFinalLabel(null);
                it.setFinalNumeric(null);
                items.save(it);
            });
        }

        return buildState(session, userId, board);
    }

    // Исключить участника (только владелец/ADMIN)
    @PostMapping(path = "/kick/{userId}")
    public VoteStateResponse kick(Authentication auth,
                                  @PathVariable("boardId") UUID boardId,
                                  @PathVariable("userId") UUID targetUserId) {
        UUID userId = getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(boardId).orElseThrow(() -> new NotFoundException("Board not found"));
        if (!canModerate(board, userId)) throw new ForbiddenException("No permission to kick");

        EstimationSessionEntity session = getOrCreateActiveSession(board, userId);

        // Пометить членство REMOVED, если было
        memberships.findByBoard_IdAndUser_Id(boardId, targetUserId).ifPresent(m -> {
            if (m.getStatus() != MembershipStatus.REMOVED) {
                m.setStatus(MembershipStatus.REMOVED);
                memberships.save(m);
            }
        });

        // Пометить участника как покинувшего
        participants.findBySession_IdAndUser_Id(session.getId(), targetUserId).ifPresent(p -> {
            if (p.getLeftAt() == null) {
                p.setLeftAt(OffsetDateTime.now().withNano(0));
                participants.save(p);
                // удалить его голос по текущему айтему
                UUID itemId = session.getCurrentItemId();
                if (itemId != null) {
                    votes.findById_ItemIdAndId_SessionParticipantId(itemId, p.getId()).ifPresent(votes::delete);
                }
            }
        });

        return buildState(session, userId, board);
    }

    // DTOs
    public record VoteStateResponse(UUID boardId, UUID sessionId, boolean revealed, boolean closed, ItemDto currentItem,
                                    List<ScaleItemDto> scale, List<ParticipantState> participants,
                                    String myVote, PermissionsDto permissions) {}
    public record ItemDto(UUID id, String title, String description) {}
    public record ScaleItemDto(int position, String label, BigDecimal numeric) {}
    public record ParticipantState(UUID id, UUID userId, String name, boolean voted, String value, String avatarUrl) {}
    public record PermissionsDto(boolean canReveal, boolean canReset) {}
}
