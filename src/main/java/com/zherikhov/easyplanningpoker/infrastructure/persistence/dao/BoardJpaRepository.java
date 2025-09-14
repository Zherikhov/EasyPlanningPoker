package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BoardJpaRepository extends JpaRepository<Board, UUID> {
    List<Board> findByOwner(User owner);
}
