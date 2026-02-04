package com.easysprintpoker.api.boards;

import com.easysprintpoker.domain.entity.BoardAccessLinkEntity;
import com.easysprintpoker.domain.entity.BoardEntity;
import com.easysprintpoker.domain.entity.BoardMembershipEntity;
import com.easysprintpoker.domain.entity.BoardMembershipId;
import com.easysprintpoker.domain.entity.UserEntity;
import com.easysprintpoker.domain.enums.BoardRole;
import com.easysprintpoker.domain.enums.MembershipStatus;
import com.easysprintpoker.infrastructure.persistence.repository.BoardAccessLinkJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.BoardJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.BoardMembershipJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.UserJpaRepository;
import com.easysprintpoker.infrastructure.security.AuthUtils;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping(path = "/api/v1/boards", produces = MediaType.APPLICATION_JSON_VALUE)
public class BoardsController {

    private final BoardJpaRepository boards;
    private final BoardMembershipJpaRepository memberships;
    private final BoardAccessLinkJpaRepository accessLinks;
    private final UserJpaRepository users;

    public BoardsController(BoardJpaRepository boards, BoardMembershipJpaRepository memberships, BoardAccessLinkJpaRepository accessLinks, UserJpaRepository users) {
        this.boards = boards;
        this.memberships = memberships;
        this.accessLinks = accessLinks;
        this.users = users;
    }

    // 5.1 GET /boards
    @GetMapping
    public BoardsPageResponse list(Authentication auth,
                                   @RequestParam(name = "mode", defaultValue = "member") String mode,
                                   @RequestParam(name = "page", defaultValue = "0") int page,
                                   @RequestParam(name = "size", defaultValue = "20") int size,
                                   @RequestParam(name = "search", required = false) String search) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        if (size > 100) size = 100;
        page = Math.max(0, page);
        size = Math.max(1, size);

        Pageable pageable = PageRequest.of(page, size);
        Page<BoardEntity> result;
        switch (mode.toLowerCase()) {
            case "owner" -> result = boards.findByOwner_Id(userId, pageable);
            case "member" -> result = boards.findActiveMemberBoards(userId, pageable);
            case "all" -> {
                // simple union in-memory for minimal viable behavior
                List<BoardEntity> ownerList = boards.findByOwner_Id(userId, PageRequest.of(0, 500)).getContent();
                List<BoardEntity> memberList = boards.findActiveMemberBoards(userId, PageRequest.of(0, 500)).getContent();
                LinkedHashMap<UUID, BoardEntity> map = new LinkedHashMap<>();
                ownerList.forEach(b -> map.put(b.getId(), b));
                memberList.forEach(b -> map.putIfAbsent(b.getId(), b));
                List<BoardEntity> all = new ArrayList<>(map.values());
                int from = Math.min(page * size, all.size());
                int to = Math.min(from + size, all.size());
                List<BoardEntity> slice = all.subList(from, to);
                result = new PageImpl<>(slice, pageable, all.size());
            }
            default -> result = boards.findActiveMemberBoards(userId, pageable);
        }

