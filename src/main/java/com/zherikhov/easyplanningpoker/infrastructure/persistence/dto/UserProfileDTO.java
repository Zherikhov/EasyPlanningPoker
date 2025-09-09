package com.zherikhov.easyplanningpoker.infrastructure.persistence.dto;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UserProfileDTO {

    private UUID id;
    private User user;
    private String displayName;
    private String avatarUrl;
    private String bio;

    public static UserProfileDTO from(UserProfile userProfile) {
        UserProfileDTO userProfileDTO = new UserProfileDTO();
        userProfileDTO.setId(userProfile.getId());
        userProfileDTO.setUser(userProfile.getUser());
        userProfileDTO.setDisplayName(userProfile.getDisplayName());
        userProfileDTO.setAvatarUrl(userProfile.getAvatarUrl());
        userProfileDTO.setBio(userProfile.getBio());
        return userProfileDTO;
    }
}
