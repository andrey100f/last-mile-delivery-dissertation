package com.ubb.deliveryhub.identity.domain.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponseDto {

    private String token;

}
