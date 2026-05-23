package com.ubb.deliveryhub.identity.domain.dto;

import com.ubb.deliveryhub.common.domain.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDto {

    private String id;
    private String email;
    private String displayName;
    private String phoneNumber;
    private String role;

    public static UserDto fromUser(User user) {
        if (user == null) {
            return null;
        }
        return UserDto.builder()
            .id(user.getId() != null ? user.getId().toString() : null)
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole() != null ? user.getRole().name() : null)
            .build();
    }
}
