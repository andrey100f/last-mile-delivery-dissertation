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

    @Column(name = AddressContactId.CONTACT_NAME, nullable = false)
    private String contactName;

    @Column(name = AddressContactId.CONTACT_PHONE, nullable = false, length = 64)
    private String contactPhone;
}
