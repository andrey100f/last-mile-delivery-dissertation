package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AddressContactDto {
    String line1;
    String contactName;
    String contactPhone;
}
