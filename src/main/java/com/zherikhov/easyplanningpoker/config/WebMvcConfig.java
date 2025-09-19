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

    // Forward SPA routes to index.html, but do NOT grab static assets or API
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Root
        registry.addViewController("/").setViewName("forward:/index.html");
        // SPA known routes (top-level only). Do not use "/boards/**" as it would also catch "/boards/{id}/assets/..."
        registry.addViewController("/boards").setViewName("forward:/index.html");
        registry.addViewController("/boards/*").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
        registry.addViewController("/register").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve explicit assets folder from root and from SPA nested routes
        registry.addResourceHandler(
                        "/assets/**",
                        "/boards/*/assets/**"
                )
                .addResourceLocations(
                        "file:frontend/dist/assets/",
                        "classpath:/static/assets/"
                )
                .resourceChain(true);

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
