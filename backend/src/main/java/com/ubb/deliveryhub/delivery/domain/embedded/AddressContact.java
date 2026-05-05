package com.ubb.deliveryhub.delivery.domain.embedded;

import com.ubb.deliveryhub.delivery.domain.id.AddressContactId;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Embeddable
@Getter
@Setter
public class AddressContact {

    @Column(name = AddressContactId.LINE1, nullable = false)
    private String line1;

    @Column(name = AddressContactId.LINE2)
    private String line2;

    @Column(name = AddressContactId.CITY, nullable = false, length = 128)
    private String city;

    @Column(name = AddressContactId.REGION, length = 128)
    private String region;

    @Column(name = AddressContactId.POSTAL_CODE, nullable = false, length = 32)
    private String postalCode;

    @Column(name = AddressContactId.COUNTRY, nullable = false, length = 2)
    private String country;

    @Column(name = AddressContactId.CONTACT_NAME, nullable = false)
    private String contactName;

    @Column(name = AddressContactId.CONTACT_PHONE, nullable = false, length = 64)
    private String contactPhone;
}
