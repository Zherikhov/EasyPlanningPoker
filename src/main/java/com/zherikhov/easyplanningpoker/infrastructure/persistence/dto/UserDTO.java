package com.zherikhov.easyplanningpoker.infrastructure.persistence.dto;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UserDTO {

    private UUID id;
    private String username;
    private String email;
    private String passwordHash;
    private String role = "USER";

    public static UserDTO from(User user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setUsername(user.getUsername());
        userDTO.setEmail(user.getEmail());
        userDTO.setPasswordHash(user.getPasswordHash());
        userDTO.setRole(user.getRole());
        return userDTO;
    }
}
