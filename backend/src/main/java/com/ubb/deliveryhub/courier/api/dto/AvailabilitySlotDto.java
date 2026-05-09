package com.ubb.deliveryhub.courier.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Data
public class AvailabilitySlotDto {

    @NotNull
    private DayOfWeek dayOfWeek;

    @NotNull
    private LocalTime start;

    @NotNull
    private LocalTime end;
}
