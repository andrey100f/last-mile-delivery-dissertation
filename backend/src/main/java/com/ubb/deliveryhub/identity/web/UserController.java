package com.ubb.deliveryhub.identity.web;

import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import com.ubb.deliveryhub.identity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {

    private final UserService service;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(service.getUserById(id));
    }

}
