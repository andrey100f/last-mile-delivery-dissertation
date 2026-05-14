package com.ubb.deliveryhub.admin.domain.dto;

import com.ubb.deliveryhub.identity.domain.User;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class AdminManagedUserDto {
    UUID id;
    String email;
    String displayName;
    String phoneNumber;
    String role;
    Instant createdAt;
    Instant updatedAt;

    public static AdminManagedUserDto fromUser(User user) {
        return AdminManagedUserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole() != null ? user.getRole().name() : null)
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .build();
    }
}
