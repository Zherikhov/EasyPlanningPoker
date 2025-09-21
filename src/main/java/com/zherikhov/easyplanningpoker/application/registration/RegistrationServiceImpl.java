package com.zherikhov.easyplanningpoker.application.registration;

import com.zherikhov.easyplanningpoker.application.users.UserResponse;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserProfilesService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@Service
public class RegistrationServiceImpl implements RegistrationService {

    private final UserService userService;
    private final UserProfilesService userProfilesService;
    private final PasswordEncoder passwordEncoder;

    public RegistrationServiceImpl(UserService userService, UserProfilesService userProfilesService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.userProfilesService = userProfilesService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserResponse register(RegisterRequest req) {

        Optional<User> existingByEmail = userService.findByEmail(req.email());
        if (existingByEmail.isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        String username = deriveUsernameFromEmail(req.email());
        user.setUsername(username);
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));

        user = userService.save(user);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setDisplayName(req.displayName());
        userProfilesService.save(profile);

        return new UserResponse(user.getId(), user.getEmail(), profile.getDisplayName());
    }

    private String deriveUsernameFromEmail(String email) {
        int at = email.indexOf('@');
        if (at > 0) return email.substring(0, at);
        return email;
    }

}
