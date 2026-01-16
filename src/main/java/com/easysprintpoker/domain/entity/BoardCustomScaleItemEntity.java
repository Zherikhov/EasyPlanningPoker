package com.easysprintpoker.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "board_custom_scale_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_board_custom_scale_items_label", columnNames = {"board_id", "label"})
        })
public class BoardCustomScaleItemEntity {

    @EmbeddedId
    private BoardCustomScaleItemId id;

    @MapsId("boardId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private BoardSettingsEntity board;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "numeric_value")
    private BigDecimal numericValue;

    @Column(name = "special", nullable = false)
    private boolean special = false;
}
