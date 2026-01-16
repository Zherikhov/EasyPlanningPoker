package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.ParticipantType;
import com.easysprintpoker.domain.enums.SessionRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "session_participants",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_session_participants_user", columnNames = {"session_id", "user_id"}),
                @UniqueConstraint(name = "uq_session_participants_guest", columnNames = {"session_id", "board_guest_id"})
        })
public class SessionParticipantEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EstimationSessionEntity session;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_type", nullable = false)
    private ParticipantType participantType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_guest_id")
    private BoardGuestEntity boardGuest;

    @Column(name = "display_name_snapshot", nullable = false)
    private String displayNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private SessionRole role = SessionRole.VOTER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "joined_via_access_link_id")
    private BoardAccessLinkEntity joinedViaAccessLink;

    @Column(name = "joined_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime joinedAt;

    @Column(name = "left_at", columnDefinition = "timestamptz")
    private OffsetDateTime leftAt;
}
