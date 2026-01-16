package com.easysprintpoker.infrastructure.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import com.easysprintpoker.infrastructure.web.errors.UnauthorizedException;

@ControllerAdvice
public class ApiErrorHandler {

    private record ErrorBody(String code, String message, Map<String, Object> details) {}

    private record Envelope(ErrorBody error) {}

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Envelope> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Envelope(new ErrorBody("VALIDATION_ERROR", "Validation failed", details)));
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Envelope> handleBind(BindException ex) {
        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Envelope(new ErrorBody("BIND_ERROR", "Invalid parameters", details)));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Envelope> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new Envelope(new ErrorBody("UNAUTHORIZED", ex.getMessage(), Map.of())));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Envelope> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new Envelope(new ErrorBody("FORBIDDEN", ex.getMessage(), Map.of())));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Envelope> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new Envelope(new ErrorBody("NOT_FOUND", ex.getMessage(), Map.of())));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Envelope> handleGeneric(Exception ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new Envelope(new ErrorBody("INTERNAL_ERROR", "Internal server error", Map.of("path", req.getRequestURI()))));
    }
}
