package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.notification.events.NotificationRequested;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class NotificationAsyncProcessor {

    private final NotificationTemplateService templateService;
    private final NotificationPersistenceService persistenceService;

    public NotificationAsyncProcessor(
        NotificationTemplateService templateService,
        NotificationPersistenceService persistenceService
    ) {
        this.templateService = templateService;
        this.persistenceService = persistenceService;
    }

    @Transactional
    public Outcome process(NotificationRequested event) {
        int persistedCount = 0;
        int duplicateCount = 0;
        for (UUID recipientUserId : event.targetUserIds()) {
            NotificationDraft draft = templateService.render(event, recipientUserId);
            String dedupeKey = dedupeKey(event, recipientUserId);
            boolean persisted = persistenceService.persist(event, recipientUserId, draft, dedupeKey);
            if (persisted) {
                persistedCount++;
            } else {
                duplicateCount++;
            }
        }
        if (persistedCount == 0 && duplicateCount > 0) {
            return Outcome.DUPLICATE;
        }
        return Outcome.SUCCESS;
    }

    private static String dedupeKey(NotificationRequested event, UUID recipientUserId) {
        String eventToken = Objects.toString(event.eventId(), "NA");
        return ("%s:%s")
            .formatted(eventToken, recipientUserId)
            .toLowerCase(Locale.ROOT);
    }

    public enum Outcome {
        SUCCESS,
        DUPLICATE
    }
}
