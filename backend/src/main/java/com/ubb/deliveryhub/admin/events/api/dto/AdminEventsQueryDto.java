package com.ubb.deliveryhub.admin.events.api.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AdminEventsQueryDto {

    private List<String> type;
    private String from;
    private String to;
}
