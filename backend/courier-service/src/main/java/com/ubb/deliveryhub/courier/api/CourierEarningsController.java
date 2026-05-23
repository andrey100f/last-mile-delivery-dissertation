package com.ubb.deliveryhub.courier.api;

import com.ubb.deliveryhub.courier.CourierEarningsDefaults;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsEntryDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsQueryDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsSummaryDto;
import com.ubb.deliveryhub.courier.service.CourierEarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/couriers/me/earnings")
public class CourierEarningsController {

    private final CourierEarningsService courierEarningsService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('COURIER')")
    public CourierEarningsSummaryDto getSummary(
        Authentication authentication,
        @ModelAttribute CourierEarningsQueryDto query
    ) {
        return courierEarningsService.getSummary(authentication, query);
    }

    @GetMapping("/entries")
    @PreAuthorize("hasRole('COURIER')")
    public Page<CourierEarningsEntryDto> getEntries(
        Authentication authentication,
        @ModelAttribute CourierEarningsQueryDto query,
        @PageableDefault(
            size = CourierEarningsDefaults.PAGE_SIZE,
            sort = CourierEarningsDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable
    ) {
        return courierEarningsService.getEntries(authentication, query, pageable);
    }
}
