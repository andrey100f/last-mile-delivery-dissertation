package com.ubb.deliveryhub.tracking.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
public class WsSessionLogListener {

    private static final Logger log = LoggerFactory.getLogger(WsSessionLogListener.class);

    @EventListener
    public void onConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        log.info("WS connect sessionId={} principal={}", accessor.getSessionId(), principalName(accessor.getUser()));
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        log.info("WS disconnect sessionId={} principal={}", event.getSessionId(), principalName(event.getUser()));
    }

    private static String principalName(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return "anonymous";
        }
        return principal.getName();
    }
}
