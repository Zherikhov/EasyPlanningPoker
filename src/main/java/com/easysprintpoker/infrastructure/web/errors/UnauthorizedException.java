package com.easysprintpoker.infrastructure.web.errors;

public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) { super(message); }
}
