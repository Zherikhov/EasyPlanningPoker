package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BoardJpaRepository extends JpaRepository<BoardEntity, UUID> {
    Page<BoardEntity> findByOwner_Id(UUID ownerId, Pageable pageable);
    Optional<BoardEntity> findByKey(String key);

    @Query("select distinct bm.board from BoardMembershipEntity bm where bm.user.id = :userId and bm.status = com.easysprintpoker.domain.enums.MembershipStatus.ACTIVE")
    Page<BoardEntity> findActiveMemberBoards(@Param("userId") UUID userId, Pageable pageable);

    @Query("select distinct b from BoardEntity b left join b.memberships bm where b.owner.id = :userId or " +
            "(bm.user.id = :userId and bm.status = com.easysprintpoker.domain.enums.MembershipStatus.ACTIVE)")
    Page<BoardEntity> findAllForUser(@Param("userId") UUID userId, Pageable pageable);
}
