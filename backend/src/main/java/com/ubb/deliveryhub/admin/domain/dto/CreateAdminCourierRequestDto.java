package com.ubb.deliveryhub.admin.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAdminCourierRequestDto {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "Password must contain at least one lowercase letter, one uppercase letter, and one digit"
    )
    private String password;

    @NotBlank
    @Size(max = 255)
    private String displayName;

    @Size(max = 64)
    private String phoneNumber;

    private Boolean availableNow;

    private Boolean expressCapable;
}
