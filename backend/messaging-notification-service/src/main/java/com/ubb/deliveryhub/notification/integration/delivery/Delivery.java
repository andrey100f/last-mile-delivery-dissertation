package com.ubb.deliveryhub.notification.integration.delivery;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "deliveries")
@Getter
@Setter
public class Delivery {

    @Id
    private UUID id;
}
