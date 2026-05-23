package com.ubb.deliveryhub.delivery.domain.dto;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import jakarta.validation.constraints.AssertTrue;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateDeliveryStatusRequest {

    private DeliveryStatus targetStatus;
    private DeliveryStatusAction action;

    @AssertTrue(message = "Provide exactly one of targetStatus or action")
    public boolean isValid() {
        return (targetStatus == null) != (action == null);
    }

    public DeliveryStatus resolveTargetStatus() {
        if (targetStatus != null) {
            return targetStatus;
        }
        return action.targetStatus();
    }
}
