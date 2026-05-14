package com.ubb.deliveryhub.admin.web;

import com.ubb.deliveryhub.admin.AdminUserListDefaults;
import com.ubb.deliveryhub.admin.domain.dto.AdminManagedUserDto;
import com.ubb.deliveryhub.admin.domain.dto.CreateAdminCustomerRequestDto;
import com.ubb.deliveryhub.admin.service.AdminUserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/customers")
public class AdminCustomerController {

    private final AdminUserManagementService adminUserManagementService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminManagedUserDto> listCustomers(
        @PageableDefault(
            size = AdminUserListDefaults.PAGE_SIZE,
            sort = AdminUserListDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String search
    ) {
        String effectiveSearch = (q != null && !q.isBlank()) ? q : search;
        return adminUserManagementService.listCustomers(pageable, effectiveSearch);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminManagedUserDto> createCustomer(@Valid @RequestBody CreateAdminCustomerRequestDto request) {
        AdminManagedUserDto created = adminUserManagementService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
