package com.zherikhov.easyplanningpoker.application.auth;

public record AuthRequest(String email, String password, boolean rememberMe) {}
