package com.easysprintpoker.infrastructure.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import com.easysprintpoker.infrastructure.web.errors.UnauthorizedException;

@ControllerAdvice
public class ApiErrorHandler {

    private final MessageSource messageSource;

    public ApiErrorHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    private record ErrorBody(String code, String message, Map<String, Object> details) {}

    private record Envelope(ErrorBody error) {}

    private String getMessage(String code, Object[] args, String defaultMessage) {
        return messageSource.getMessage(code, args, defaultMessage, LocaleContextHolder.getLocale());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Envelope> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Envelope(new ErrorBody("VALIDATION_ERROR", getMessage("error.validation", null, "Validation failed"), details)));
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Envelope> handleBind(BindException ex) {
        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Envelope(new ErrorBody("BIND_ERROR", getMessage("error.bind", null, "Invalid parameters"), details)));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Envelope> handleUnauthorized(UnauthorizedException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : getMessage("error.unauthorized", null, "Unauthorized access");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new Envelope(new ErrorBody("UNAUTHORIZED", msg, Map.of())));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Envelope> handleForbidden(ForbiddenException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : getMessage("error.forbidden", null, "Access denied");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new Envelope(new ErrorBody("FORBIDDEN", msg, Map.of())));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Envelope> handleNotFound(NotFoundException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : getMessage("error.not_found", null, "Resource not found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new Envelope(new ErrorBody("NOT_FOUND", msg, Map.of())));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Envelope> handleGeneric(Exception ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new Envelope(new ErrorBody("INTERNAL_ERROR", getMessage("error.internal", null, "Internal server error"), Map.of("path", req.getRequestURI()))));
    }
}
