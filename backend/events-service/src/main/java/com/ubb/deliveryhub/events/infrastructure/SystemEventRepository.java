package com.ubb.deliveryhub.events.infrastructure;

import com.ubb.deliveryhub.events.domain.SystemEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface SystemEventRepository extends JpaRepository<SystemEvent, UUID>, JpaSpecificationExecutor<SystemEvent> {
}
