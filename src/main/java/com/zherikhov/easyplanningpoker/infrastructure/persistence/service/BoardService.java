package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.BoardJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BoardService {
    private final BoardJpaRepository repository;

    public BoardService(BoardJpaRepository repository) {
        this.repository = repository;
    }

    public List<Board> findByOwner(User owner) {
        return repository.findByOwner(owner);
    }

    public Optional<Board> findById(UUID id) {
        return repository.findById(id);
    }

    public Board save(Board board) {
        return repository.save(board);
    }
}
