package com.ubb.deliveryhub.admin.domain.dto;

import com.ubb.deliveryhub.common.domain.User;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
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
    Long ordersCount;
    BigDecimal totalSpend;
    String totalSpendCurrency;
    Boolean availableNow;
    Long deliveriesCount;

    public static AdminManagedUserDto fromUser(User user) {
        return fromUserWithCustomerStats(user, 0L, BigDecimal.ZERO, "RON");
    }

    public static AdminManagedUserDto fromUserWithCustomerStats(
        User user,
        long ordersCount,
        BigDecimal totalSpend,
        String totalSpendCurrency
    ) {
        return AdminManagedUserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole() != null ? user.getRole().name() : null)
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .ordersCount(ordersCount)
            .totalSpend(totalSpend)
            .totalSpendCurrency(totalSpendCurrency)
            .availableNow(null)
            .deliveriesCount(0L)
            .build();
    }

    public static AdminManagedUserDto fromUserWithCourierStats(
        User user,
        boolean availableNow,
        long deliveriesCount
    ) {
        return AdminManagedUserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole() != null ? user.getRole().name() : null)
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .ordersCount(0L)
            .totalSpend(BigDecimal.ZERO)
            .totalSpendCurrency("RON")
            .availableNow(availableNow)
            .deliveriesCount(deliveriesCount)
            .build();
    }
}
