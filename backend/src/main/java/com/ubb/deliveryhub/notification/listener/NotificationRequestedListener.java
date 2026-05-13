package com.ubb.deliveryhub.notification.listener;

import com.ubb.deliveryhub.notification.application.NotificationDraft;
import com.ubb.deliveryhub.notification.application.NotificationPersistenceService;
import com.ubb.deliveryhub.notification.application.NotificationTemplateService;
import com.ubb.deliveryhub.notification.config.NotificationProperties;
import com.ubb.deliveryhub.notification.events.NotificationRequested;
import com.ubb.deliveryhub.notification.infrastructure.async.NotificationAsyncPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Component
public class NotificationRequestedListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationRequestedListener.class);

    private final NotificationTemplateService templateService;
    private final NotificationPersistenceService persistenceService;
    private final NotificationAsyncPublisher asyncPublisher;
    private final NotificationProperties notificationProperties;

    public NotificationRequestedListener(
        NotificationTemplateService templateService,
        NotificationPersistenceService persistenceService,
        NotificationAsyncPublisher asyncPublisher,
        NotificationProperties notificationProperties
    ) {
        this.templateService = templateService;
        this.persistenceService = persistenceService;
        this.asyncPublisher = asyncPublisher;
        this.notificationProperties = notificationProperties;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationRequested(NotificationRequested event) {
        if (event == null || event.targetUserIds() == null || event.targetUserIds().isEmpty()) {
            return;
        }
        String mode = notificationProperties.getAsync().isEnabled() ? "async" : "sync";
        log.info(
            "Notification requested eventId={} type={} deliveryId={} targetCount={} mode={}",
            event.eventId(),
            event.eventType(),
            event.deliveryId(),
            event.targetUserIds().size(),
            mode
        );
        try {
            if (notificationProperties.getAsync().isEnabled()) {
                asyncPublisher.publish(event);
                return;
            }
            persistSynchronously(event);
        } catch (Exception ex) {
            log.warn(
                "Notification handling failed eventId={} type={} mode={}",
                event.eventId(),
                event.eventType(),
                mode,
                ex
            );
            if (notificationProperties.getAsync().isEnabled() && notificationProperties.getAsync().isFallbackToSync()) {
                persistSynchronously(event);
            }
        }
    }

    private void persistSynchronously(NotificationRequested event) {
        for (UUID recipientUserId : event.targetUserIds()) {
            if (recipientUserId == null) {
                continue;
            }
            try {
                NotificationDraft draft = templateService.render(event, recipientUserId);
                String dedupeKey = dedupeKey(event, recipientUserId);
                boolean persisted = persistenceService.persist(event, recipientUserId, draft, dedupeKey);
                if (!persisted) {
                    log.info(
                        "Skipping duplicate notification eventId={} recipient={} dedupeKey={}",
                        event.eventId(),
                        recipientUserId,
                        dedupeKey
                    );
                } else {
                    log.info(
                        "Notification persisted eventId={} recipient={} type={} dedupeKey={}",
                        event.eventId(),
                        recipientUserId,
                        event.eventType(),
                        dedupeKey
                    );
                }
            } catch (Exception ex) {
                log.warn(
                    "Notification draft/persist failed eventId={} recipient={}",
                    event.eventId(),
                    recipientUserId,
                    ex
                );
            }
        }
    }

    private static String dedupeKey(NotificationRequested event, UUID recipientUserId) {
        String statusToken = event.status() == null ? "NA" : event.status().name();
        String deliveryToken = Objects.toString(event.deliveryId(), "NA");
        return ("%s:%s:%s:%s")
            .formatted(recipientUserId, deliveryToken, event.eventType(), statusToken)
            .toLowerCase(Locale.ROOT);
    }
}
