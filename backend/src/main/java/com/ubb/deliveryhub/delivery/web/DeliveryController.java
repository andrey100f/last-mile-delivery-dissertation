package com.ubb.deliveryhub.delivery.web;

import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

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
