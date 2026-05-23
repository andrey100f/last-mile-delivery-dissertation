package com.ubb.deliveryhub.courier.api;

import com.ubb.deliveryhub.courier.api.dto.CourierProfileResponse;
import com.ubb.deliveryhub.courier.api.dto.UpdateCourierProfileRequest;
import com.ubb.deliveryhub.courier.service.CourierProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/couriers/me")
public class CourierProfileController {

    private final CourierProfileService courierProfileService;

    @GetMapping
    @PreAuthorize("hasRole('COURIER')")
    public CourierProfileResponse getCurrentCourierProfile(Authentication authentication) {
        return courierProfileService.getForCurrentCourier(authentication);
    }

    @PutMapping
    @PreAuthorize("hasRole('COURIER')")
    public CourierProfileResponse updateCurrentCourierProfile(
        Authentication authentication,
        @Valid @RequestBody UpdateCourierProfileRequest request
    ) {
        return courierProfileService.updateForCurrentCourier(authentication, request);
    }
}
