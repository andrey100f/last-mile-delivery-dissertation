package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.identity.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    public static final String CLAIM_ROLE = "role";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    public String generateToken(User user) {
        var now = Instant.now();
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim(CLAIM_ROLE, user.getRole().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusMillis(expiration)))
            .signWith(getSecretKey(), Jwts.SIG.HS256)
            .compact();
    }

    /**
     * Validates signature and expiry; returns subject user id and role claim for {@link org.springframework.security.core.GrantedAuthority}s.
     */
    public ParsedJwt parseAndValidate(String token) throws JwtException {
        Claims claims = Jwts.parser()
            .verifyWith(getSecretKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        String role = claims.get(CLAIM_ROLE, String.class);
        if (role == null || role.isBlank()) {
            throw new JwtException("Missing role claim");
        }
        final UUID userId;
        try {
            userId = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            throw new JwtException("Invalid subject claim", e);
        }
        return new ParsedJwt(userId, role);
    }

    private SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public record ParsedJwt(UUID userId, String roleName) {
    }
}
