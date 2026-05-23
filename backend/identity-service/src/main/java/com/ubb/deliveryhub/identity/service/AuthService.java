package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.common.client.EventsClient;
import com.ubb.deliveryhub.common.exception.AuthException;
import com.ubb.deliveryhub.common.repository.UserRepository;
import com.ubb.deliveryhub.common.security.JwtService;
import com.ubb.deliveryhub.identity.domain.dto.LoginRequestDto;
import com.ubb.deliveryhub.identity.domain.dto.LoginResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final EventsClient eventsClient;

    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        if (isMissingLoginFields(loginRequestDto)) {
            emitLoginFailure(loginRequestDto);
            throw new AuthException("Invalid credentials");
        }

        var user = repository
            .findByEmailAndRole(loginRequestDto.getEmail(), loginRequestDto.getRole())
            .orElse(null);

        if (user == null || !encoder.matches(loginRequestDto.getPassword(), user.getPasswordHash())) {
            emitLoginFailure(loginRequestDto);
            throw new AuthException("Invalid credentials");
        }

        return LoginResponseDto.builder()
            .token(jwtService.generateToken(user))
            .build();
    }

    private static boolean isMissingLoginFields(LoginRequestDto dto) {
        if (dto.getRole() == null) {
            return true;
        }
        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            return true;
        }
        return dto.getPassword() == null || dto.getPassword().isBlank();
    }

    private void emitLoginFailure(LoginRequestDto dto) {
        String role = dto != null && dto.getRole() != null ? dto.getRole().name() : null;
        String email = dto != null ? dto.getEmail() : null;
        eventsClient.emitLoginFailed(email, role, Instant.now());
    }
}
