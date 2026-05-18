package com.ubb.deliveryhub.delivery.web;

import com.ubb.deliveryhub.delivery.DeliveryListDefaults;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import com.ubb.deliveryhub.delivery.domain.dto.AvailableDeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.CustomerHistorySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryStatusSnapshotDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.UpdateDeliveryStatusRequest;
import com.ubb.deliveryhub.delivery.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public Page<DeliverySummaryDto> listForCurrentCustomer(
        Authentication authentication,
        @PageableDefault(
            size = DeliveryListDefaults.PAGE_SIZE,
            sort = DeliveryListDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable,
        @RequestParam(required = false) DeliveryStatus status
    ) {
        return deliveryService.listForCurrentCustomer(authentication, pageable, status);
    }

    @GetMapping("/history/summary")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CustomerHistorySummaryDto historySummaryForCurrentCustomer(Authentication authentication) {
        return deliveryService.getHistorySummaryForCurrentCustomer(authentication);
    }

    @GetMapping("/available")
    @PreAuthorize("hasRole('COURIER')")
    public Page<AvailableDeliveryDto> listAvailableForCurrentCourier(
        Authentication authentication,
        @PageableDefault(
            size = DeliveryListDefaults.PAGE_SIZE,
            sort = DeliveryListDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable,
        @RequestParam(required = false) DeliveryType deliveryType
    ) {
        return deliveryService.listAvailableForCurrentCourier(authentication, pageable, deliveryType);
    }

    @GetMapping("/active")
    @PreAuthorize("hasRole('COURIER')")
    public Page<AvailableDeliveryDto> listActiveForCurrentCourier(
        Authentication authentication,
        @PageableDefault(
            size = DeliveryListDefaults.PAGE_SIZE,
            sort = DeliveryListDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable
    ) {
        return deliveryService.listActiveForCurrentCourier(authentication, pageable);
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<DeliveryDto> create(
        Authentication authentication,
        @Valid @RequestBody CreateDeliveryRequest request
    ) {
        DeliveryDto created = deliveryService.createFromPrincipal(authentication, request);
        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','COURIER','ADMIN')")
    public DeliveryDetailDto getById(@PathVariable UUID id, Authentication authentication) {
        return deliveryService.getByIdForCurrentUser(id, authentication);
    }

    @GetMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('CUSTOMER','COURIER','ADMIN')")
    public ResponseEntity<DeliveryStatusSnapshotDto> getStatusSnapshot(
        @PathVariable UUID id,
        Authentication authentication,
        WebRequest webRequest
    ) {
        DeliveryStatusSnapshotDto snapshot = deliveryService.getStatusSnapshotForCurrentUser(id, authentication);
        String etag = "\"%s-%d\"".formatted(snapshot.getStatus(), snapshot.getUpdatedAt().toEpochMilli());
        if (webRequest.checkNotModified(etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }
        return ResponseEntity.ok().eTag(etag).body(snapshot);
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('COURIER')")
    public DeliveryDetailDto accept(@PathVariable UUID id, Authentication authentication) {
        return deliveryService.acceptForCurrentCourier(id, authentication);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('COURIER')")
    public DeliveryDetailDto updateStatus(
        @PathVariable UUID id,
        Authentication authentication,
        @Valid @RequestBody UpdateDeliveryStatusRequest request
    ) {
        return deliveryService.updateStatusForCurrentCourier(id, authentication, request);
    }
}
