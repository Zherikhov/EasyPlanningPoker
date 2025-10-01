package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.BoardMembersJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers.BoardMemberId;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BoardMembersService {
    private final BoardMembersJpaRepository boardMembersJpaRepository;

    public BoardMembersService(BoardMembersJpaRepository boardMembersJpaRepository) {
        this.boardMembersJpaRepository = boardMembersJpaRepository;
    }

    public List<BoardMembers> findAll() {
        return boardMembersJpaRepository.findAll();
    }

    public Optional<BoardMembers> findById(BoardMemberId id) {
        return boardMembersJpaRepository.findById(id);
    }

    public BoardMembers save(BoardMembers boardMembers) {
        return boardMembersJpaRepository.save(boardMembers);
    }

    public void deleteById(BoardMemberId id) {
        boardMembersJpaRepository.deleteById(id);
    }

    // New helpers for sharing feature
    public List<Board> findBoardsSharedWith(User user) {
        return boardMembersJpaRepository.findBoardsByUser(user);
    }

    public boolean isMember(Board board, User user) {
        return boardMembersJpaRepository.existsByBoardAndUser(board, user);
    }
}
