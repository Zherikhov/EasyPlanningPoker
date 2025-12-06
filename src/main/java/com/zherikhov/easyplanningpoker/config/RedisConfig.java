package com.zherikhov.easyplanningpoker.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class RedisConfig {

    @Value("${REDIS_HOST:}")
    private String host;

    @Value("${REDIS_PORT:6379}")
    private int port;

    @Value("${REDIS_PASSWORD:}")
    private String password;

    @Value("${REDIS_DATABASE:0}")
    private int database;

    @Value("${REDIS_KEY_PREFIX:}")
    private String keyPrefix;

    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "REDIS_HOST")
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration cfg = new RedisStandaloneConfiguration(host, port);
        cfg.setDatabase(database);
        if (password != null && !password.isBlank()) {
            cfg.setPassword(RedisPassword.of(password));
        }
        return new LettuceConnectionFactory(cfg);
    }

    @org.springframework.boot.autoconfigure.condition.ConditionalOnBean(LettuceConnectionFactory.class)
    @Bean
    public StringRedisTemplate stringRedisTemplate(LettuceConnectionFactory cf) {
        return new StringRedisTemplate(cf);
    }

    @org.springframework.boot.autoconfigure.condition.ConditionalOnBean(LettuceConnectionFactory.class)
    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(LettuceConnectionFactory cf) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(cf);
        return container;
    }

    public String prefix() { return keyPrefix == null ? "" : keyPrefix; }
}
