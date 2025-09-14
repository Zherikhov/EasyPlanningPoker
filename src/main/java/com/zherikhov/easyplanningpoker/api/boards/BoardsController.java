package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.BoardService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
// Rely on global CORS config in SecurityConfig/WebMvcConfig
// @CrossOrigin is removed to avoid conflicts with allowCredentials and wildcard origins
@RequestMapping("/api/boards")
public class BoardsController {

    private final JwtProvider jwtProvider;
    private final UserService userService;
    private final BoardService boardService;

    public BoardsController(JwtProvider jwtProvider, UserService userService, BoardService boardService) {
        this.jwtProvider = jwtProvider;
        this.userService = userService;
        this.boardService = boardService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        Optional<User> userOpt = currentUser(request);
        if (userOpt.isEmpty()) {
            return unauthorized();
        }
        List<BoardResponse> boards = boardService.findByOwner(userOpt.get()).stream()
                .map(BoardResponse::from)
                .toList();
        return ResponseEntity.ok(boards);
    }

    @PostMapping
    public ResponseEntity<?> create(HttpServletRequest request, @Valid @RequestBody CreateBoardRequest dto) {
        Optional<User> userOpt = currentUser(request);
        if (userOpt.isEmpty()) {
            return unauthorized();
        }
        User owner = userOpt.get();
        Board b = new Board();
        b.setOwner(owner);
        b.setName(dto.name());
        b.setDescription(dto.description());
        Board saved = boardService.save(b);
        return ResponseEntity.status(HttpStatus.CREATED).body(BoardResponse.from(saved));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(HttpServletRequest request, @PathVariable UUID id) {
        Optional<User> userOpt = currentUser(request);
        if (userOpt.isEmpty()) {
            return unauthorized();
        }
        Optional<Board> boardOpt = boardService.findById(id);
        if (boardOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Board not found"));
        }
        Board board = boardOpt.get();
        if (!board.getOwner().getId().equals(userOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Access denied"));
        }
        return ResponseEntity.ok(BoardResponse.from(board));
    }

    private Optional<User> currentUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = authHeader.substring(7);
        try {
            UUID userId = UUID.fromString(jwtProvider.getSubject(token));
            return userService.findById(userId);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(error("UNAUTHORIZED", "Missing or invalid token"));
    }

    private static java.util.Map<String, String> error(String code, String message) {
        return java.util.Map.of("error", code, "message", message);
    }
}
