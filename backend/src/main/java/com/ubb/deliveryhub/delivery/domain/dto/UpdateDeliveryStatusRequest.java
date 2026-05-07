package com.ubb.deliveryhub.delivery.domain.dto;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import jakarta.validation.constraints.AssertTrue;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateDeliveryStatusRequest {

    private DeliveryStatus targetStatus;
    private DeliveryStatusAction action;

    @AssertTrue(message = "Provide exactly one of targetStatus or action")
    public boolean isExactlyOneStatusInputProvided() {
        return (targetStatus == null) != (action == null);
    }

    public DeliveryStatus resolveTargetStatus() {
        if (targetStatus != null) {
            return targetStatus;
        }
        return action.targetStatus();
    }
}
