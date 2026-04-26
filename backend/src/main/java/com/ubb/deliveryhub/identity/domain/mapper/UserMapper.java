package com.ubb.deliveryhub.identity.domain.mapper;

import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.dto.UserDto;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {

    UserDto mapToDto(User user);

}
