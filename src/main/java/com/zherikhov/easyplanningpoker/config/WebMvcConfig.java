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

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {

        // SPA entry
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/boards").setViewName("forward:/index.html");
        registry.addViewController("/boards/*").setViewName("forward:/index.html");
        registry.addViewController("/boards/**").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
        registry.addViewController("/register").setViewName("forward:/index.html");
        // ... existing code ...
        // Добавляем SPA-маршрут /estimate
        registry.addViewController("/estimate").setViewName("forward:/index.html");
        registry.addViewController("/estimate/**").setViewName("forward:/index.html");
    }


    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve explicit assets folder from root and from SPA nested routes
        registry.addResourceHandler(
                        "/assets/**"
//                        "/boards/**/assets/**"
                )
                .addResourceLocations(
                        "file:frontend/dist/assets/",
                        "classpath:/static/assets/"
                )
                .resourceChain(true);

        // favicon и прочие стандартные файлы
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("file:frontend/dist/favicon.ico", "classpath:/static/favicon.ico")
                .resourceChain(true);

        // Остальная сборка SPA (index.html и прочие файлы на корне дистрибутива)
        registry.addResourceHandler("/**")
                .addResourceLocations(
                        "file:frontend/dist/",
                        "classpath:/static/"
                )
                .resourceChain(true)
                .addResolver(new org.springframework.web.servlet.resource.PathResourceResolver() {
                    @Override
                    protected org.springframework.core.io.Resource getResource(String resourcePath,
                                                                              org.springframework.core.io.Resource location) throws java.io.IOException {
                        org.springframework.core.io.Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        // SPA fallback: serve index.html for non-file paths (no dot) and non-API
                        boolean isApi = resourcePath.startsWith("api/") || resourcePath.startsWith("/api/");
                        boolean hasExtension = resourcePath.contains(".");
                        if (!isApi && !hasExtension) {
                            org.springframework.core.io.Resource index = location.createRelative("index.html");
                            if (index.exists() && index.isReadable()) {
                                return index;
                            }
                        }
                        return null;
                    }
                });
    }
}
