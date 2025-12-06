package com.zherikhov.easyplanningpoker.infrastructure.state;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zherikhov.easyplanningpoker.config.RedisConfig;
import com.zherikhov.easyplanningpoker.api.boards.EstimateController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RedisRoundStateService {

    private final RedisConfig redisConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StringRedisTemplate template; // may be null if Redis not configured

    @Value("${HISTORY_MAX_LEN:100}")
    private int historyMaxLen;

    // Fallback in-memory storage if Redis is not configured (single-node mode)
    private final Map<UUID, EstimateController.RoundState> localStates = new ConcurrentHashMap<>();
    private final Map<UUID, List<EstimateController.RoundSnapshot>> localHistory = new ConcurrentHashMap<>();

    public RedisRoundStateService(RedisConfig redisConfig,
                                  @org.springframework.lang.Nullable StringRedisTemplate template) {
        this.redisConfig = redisConfig;
        this.template = template;
    }

    private String stateKey(UUID boardId) { return redisConfig.prefix() + "board:" + boardId + ":state"; }
    private String historyKey(UUID boardId) { return redisConfig.prefix() + "board:" + boardId + ":history"; }

    public EstimateController.RoundState getState(UUID boardId) {
        if (template == null) {
            return localStates.computeIfAbsent(boardId, this::newState);
        }
        String json = template.opsForValue().get(stateKey(boardId));
        if (json == null) {
            EstimateController.RoundState s = newState(boardId);
            saveState(boardId, s);
            return s;
        }
        try {
            return objectMapper.readValue(json, EstimateController.RoundState.class);
        } catch (Exception e) {
            log.error("Failed to parse state JSON, recreating: {}", e.getMessage());
            EstimateController.RoundState s = newState(boardId);
            saveState(boardId, s);
            return s;
        }
    }

    public void saveState(UUID boardId, EstimateController.RoundState s) {
        if (template == null) {
            localStates.put(boardId, s);
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(s);
            template.opsForValue().set(stateKey(boardId), json);
        } catch (Exception e) {
            log.error("Failed to save state to Redis: {}", e.getMessage());
        }
    }

    public void addHistory(UUID boardId, EstimateController.RoundSnapshot snapshot) {
        if (template == null) {
            localHistory.computeIfAbsent(boardId, k -> new ArrayList<>()).add(0, snapshot);
            List<EstimateController.RoundSnapshot> list = localHistory.get(boardId);
            if (list.size() > historyMaxLen) list.subList(historyMaxLen, list.size()).clear();
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(snapshot);
            String key = historyKey(boardId);
            template.opsForList().leftPush(key, json);
            template.opsForList().trim(key, 0, historyMaxLen - 1L);
        } catch (Exception e) {
            log.error("Failed to append history: {}", e.getMessage());
        }
    }

    public List<Map<String, Object>> getHistory(UUID boardId, int limit) {
        if (template == null) {
            List<EstimateController.RoundSnapshot> items = localHistory.getOrDefault(boardId, List.of());
            return mapHistory(items.stream().limit(limit).toList());
        }
        String key = historyKey(boardId);
        List<String> raw = template.opsForList().range(key, 0, limit - 1L);
        if (raw == null) return List.of();
        List<EstimateController.RoundSnapshot> snapshots = new ArrayList<>();
        for (String s : raw) {
            try { snapshots.add(objectMapper.readValue(s, EstimateController.RoundSnapshot.class)); } catch (Exception ignored) {}
        }
        return mapHistory(snapshots);
    }

    private List<Map<String, Object>> mapHistory(List<EstimateController.RoundSnapshot> snapshots) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (EstimateController.RoundSnapshot snap : snapshots) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("task", snap.task);
            item.put("startedAt", snap.startedAt);
            item.put("endedAt", snap.endedAt);
            // Do not expose votes mapping by user; only summary is returned as per current API
            item.put("summary", snap.summary);
            out.add(item);
        }
        return out;
    }

    public EstimateController.RoundState newState(UUID boardId) {
        EstimateController.RoundState s = new EstimateController.RoundState();
        s.boardId = boardId;
        s.status = EstimateController.RoundStatus.voting;
        s.task = null;
        s.autoReveal = true;
        s.startedAt = Instant.now();
        return s;
    }
}
