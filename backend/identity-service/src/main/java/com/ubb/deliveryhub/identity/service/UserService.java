package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import com.ubb.deliveryhub.common.exception.EntityNotFoundException;
import com.ubb.deliveryhub.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;

    public UserDto getUserById(String id) {
        return UserDto.fromUser(getById(id));
    }

    private User getById(String id) {
        return this.repository.findById(UUID.fromString(id))
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(id)));
    }

}
