package com.zherikhov.easyplanningpoker.application.registration;

import com.zherikhov.easyplanningpoker.application.UserResponse;

public interface RegistrationService {
    UserResponse register(RegisterRequest req);
}
