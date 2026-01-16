package com.easysprintpoker.api.boards;

import com.easysprintpoker.domain.entity.BoardAccessLinkEntity;
import com.easysprintpoker.domain.entity.BoardEntity;
import com.easysprintpoker.domain.entity.BoardMembershipEntity;
import com.easysprintpoker.domain.enums.BoardRole;
import com.easysprintpoker.domain.enums.MembershipStatus;
import com.easysprintpoker.infrastructure.persistence.repository.BoardAccessLinkJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.BoardJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.BoardMembershipJpaRepository;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
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

    public BoardsController(BoardJpaRepository boards, BoardMembershipJpaRepository memberships, BoardAccessLinkJpaRepository accessLinks) {
        this.boards = boards;
        this.memberships = memberships;
        this.accessLinks = accessLinks;
    }

    private UUID getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof java.util.Map<?,?> map) {
            Object val = map.get("userId");
            if (val != null) {
                try { return UUID.fromString(val.toString()); } catch (Exception ignore) {}
            }
        }
        return null;
    }

    // 5.1 GET /boards
    @GetMapping
    public BoardsPageResponse list(Authentication auth,
                                   @RequestParam(name = "mode", defaultValue = "member") String mode,
                                   @RequestParam(name = "page", defaultValue = "0") int page,
                                   @RequestParam(name = "size", defaultValue = "20") int size) {
        UUID userId = getUserId(auth);
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

        List<BoardSummaryResponse> items = result.getContent().stream().map(BoardSummaryResponse::from).toList();
        return new BoardsPageResponse(result.getNumber(), result.getSize(), result.getTotalElements(), items);
    }

    // 5.3 GET /boards/{boardKey}
    @GetMapping("/{boardKey}")
    public BoardDetailsResponse getByKey(@PathVariable String boardKey, Authentication auth) {
        UUID userId = getUserId(auth);
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
                                       OffsetDateTime lastUsedAt) {
        public static BoardSummaryResponse from(BoardEntity b) {
            return new BoardSummaryResponse(b.getId(), b.getKey(), b.getName(), b.getDescription(),
                    b.getVisibility().name(), b.getLastUsedAt());
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
}
