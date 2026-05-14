package com.ubb.deliveryhub.notification.repository;

import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.domain.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID>, JpaSpecificationExecutor<Notification> {

    boolean existsByIdAndUser_Id(UUID id, UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Notification n
        SET n.readAt = :readAt
        WHERE n.id = :id
          AND n.user.id = :userId
          AND n.readAt IS NULL
        """)
    int markReadIfUnread(
        @Param("id") UUID id,
        @Param("userId") UUID userId,
        @Param("readAt") Instant readAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Notification n
        SET n.readAt = :readAt
        WHERE n.user.id = :userId
          AND n.readAt IS NULL
        """)
    int markAllRead(
        @Param("userId") UUID userId,
        @Param("readAt") Instant readAt
    );

    @Query("""
        SELECT COUNT(n)
        FROM Notification n
        WHERE n.category = :category
          AND n.readAt IS NULL
          AND n.createdAt >= :fromInclusive
          AND n.createdAt < :toExclusive
        """)
    long countUnreadByCategoryInWindow(
        @Param("category") NotificationCategory category,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );
}
