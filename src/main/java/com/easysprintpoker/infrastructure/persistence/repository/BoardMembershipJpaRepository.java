package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardMembershipEntity;
import com.easysprintpoker.domain.entity.BoardMembershipId;
import com.easysprintpoker.domain.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardMembershipJpaRepository extends JpaRepository<BoardMembershipEntity, BoardMembershipId> {
    boolean existsByBoard_IdAndUser_IdAndStatus(UUID boardId, UUID userId, MembershipStatus status);

    Optional<BoardMembershipEntity> findByBoard_IdAndUser_Id(UUID boardId, UUID userId);

    List<BoardMembershipEntity> findByBoard_Id(UUID boardId);

    @Query("select bm from BoardMembershipEntity bm where bm.board.id = :boardId and bm.status in :statuses")
    List<BoardMembershipEntity> findByBoardIdWithStatuses(@Param("boardId") UUID boardId, @Param("statuses") List<MembershipStatus> statuses);
}
