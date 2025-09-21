package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.application.board.BoardResponse;
import com.zherikhov.easyplanningpoker.application.board.CreateBoardRequest;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
// Rely on global CORS config in SecurityConfig/WebMvcConfig
// @CrossOrigin is removed to avoid conflicts with allowCredentials and wildcard origins
@RequestMapping("/api/boards")
@Slf4j
public class BoardsController {

    private final UserService userService;
    private final BoardService boardService;

    public BoardsController(UserService userService, BoardService boardService) {
        this.userService = userService;
        this.boardService = boardService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        User owner = currentUser().orElse(null);
        if (owner == null) return unauthorized();
        List<BoardResponse> boards = boardService.findByOwner(owner).stream()
                .map(BoardResponse::from)
                .toList();
        log.info("Boards list returned: userId={}, count={}", owner.getId(), boards.size());
        return ResponseEntity.ok(boards);
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

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            // Разрешаем просмотр чужих досок только авторизованным пользователям
            return unauthorized();
        }
        Optional<Board> boardOpt = boardService.findById(id);
        if (boardOpt.isEmpty()) {
            log.warn("Board not found: userId={}, boardId={}", userOpt.get().getId(), id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        }
        Board board = boardOpt.get();
        log.info("Board returned: userId={}, boardId={}", userOpt.get().getId(), board.getId());
        // Любой авторизованный пользователь может просматривать чужие доски
        return ResponseEntity.ok(BoardResponse.from(board));
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
