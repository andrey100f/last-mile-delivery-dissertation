package com.ubb.deliveryhub.courier.service;

import com.ubb.deliveryhub.courier.api.dto.UpdateCourierProfileRequest;
import com.ubb.deliveryhub.courier.api.dto.CourierProfileResponse;
import com.ubb.deliveryhub.courier.domain.CourierProfile;
import com.ubb.deliveryhub.courier.domain.exception.CourierProfileNotFoundException;
import com.ubb.deliveryhub.courier.domain.exception.CourierProfileValidationException;
import com.ubb.deliveryhub.courier.repository.CourierProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourierProfileService {

    private final CourierProfileRepository courierProfileRepository;

    @Transactional(readOnly = true)
    public CourierProfileResponse getForCurrentCourier(Authentication authentication) {
        UUID courierUserId = principalUserId(authentication);
        CourierProfile profile = courierProfileRepository.findByUserId(courierUserId)
            .orElseThrow(CourierProfileNotFoundException::new);
        return CourierProfileMapper.toResponse(profile);
    }

    @Transactional
    public CourierProfileResponse updateForCurrentCourier(
        Authentication authentication,
        UpdateCourierProfileRequest request
    ) {
        UUID courierUserId = principalUserId(authentication);
        CourierProfile profile = courierProfileRepository.findByUserIdForUpdate(courierUserId)
            .orElseThrow(CourierProfileNotFoundException::new);

        validateRequest(request);
        CourierProfileMapper.applyUpdate(profile, request);

        CourierProfile saved = courierProfileRepository.save(profile);
        return CourierProfileMapper.toResponse(saved);
    }

    private static UUID principalUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private static void validateRequest(UpdateCourierProfileRequest request) {
        if (request.getAvailability().isAvailableNow()
            && request.getAvailability().getWeeklySchedule().isEmpty()) {
            throw new CourierProfileValidationException(
                "Validation failed",
                Map.of("availability.weeklySchedule",
                    List.of("At least one slot is required when availability.availableNow is true"))
            );
        }
    }
}
