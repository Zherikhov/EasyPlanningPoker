package com.zherikhov.easyplanningpoker.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "board_members")
@IdClass(BoardMembers.BoardMemberId.class)
public class BoardMembers {

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "role", nullable = false, length = 20)
    private String role = "MEMBER";

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    public BoardMembers() {}

    @Getter
    @Setter
    public static class BoardMemberId implements Serializable {
        private UUID board;
        private UUID user;

        public BoardMemberId() {}
    }
}
