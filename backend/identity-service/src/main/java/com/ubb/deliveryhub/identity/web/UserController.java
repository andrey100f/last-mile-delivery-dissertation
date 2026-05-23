package com.ubb.deliveryhub.identity.web;

import com.ubb.deliveryhub.identity.domain.dto.UpdateUserProfileRequest;
import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import com.ubb.deliveryhub.identity.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {

    private final UserService service;

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<UserDto> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(service.getCurrentUser(authentication));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<UserDto> updateCurrentUserProfile(
        Authentication authentication,
        @Valid @RequestBody UpdateUserProfileRequest request
    ) {
        return ResponseEntity.ok(service.updateCurrentUserProfile(authentication, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(service.getUserById(id));
    }

}
