package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import com.ubb.deliveryhub.identity.domain.exception.EntityNotFoundException;
import com.ubb.deliveryhub.identity.domain.mapper.UserMapper;
import com.ubb.deliveryhub.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final UserMapper mapper;

    public UserDto getUserById(String id) {
        var user = getById(id);
        return mapper.mapToDto(user);
    }

    private User getById(String id) {
        return this.repository.findById(UUID.fromString(id))
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(id)));
    }

}
