package com.ubb.deliveryhub.delivery.domain.embedded;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class AddressContact {

    @Column(nullable = false, length = 255)
    private String line1;

    @Column(length = 255)
    private String line2;

    @Column(nullable = false, length = 128)
    private String city;

    @Column(length = 128)
    private String region;

    @Column(nullable = false, length = 32)
    private String postalCode;

    @Column(nullable = false, length = 2)
    private String country;

    @Column(nullable = false, length = 255)
    private String contactName;

    @Column(nullable = false, length = 64)
    private String contactPhone;
}
