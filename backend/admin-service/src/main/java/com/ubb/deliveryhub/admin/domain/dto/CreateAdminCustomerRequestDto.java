package com.ubb.deliveryhub.admin.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAdminCustomerRequestDto {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    private String password;

    @NotBlank
    @Size(max = 255)
    private String displayName;

    @Size(max = 64)
    private String phoneNumber;
}
