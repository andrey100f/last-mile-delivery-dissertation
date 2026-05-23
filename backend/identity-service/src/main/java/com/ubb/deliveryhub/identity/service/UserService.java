package com.ubb.deliveryhub.identity.service;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.identity.domain.dto.UpdateUserProfileRequest;
import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import com.ubb.deliveryhub.common.exception.EntityNotFoundException;
import com.ubb.deliveryhub.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;

    public UserDto getUserById(String id) {
        return UserDto.fromUser(getById(id));
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(Authentication authentication) {
        return UserDto.fromUser(getById(principalUserId(authentication)));
    }

    @Transactional
    public UserDto updateCurrentUserProfile(
        Authentication authentication,
        UpdateUserProfileRequest request
    ) {
        User user = getById(principalUserId(authentication));

        UpdateUserProfileRequest.PersonalDto personal = request.getPersonal();
        user.setDisplayName(personal.getDisplayName().trim());
        user.setPhoneNumber(personal.getPhone().trim());

        return UserDto.fromUser(repository.save(user));
    }

    private User getById(String id) {
        return getById(UUID.fromString(id));
    }

    private User getById(UUID id) {
        return this.repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(id)));
    }

    private static UUID principalUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

}
