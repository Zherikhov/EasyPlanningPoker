package com.zherikhov.easyplanningpoker.infrastructure.events;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zherikhov.easyplanningpoker.config.RedisConfig;
import com.zherikhov.easyplanningpoker.infrastructure.sse.SseHub;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class RedisEventBus {

    private final RedisConfig redisConfig;
    private final SseHub sseHub;
    @Nullable
    private final StringRedisTemplate template; // optional
    @Nullable
    private final RedisMessageListenerContainer container; // optional
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RedisEventBus(RedisConfig redisConfig,
                         SseHub sseHub,
                         @Nullable StringRedisTemplate template,
                         @Nullable RedisMessageListenerContainer container) {
        this.redisConfig = redisConfig;
        this.sseHub = sseHub;
        this.template = template;
        this.container = container;
    }

    @PostConstruct
    public void subscribe() {
        if (template == null || container == null) {
            log.warn("Redis not configured, Pub/Sub disabled (single-node mode)");
            return;
        }
        String pattern = redisConfig.prefix() + "board:*:events";
        MessageListener listener = new MessageListener() {
            @Override
            public void onMessage(Message message, byte[] patternBytes) {
                try {
                    String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
                    String payload = new String(message.getBody(), StandardCharsets.UTF_8);
                    Map<String, Object> msg = objectMapper.readValue(payload, new TypeReference<>(){});
                    String eventName = (String) msg.get("name");
                    Object data = msg.get("payload");
                    String boardStr = channel.substring(channel.indexOf("board:") + 6, channel.lastIndexOf(":events"));
                    UUID boardId = UUID.fromString(boardStr);
                    int sizeBytes = payload.getBytes(StandardCharsets.UTF_8).length;
                    log.info("Received event from Redis: boardId={}, eventName={}, payloadSize={}B", boardId, eventName, sizeBytes);
                    sseHub.broadcast(boardId, eventName, data);
                } catch (Exception e) {
                    log.error("Failed to process Redis event: {}", e.getMessage());
                }
            }
        };
        container.addMessageListener(listener, new PatternTopic(pattern));
        log.info("Subscribed to Redis events pattern: {}", pattern);
    }

    public void publish(UUID boardId, String name, Object payload) {
        if (template == null) {
            // No Redis: do only local broadcast
            int sizeBytes = 0;
            try { sizeBytes = objectMapper.writeValueAsBytes(Map.of("name", name, "payload", payload)).length; } catch (Exception ignored) {}
            log.info("Publishing event (local only): boardId={}, eventName={}, payloadSize={}B", boardId, name, sizeBytes);
            sseHub.broadcast(boardId, name, payload);
            return;
        }
        try {
            String channel = redisConfig.prefix() + "board:" + boardId + ":events";
            String json = objectMapper.writeValueAsString(Map.of("name", name, "payload", payload));
            log.info("Publishing event: boardId={}, eventName={}, payloadSize={}B", boardId, name, json.getBytes(StandardCharsets.UTF_8).length);
            template.convertAndSend(channel, json);
        } catch (Exception e) {
            log.error("Failed to publish Redis event: {}", e.getMessage());
            // As a fallback, still try local broadcast
            sseHub.broadcast(boardId, name, payload);
        }
    }
}
