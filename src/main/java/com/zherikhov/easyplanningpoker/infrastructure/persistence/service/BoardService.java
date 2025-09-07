package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.BoardJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BoardService {
    private final BoardJpaRepository boardJpaRepository;

    public BoardService(BoardJpaRepository boardJpaRepository) {
        this.boardJpaRepository = boardJpaRepository;
    }

    public List<Board> findAll() {
        return boardJpaRepository.findAll();
    }

    public Optional<Board> findById(UUID id) {
        return boardJpaRepository.findById(id);
    }

    public Board save(Board board) {
        return boardJpaRepository.save(board);
    }

    public void deleteById(UUID id) {
        boardJpaRepository.deleteById(id);
    }
}
