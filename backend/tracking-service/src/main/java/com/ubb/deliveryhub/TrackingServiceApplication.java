package com.ubb.deliveryhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {
    "com.ubb.deliveryhub",
    "com.ubb.deliveryhub.common"
})
@ConfigurationPropertiesScan(basePackages = "com.ubb.deliveryhub")
public class TrackingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrackingServiceApplication.class, args);
    }
}