        // Поиск по имени/описанию для текущего пользователя (in-memory для MVP)
        List<BoardEntity> content = result.getContent();
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase(Locale.ROOT);
            content = content.stream()
                    .filter(b -> (b.getName() != null && b.getName().toLowerCase(Locale.ROOT).contains(q))
                            || (b.getDescription() != null && b.getDescription().toLowerCase(Locale.ROOT).contains(q)))
                    .toList();
        }

        List<BoardSummaryResponse> items = content.stream()
                .map(b -> BoardSummaryResponse.from(b, memberships))
                .toList();
        long total = (search == null || search.isBlank()) ? result.getTotalElements() : items.size();
        return new BoardsPageResponse(result.getNumber(), result.getSize(), total, items);
    }

    // 5.x GET /boards/{id}/summary — краткие детали (для страницы голосования по id)
    @GetMapping("/{id}/summary")
    public BoardSummaryResponse getBoardSummary(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findById(id).orElseThrow(() -> new NotFoundException("Board not found"));
        // Требование: авторизованные пользователи могут открывать чужие доски для голосования,
        // поэтому краткую сводку доски разрешаем любому аутентифицированному пользователю.
        // Детальные данные и модерация по-прежнему защищены в других эндпоинтах.
        return BoardSummaryResponse.from(board, memberships);
    }

    // 5.3 GET /boards/{boardKey}
    @GetMapping("/{boardKey}")
    public BoardDetailsResponse getByKey(@PathVariable String boardKey, Authentication auth) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        BoardEntity board = boards.findByKey(boardKey).orElseThrow(() -> new NotFoundException("Board not found"));

        boolean isOwner = board.getOwner() != null && userId.equals(board.getOwner().getId());
        Optional<BoardMembershipEntity> myMembershipOpt = memberships.findByBoard_IdAndUser_Id(board.getId(), userId);
        boolean isActiveMember = myMembershipOpt.map(m -> m.getStatus() == MembershipStatus.ACTIVE).orElse(false);
        if (!(isOwner || isActiveMember)) {
            throw new ForbiddenException("No access to board");
        }

        BoardRole myRole = isOwner ? BoardRole.ADMIN : myMembershipOpt.map(BoardMembershipEntity::getRole).orElse(BoardRole.VIEWER);

        // members filtering rules
        List<BoardMembershipEntity> membersToShow;
        if (isOwner || myRole == BoardRole.ADMIN) {
            membersToShow = memberships.findByBoard_Id(board.getId());
        } else {
            membersToShow = memberships.findByBoardIdWithStatuses(board.getId(), List.of(MembershipStatus.ACTIVE));
        }

        // access links only for owner/admin
        List<AccessLinkResponse> links = List.of();
        if (isOwner || myRole == BoardRole.ADMIN) {
            // Lazy load via repository to avoid JSON cycles; just select all for board id
            links = accessLinks.findAll().stream()
                    .filter(l -> l.getBoard() != null && l.getBoard().getId().equals(board.getId()))
                    .map(AccessLinkResponse::from)
                    .collect(Collectors.toList());
        }

        List<MemberResponse> members = membersToShow.stream().map(MemberResponse::from).toList();
        return BoardDetailsResponse.from(board, members, links);
    }

    // DTOs
    public record BoardsPageResponse(int page, int size, long total, List<BoardSummaryResponse> items) {}

    public record BoardSummaryResponse(UUID id, String key, String name, String description, String visibility,
                                       OffsetDateTime lastUsedAt, long participantsCount) {
        public static BoardSummaryResponse from(BoardEntity b, BoardMembershipJpaRepository memberships) {
            long cnt = memberships.countActiveByBoard_Id(b.getId());
            return new BoardSummaryResponse(b.getId(), b.getKey(), b.getName(), b.getDescription(),
                    b.getVisibility().name(), b.getLastUsedAt(), cnt);
        }
    }

    public record BoardDetailsResponse(UUID id, String key, String name, String description, String visibility,
                                       OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime lastUsedAt,
                                       List<MemberResponse> members, List<AccessLinkResponse> accessLinks) {
        public static BoardDetailsResponse from(BoardEntity b, List<MemberResponse> members, List<AccessLinkResponse> links) {
            return new BoardDetailsResponse(b.getId(), b.getKey(), b.getName(), b.getDescription(), b.getVisibility().name(),
                    b.getCreatedAt(), b.getUpdatedAt(), b.getLastUsedAt(), members, links);
        }
    }

    public record MemberResponse(UUID userId, String role, String status, OffsetDateTime joinedAt) {
        public static MemberResponse from(BoardMembershipEntity m) {
            return new MemberResponse(m.getUser().getId(), m.getRole().name(), m.getStatus().name(), m.getJoinedAt());
        }
    }

    public record AccessLinkResponse(UUID id, String role, String label, OffsetDateTime expiresAt, Integer maxUses,
                                     Integer usesCount, OffsetDateTime revokedAt, OffsetDateTime createdAt) {
        public static AccessLinkResponse from(BoardAccessLinkEntity e) {
            return new AccessLinkResponse(e.getId(), e.getRole().name(), e.getLabel(), e.getExpiresAt(), e.getMaxUses(),
                    e.getUsesCount(), e.getRevokedAt(), e.getCreatedAt());
        }
    }

    // 5.x POST /boards — создание доски текущим пользователем
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public BoardSummaryResponse create(Authentication auth, @RequestBody CreateBoardRequest req) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        String name = Optional.ofNullable(req.name).map(String::trim).orElse("");
        if (name.length() < 2) throw new IllegalArgumentException("Name is too short");

        UserEntity owner = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        BoardEntity b = new BoardEntity();
        b.setName(name);
        b.setDescription(Optional.ofNullable(req.description).map(String::trim).orElse(null));
        b.setOwner(owner);
        b.setLastUsedAt(OffsetDateTime.now().withNano(0));
        // Сгенерировать уникальный короткий ключ
        b.setKey(generateUniqueKey());
        BoardEntity saved = boards.save(b);

        // Добавить владельца как участника ADMIN ACTIVE
        BoardMembershipEntity m = new BoardMembershipEntity();
        m.setId(new BoardMembershipId(saved.getId(), owner.getId()));
        m.setBoard(saved);
        m.setUser(owner);
        m.setRole(BoardRole.ADMIN);
        m.setStatus(MembershipStatus.ACTIVE);
        m.setJoinedAt(OffsetDateTime.now().withNano(0));
        memberships.save(m);

        return BoardSummaryResponse.from(saved, memberships);
    }

    private String generateUniqueKey() {
        // Пытаемся несколько раз сгенерировать короткий ключ
        for (int i = 0; i < 10; i++) {
            String key = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            Optional<BoardEntity> exists = boards.findByKey(key);
            if (exists.isEmpty()) {
                return key;
            }
        }
        // fallback длинный ключ
        return UUID.randomUUID().toString();
    }

    public record CreateBoardRequest(String name, String description) {}
}
