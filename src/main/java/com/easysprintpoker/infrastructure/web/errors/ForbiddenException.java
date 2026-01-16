package com.easysprintpoker.infrastructure.web.errors;

public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) { super(message); }
}
