package com.ubb.deliveryhub.tracking.ws;

import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.service.DeliveryAuthorization;
import com.ubb.deliveryhub.identity.service.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WsChannelSecurityInterceptor implements ChannelInterceptor {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final List<String> BROKER_DESTINATION_PREFIXES = List.of("/topic", "/queue");
    private static final Pattern TRACKING_TOPIC_PATTERN =
        Pattern.compile("^/topic/deliveries/([0-9a-fA-F-]{36})/tracking$");

    private final JwtService jwtService;
    private final DeliveryRepository deliveryRepository;
    private final DeliveryAuthorization deliveryAuthorization;

    public WsChannelSecurityInterceptor(
        JwtService jwtService,
        DeliveryRepository deliveryRepository,
        DeliveryAuthorization deliveryAuthorization
    ) {
        this.jwtService = jwtService;
        this.deliveryRepository = deliveryRepository;
        this.deliveryAuthorization = deliveryAuthorization;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscribe(accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            authorizeSend(accessor);
        }

        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String token = resolveToken(accessor);
        if (token == null || token.isBlank()) {
            throw new AccessDeniedException("WS_CONNECT_UNAUTHORIZED");
        }

        try {
            JwtService.ParsedJwt parsedJwt = jwtService.parseAndValidate(token);
            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + parsedJwt.roleName()));
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                parsedJwt.userId().toString(),
                null,
                authorities
            );
            accessor.setUser(authentication);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AccessDeniedException("WS_CONNECT_UNAUTHORIZED");
        }
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new AccessDeniedException("WS_SUBSCRIBE_DENIED");
        }

        Matcher matcher = TRACKING_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            throw new AccessDeniedException("WS_SUBSCRIBE_DENIED");
        }

        Authentication authentication = resolveAuthentication(accessor);
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("WS_SUBSCRIBE_DENIED");
        }

        UUID deliveryId;
        try {
            deliveryId = UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException ex) {
            throw new AccessDeniedException("WS_SUBSCRIBE_DENIED");
        }

        var delivery = deliveryRepository.findWithCustomerAndCourierById(deliveryId)
            .orElseThrow(() -> new AccessDeniedException("WS_SUBSCRIBE_DENIED"));
        try {
            deliveryAuthorization.assertCanView(delivery, authentication);
        } catch (AccessDeniedException ex) {
            throw new AccessDeniedException("WS_SUBSCRIBE_DENIED");
        }
    }

    private void authorizeSend(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }
        for (String prefix : BROKER_DESTINATION_PREFIXES) {
            if (destination.startsWith(prefix + "/") || destination.equals(prefix)) {
                throw new AccessDeniedException("WS_SEND_DENIED");
            }
        }
    }

    private Authentication resolveAuthentication(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication authentication) {
            return authentication;
        }
        return null;
    }

    private String resolveToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader(AUTHORIZATION_HEADER);
        if (authHeader != null && authHeader.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            String bearerToken = authHeader.substring(BEARER_PREFIX.length()).trim();
            if (!bearerToken.isBlank()) {
                return bearerToken;
            }
        }

        String nativeToken = accessor.getFirstNativeHeader("token");
        if (nativeToken != null && !nativeToken.isBlank()) {
            return nativeToken.trim();
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }
        Object queryToken = sessionAttributes.get(JwtHandshakeInterceptor.WS_QUERY_TOKEN_ATTR);
        if (queryToken instanceof String token && !token.isBlank()) {
            return token;
        }
        return null;
    }
}
