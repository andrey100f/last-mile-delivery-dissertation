package com.ubb.deliveryhub.delivery.web;

import com.ubb.deliveryhub.delivery.DeliveryListDefaults;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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
}
