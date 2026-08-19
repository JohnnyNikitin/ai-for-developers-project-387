package com.example.calendar.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/**")
            .allowedOriginPatterns(
                "http://127.0.0.1:*",
                "http://localhost:*",
                "https://*.up.railway.app",
            )
            .allowedMethods("GET", "POST", "OPTIONS")
            .allowedHeaders("*")
    }
}
