package com.ubb.deliveryhub.identity.domain.dto;

import com.ubb.deliveryhub.common.domain.enums.UserRole;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class LoginRequestDto {

    private String email;
    private String password;
    private UserRole role;

}
