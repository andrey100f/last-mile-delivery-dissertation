package com.ubb.deliveryhub.notification.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import com.ubb.deliveryhub.common.security.BaseSecurityConfig;

@Configuration
@Import(BaseSecurityConfig.class)
public class SecurityConfig {
}
