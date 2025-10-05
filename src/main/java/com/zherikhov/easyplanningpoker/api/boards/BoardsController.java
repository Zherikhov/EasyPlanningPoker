package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.application.board.BoardResponse;
import com.zherikhov.easyplanningpoker.application.board.CreateBoardRequest;
import com.zherikhov.easyplanningpoker.application.board.ShareBoardRequest;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardMembersService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
@Slf4j
public class BoardsController {

    private final UserService userService;
    private final BoardService boardService;
    private final BoardMembersService boardMembersService;

    public BoardsController(UserService userService, BoardService boardService, BoardMembersService boardMembersService) {
        this.userService = userService;
        this.boardService = boardService;
        this.boardMembersService = boardMembersService;
    }

    // List boards: owned, shared, or both (default)
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(value = "shared", required = false) Boolean shared) {
        User me = currentUser().orElse(null);
        if (me == null) return unauthorized();

        List<BoardResponse> result;
        if (shared == null) {
            // both
            List<BoardResponse> owned = boardService.findByOwner(me).stream()
                    .map(BoardResponse::from)
                    .toList();
            List<BoardResponse> sharedWith = boardMembersService.findBoardsSharedWith(me).stream()
                    .filter(b -> !Objects.equals(b.getOwner().getId(), me.getId()))
                    .map(BoardResponse::shared)
                    .toList();
            result = new ArrayList<>(owned.size() + sharedWith.size());
            result.addAll(owned);
            result.addAll(sharedWith);
        } else if (shared) {
            result = boardMembersService.findBoardsSharedWith(me).stream()
                    .filter(b -> !Objects.equals(b.getOwner().getId(), me.getId()))
                    .map(BoardResponse::shared)
                    .toList();
        } else { // shared == false -> only owned
            result = boardService.findByOwner(me).stream()
                    .map(BoardResponse::from)
                    .toList();
        }
        log.info("Boards list returned: userId={}, count={}, sharedFilter={} ", me.getId(), result.size(), shared);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateBoardRequest dto) {
        User owner = currentUser().orElse(null);
        if (owner == null) return unauthorized();

        Board board = new Board();
        board.setOwner(owner);
        board.setName(dto.name());
        board.setDescription(dto.description());
        Board saved = boardService.save(board);
        log.info("Board created: userId={}, boardId={}, name='{}'", owner.getId(), saved.getId(), saved.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(BoardResponse.from(saved));
    }

    // Share board by email
    @PostMapping("/{id}/share")
    public ResponseEntity<?> share(@PathVariable UUID id, @Valid @RequestBody ShareBoardRequest req) {
        User me = currentUser().orElse(null);
        if (me == null) return unauthorized();

        Optional<Board> boardOpt = boardService.findById(id);
        if (boardOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));

        Board board = boardOpt.get();

        if (!Objects.equals(board.getOwner().getId(), me.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "You are not the owner"));
        }

        Optional<User> targetOpt = userService.findByEmail(req.email());
        if (targetOpt.isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("USER_NOT_FOUND", "User with this email not found"));
        User target = targetOpt.get();
        if (Objects.equals(target.getId(), me.getId()))
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("INVALID", "Cannot share board with yourself"));

        // idempotent: if already member, return 200
        if (!boardMembersService.isMember(board, target)) {
            BoardMembers bm = new BoardMembers();
            bm.setBoard(board);
            bm.setUser(target);
            bm.setRole("MEMBER");
            boardMembersService.save(bm);
        }
        log.info("Board shared: boardId={}, ownerId={}, toUserId={} ", board.getId(), me.getId(), target.getId());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return unauthorized();
        }
        Optional<Board> boardOpt = boardService.findById(id);
        if (boardOpt.isEmpty()) {
            log.warn("Board not found: userId={}, boardId={}", userOpt.get().getId(), id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        }
        Board board = boardOpt.get();
        log.info("Board returned: userId={}, boardId={}", userOpt.get().getId(), board.getId());
        boolean isShared = !Objects.equals(board.getOwner().getId(), userOpt.get().getId()) &&
                boardMembersService.isMember(board, userOpt.get());
        return ResponseEntity.ok(isShared ? BoardResponse.shared(board) : BoardResponse.from(board));
    }

    private Optional<User> currentUser() {
       Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Unauthorized access: no authentication in context");
            return Optional.empty();
        }

        Object principal = auth.getPrincipal();
        try {
            String idStr;
            if (principal instanceof org.springframework.security.core.userdetails.User u) {
                idStr = u.getUsername();
            } else if (principal instanceof String s) {
                idStr = s;
            } else {
                log.debug("Unsupported principal type: {}", principal.getClass().getName());
                return Optional.empty();
            }
            UUID userId = UUID.fromString(idStr);
            return userService.findById(userId);
        } catch (Exception e) {
            log.debug("Failed to resolve current user from principal: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(error("UNAUTHORIZED", "Missing or invalid token"));
    }

    private static Map<String, String> error(String code, String message) {
        return Map.of("error", code, "message", message);
    }
}
