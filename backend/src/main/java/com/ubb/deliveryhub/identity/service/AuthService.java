package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.identity.domain.dto.LoginRequestDto;
import com.ubb.deliveryhub.identity.domain.dto.LoginResponseDto;
import com.ubb.deliveryhub.identity.domain.exception.AuthException;
import com.ubb.deliveryhub.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        if (loginRequestDto.getRole() == null) {
            throw new AuthException("Invalid credentials");
        }

        var user = repository
            .findByEmailAndRole(loginRequestDto.getEmail(), loginRequestDto.getRole())
            .orElse(null);

        if (user == null || !encoder.matches(loginRequestDto.getPassword(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }

        return LoginResponseDto.builder()
            .token(jwtService.generateToken(user))
            .build();
    }

}
