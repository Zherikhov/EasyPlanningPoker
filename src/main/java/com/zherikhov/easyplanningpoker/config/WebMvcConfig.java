package com.zherikhov.easyplanningpoker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    // CORS for non-security handled endpoints (static, etc.) — security will also apply its CORS
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "https://easysprintpoker.com",
                        "https://www.easysprintpoker.com",
                        "http://easysprintpoker.com",
                        "http://www.easysprintpoker.com"
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Location")
                .allowCredentials(true)
                .maxAge(3600);
    }

    // Forward all routes that are not API and not static resources to index.html
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Single Page Application fallback. Use simple Ant patterns compatible with PathPatternParser.
        // Forward any non-API path to index.html
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/{path:[^\\.]*}").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve frontend build resources primarily from the filesystem (frontend/dist),
        // and fallback to classpath:/static/ if dist is missing.
        // This allows opening public links like /login directly (SPA) when the frontend is built.
        registry.addResourceHandler("/**")
                .addResourceLocations(
                        // filesystem path (absolute) to frontend/dist
                        "file:frontend/dist/",
                        // fallback to classpath in case dist is not present
                        "classpath:/static/")
                .resourceChain(true);
    }
}
