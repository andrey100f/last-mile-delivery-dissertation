package com.ubb.deliveryhub.tracking.ws;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final long[] BROKER_HEARTBEAT_MS = new long[]{10_000L, 10_000L};

    private final WsChannelSecurityInterceptor wsChannelSecurityInterceptor;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final List<String> allowedOriginPatterns;

    public WebSocketConfig(
        WsChannelSecurityInterceptor wsChannelSecurityInterceptor,
        JwtHandshakeInterceptor jwtHandshakeInterceptor,
        @Value("${app.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}")
        String allowedOriginPatterns
    ) {
        this.wsChannelSecurityInterceptor = wsChannelSecurityInterceptor;
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
        this.allowedOriginPatterns = Arrays.stream(allowedOriginPatterns.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic")
            .setHeartbeatValue(BROKER_HEARTBEAT_MS)
            .setTaskScheduler(webSocketHeartbeatScheduler());
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] configuredAllowedOrigins = allowedOriginPatterns.toArray(String[]::new);
        registry.addEndpoint("/ws-tracking")
            .setAllowedOriginPatterns(configuredAllowedOrigins)
            .addInterceptors(jwtHandshakeInterceptor);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(wsChannelSecurityInterceptor);
    }

    @Bean
    public TaskScheduler webSocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }
}
