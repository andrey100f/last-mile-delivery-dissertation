package com.ubb.deliveryhub.admin.reports.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReportsQueryDto {

    @NotBlank(message = "'from' is required")
    private String from;

    @NotBlank(message = "'to' is required")
    private String to;

    private String granularity;
}
