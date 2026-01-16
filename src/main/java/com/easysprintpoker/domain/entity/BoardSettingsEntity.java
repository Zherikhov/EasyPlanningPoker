package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.RevealPolicy;
import com.easysprintpoker.domain.enums.ScaleType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "board_settings")
public class BoardSettingsEntity {

    @Id
    @Column(name = "board_id", updatable = false, nullable = false)
    private UUID id; // shared PK

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "board_id")
    private BoardEntity board;

    @Enumerated(EnumType.STRING)
    @Column(name = "estimation_scale_type", nullable = false)
    private ScaleType estimationScaleType = ScaleType.FIBONACCI;

    @Enumerated(EnumType.STRING)
    @Column(name = "reveal_policy", nullable = false)
    private RevealPolicy revealPolicy = RevealPolicy.MANUAL;

    @Column(name = "allow_guests", nullable = false)
    private boolean allowGuests = true;

    @Column(name = "locale", nullable = false)
    private String locale = "en";

    @Column(name = "updated_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "board", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BoardCustomScaleItemEntity> customScaleItems = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now().withNano(0);
    }
}
