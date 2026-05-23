package com.ubb.deliveryhub.courier.api;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.DeliveryType;
import com.ubb.deliveryhub.common.exception.EntityNotFoundException;
import com.ubb.deliveryhub.courier.domain.CourierProfile;
import com.ubb.deliveryhub.courier.domain.exception.CourierProfileNotFoundException;
import com.ubb.deliveryhub.courier.repository.CourierProfileRepository;
import com.ubb.deliveryhub.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/couriers")
@RequiredArgsConstructor
public class InternalCourierController {

    private final CourierProfileRepository courierProfileRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}/profile")
    @Transactional(readOnly = true)
    public CourierProfileSnapshot getProfile(@PathVariable UUID userId) {
        CourierProfile profile = courierProfileRepository.findByUserId(userId)
            .orElseThrow(CourierProfileNotFoundException::new);
        return new CourierProfileSnapshot(userId, profile.isAvailableNow(), profile.isExpressCapable());
    }

    @PostMapping("/assign-next")
    @Transactional
    public AssignCourierResponse assignNext(@RequestBody AssignCourierRequest request) {
        CourierProfile profile = courierProfileRepository.findAssignableCouriersForUpdate(
                request.requiresExpress(),
                PageRequest.of(0, 1)
            )
            .stream()
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("No assignable courier found"));

        profile.setAvailableNow(false);
        courierProfileRepository.save(profile);
        return new AssignCourierResponse(profile.getUser().getId());
    }

    @GetMapping("/online-count")
    @Transactional(readOnly = true)
    public OnlineCountResponse onlineCount() {
        return new OnlineCountResponse(courierProfileRepository.countByAvailableNowTrue());
    }

    public record CourierProfileSnapshot(UUID userId, boolean availableNow, boolean expressCapable) {
    }

    public record AssignCourierRequest(boolean requiresExpress) {
    }

    public record AssignCourierResponse(UUID courierUserId) {
    }

    public record OnlineCountResponse(long count) {
    }
}
