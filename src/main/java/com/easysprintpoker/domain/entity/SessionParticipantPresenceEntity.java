package com.easysprintpoker.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "session_participant_presence")
public class SessionParticipantPresenceEntity {

    @Id
    @Column(name = "session_participant_id", nullable = false, updatable = false)
    private UUID id; // shared PK with participant

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "session_participant_id")
    private SessionParticipantEntity sessionParticipant;

    @Column(name = "connected_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime connectedAt;

    @Column(name = "last_seen_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime lastSeenAt;

    @Column(name = "node_id")
    private String nodeId;
}
