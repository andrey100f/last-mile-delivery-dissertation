package com.ubb.deliveryhub.admin.events.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class AdminSystemEventDto {
    private UUID id;
    private String type;
    private String actorType;
    private UUID actorId;
    private String targetType;
    private UUID targetId;
    private JsonNode metadata;
    private Instant createdAt;
}
