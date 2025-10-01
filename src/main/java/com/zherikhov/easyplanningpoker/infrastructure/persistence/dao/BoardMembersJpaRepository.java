package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BoardMembersJpaRepository extends JpaRepository<BoardMembers, BoardMembers.BoardMemberId> {
    List<BoardMembers> findByUser(User user);

    boolean existsByBoardAndUser(Board board, User user);

    @Query("select bm.board from BoardMembers bm where bm.user = :user")
    List<Board> findBoardsByUser(@Param("user") User user);
}
