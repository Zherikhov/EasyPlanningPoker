package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.BoardMembersJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.BoardMembers.BoardMemberId;
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
}
