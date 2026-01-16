package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "estimation_sessions")
public class EstimationSessionEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private UserEntity createdBy;

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status = SessionStatus.ACTIVE;

    @Column(name = "started_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime startedAt;

    @Column(name = "finished_at", columnDefinition = "timestamptz")
    private OffsetDateTime finishedAt;

    @Column(name = "last_activity_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime lastActivityAt;

    @Column(name = "current_item_id")
    private UUID currentItemId;

    @Column(name = "settings_snapshot", nullable = false, columnDefinition = "text")
    private String settingsSnapshot = "{}"; // jsonb

    @OneToMany(mappedBy = "session", fetch = FetchType.LAZY)
    private List<SessionItemEntity> items = new ArrayList<>();

    @OneToMany(mappedBy = "session", fetch = FetchType.LAZY)
    private List<SessionParticipantEntity> participants = new ArrayList<>();

    @OneToMany(mappedBy = "session", fetch = FetchType.LAZY)
    private List<SessionScaleItemEntity> scaleItems = new ArrayList<>();

    @OneToMany(mappedBy = "session", fetch = FetchType.LAZY)
    private List<SessionEventEntity> events = new ArrayList<>();
}
