package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardMembersJpaRepository extends JpaRepository<BoardMembers, BoardMembers.BoardMemberId> {
}
