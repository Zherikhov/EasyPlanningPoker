package com.zherikhov.easyplanningpoker.infrastructure.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SseHub {

    private final Map<UUID, ConcurrentHashMap<UUID, SseEmitter>> emitters = new ConcurrentHashMap<>();

    @Value("${SSE_HEARTBEAT_SECONDS:20}")
    private int heartbeatSeconds;

    public SseEmitter register(UUID boardId, UUID userId, long timeoutMs) {
        SseEmitter emitter = new SseEmitter(timeoutMs);
        ConcurrentHashMap<UUID, SseEmitter> boardMap = emitters.computeIfAbsent(boardId, k -> new ConcurrentHashMap<>());
        SseEmitter prev = boardMap.put(userId, emitter);
        if (prev != null) safeComplete(prev);

        Runnable cleanup = () -> {
            SseEmitter cur = boardMap.get(userId);
            if (cur == emitter) {
                boardMap.remove(userId);
                log.info("SSE DISCONNECTED: boardId={}, userId={}, totalActive={}", boardId, userId, boardMap.size());
            }
        };
        emitter.onCompletion(() -> {
            log.debug("SSE completion callback: boardId={}, userId={}", boardId, userId);
            cleanup.run();
        });
        emitter.onTimeout(() -> {
            log.warn("SSE timeout: boardId={}, userId={}", boardId, userId);
            cleanup.run();
        });
        emitter.onError(e -> {
            log.warn("SSE error: boardId={}, userId={}, error={}", boardId, userId, e != null ? e.getMessage() : "unknown");
            cleanup.run();
        });
        log.info("SSE CONNECTED: boardId={}, userId={}, totalActive={} ", boardId, userId, boardMap.size());
        return emitter;
    }

    public void broadcast(UUID boardId, String eventName, Object payload) {
        ConcurrentHashMap<UUID, SseEmitter> boardMap = emitters.computeIfAbsent(boardId, k -> new ConcurrentHashMap<>());
        List<UUID> toDrop = new ArrayList<>();
        int total = boardMap.size();
        int delivered = 0;
        for (Map.Entry<UUID, SseEmitter> e : boardMap.entrySet()) {
            UUID userId = e.getKey();
            SseEmitter em = e.getValue();
            try {
                em.send(SseEmitter.event().name(eventName).data(payload));
                delivered++;
            } catch (Exception ex) {
                toDrop.add(userId);
                safeCompleteWithError(em, ex);
                log.warn("SSE send failed: boardId={}, userId={}, event={}, reason={}", boardId, userId, eventName, ex.getMessage());
            }
        }
        toDrop.forEach(boardMap::remove);
        log.info("Broadcast to board: boardId={}, eventName={}, attempted={}, delivered={}, removed={} ", boardId, eventName, total, delivered, toDrop.size());
    }

    public void close(UUID boardId, UUID userId) {
        ConcurrentHashMap<UUID, SseEmitter> boardMap = emitters.get(boardId);
        if (boardMap == null) return;
        SseEmitter em = boardMap.remove(userId);
        if (em != null) safeComplete(em);
    }

    @Scheduled(fixedDelayString = "${SSE_HEARTBEAT_SECONDS:20}000")
    public void heartbeat() {
        for (Map.Entry<UUID, ConcurrentHashMap<UUID, SseEmitter>> entry : emitters.entrySet()) {
            UUID boardId = entry.getKey();
            ConcurrentHashMap<UUID, SseEmitter> boardMap = entry.getValue();
            List<UUID> toDrop = new ArrayList<>();
            for (Map.Entry<UUID, SseEmitter> e : boardMap.entrySet()) {
                try {
                    e.getValue().send(SseEmitter.event().name("PING").data(Map.of("time", Instant.now().toString())));
                } catch (Exception ex) {
                    toDrop.add(e.getKey());
                    safeCompleteWithError(e.getValue(), ex);
                }
            }
            toDrop.forEach(boardMap::remove);
            if (!toDrop.isEmpty()) {
                log.debug("Heartbeat cleaned {} emitters for board {}", toDrop.size(), boardId);
            }
        }
    }

    private void safeComplete(SseEmitter emitter) {
        try { emitter.complete(); } catch (Exception ignored) {}
    }

    private void safeCompleteWithError(SseEmitter emitter, Exception ex) {
        try { emitter.completeWithError(ex); } catch (Exception ignored) {}
    }
}
