package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.domain.dto.AddressContactDto;
import com.ubb.deliveryhub.delivery.domain.dto.AddressContactRequestDto;
import com.ubb.deliveryhub.delivery.domain.dto.CourierSummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.PackageRequestDto;
import com.ubb.deliveryhub.delivery.domain.dto.TimelineEntryDto;
import com.ubb.deliveryhub.delivery.domain.embedded.AddressContact;
import com.ubb.deliveryhub.identity.domain.User;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class DeliveryMapper {

    private static final int SCALE_WEIGHT_KG = 4;

    private DeliveryMapper() {
    }

    public static Delivery newDeliveryEntity(
        User customer,
        CreateDeliveryRequest request,
        String trackingCode
    ) {
        Delivery d = new Delivery();
        d.setCustomer(customer);
        d.setCourier(null);
        d.setTrackingCode(trackingCode);
        d.setDeliveryType(request.getDeliveryType());
        d.setPickup(toEmbedded(request.getPickup()));
        d.setDestination(toEmbedded(request.getDestination()));
        PackageRequestDto pkg = request.getPackageData();
        d.setPackageWeightKg(normalizeWeightKg(pkg.getWeightKg()));
        d.setPackageDescription(pkg.getDescription());
        d.setSpecialInstructions(request.getSpecialInstructions());
        d.setBaseAmount(request.getPricing().getBaseAmount());
        d.setFeeAmount(request.getPricing().getFeeAmount());
        d.setTaxAmount(request.getPricing().getTaxAmount());
        d.setTotalAmount(request.getPricing().getTotalAmount());
        d.setCurrency(request.getPricing().getCurrency());
        return d;
    }

    public static AddressContact toEmbedded(AddressContactRequestDto dto) {
        AddressContact a = new AddressContact();
        a.setLine1(dto.getLine1());
        a.setContactName(dto.getContactName());
        a.setContactPhone(dto.getContactPhone());
        return a;
    }

    public static DeliverySummaryDto toSummaryDto(Delivery d) {
        String pickupLine1 = d.getPickup() != null ? d.getPickup().getLine1() : null;
        String destinationLine1 = d.getDestination() != null ? d.getDestination().getLine1() : null;
        return DeliverySummaryDto.builder()
            .id(d.getId().toString())
            .status(d.getStatus().name())
            .deliveryType(d.getDeliveryType().name())
            .createdAt(d.getCreatedAt())
            .totalAmount(d.getTotalAmount())
            .currency(d.getCurrency())
            .pickupLine1(pickupLine1)
            .destinationLine1(destinationLine1)
            .build();
    }

    public static DeliveryDto toDto(Delivery d) {
        return DeliveryDto.builder()
            .id(d.getId().toString())
            .trackingCode(d.getTrackingCode())
            .status(d.getStatus().name())
            .deliveryType(d.getDeliveryType().name())
            .pickup(toDto(d.getPickup()))
            .destination(toDto(d.getDestination()))
            .packageWeightKg(d.getPackageWeightKg())
            .packageDescription(d.getPackageDescription())
            .baseAmount(d.getBaseAmount())
            .feeAmount(d.getFeeAmount())
            .taxAmount(d.getTaxAmount())
            .totalAmount(d.getTotalAmount())
            .currency(d.getCurrency())
            .specialInstructions(d.getSpecialInstructions())
            .createdAt(d.getCreatedAt())
            .updatedAt(d.getUpdatedAt())
            .build();
    }

    public static DeliveryDetailDto toDetailDto(Delivery d, List<DeliveryStatusHistory> history) {
        List<TimelineEntryDto> timeline = history.stream()
            .map(h -> TimelineEntryDto.builder()
                .status(h.getStatus().name())
                .recordedAt(h.getRecordedAt())
                .note(h.getNote())
                .build())
            .toList();
        return DeliveryDetailDto.builder()
            .id(d.getId().toString())
            .trackingCode(d.getTrackingCode())
            .status(d.getStatus().name())
            .deliveryType(d.getDeliveryType().name())
            .pickup(toDto(d.getPickup()))
            .destination(toDto(d.getDestination()))
            .packageWeightKg(d.getPackageWeightKg())
            .packageDescription(d.getPackageDescription())
            .baseAmount(d.getBaseAmount())
            .feeAmount(d.getFeeAmount())
            .taxAmount(d.getTaxAmount())
            .totalAmount(d.getTotalAmount())
            .currency(d.getCurrency())
            .specialInstructions(d.getSpecialInstructions())
            .createdAt(d.getCreatedAt())
            .updatedAt(d.getUpdatedAt())
            .courier(toCourierSummary(d.getCourier()))
            .timeline(timeline)
            .build();
    }

    private static CourierSummaryDto toCourierSummary(User courier) {
        if (courier == null) {
            return null;
        }
        return CourierSummaryDto.builder()
            .id(courier.getId().toString())
            .displayName(courier.getEmail())
            .phone(null)
            .build();
    }

    static BigDecimal normalizeWeightKg(BigDecimal weightKg) {
        return weightKg.setScale(SCALE_WEIGHT_KG, RoundingMode.HALF_UP);
    }

    private static AddressContactDto toDto(AddressContact a) {
        if (a == null) {
            return null;
        }
        return AddressContactDto.builder()
            .line1(a.getLine1())
            .contactName(a.getContactName())
            .contactPhone(a.getContactPhone())
            .build();
    }
}
