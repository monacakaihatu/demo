package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.demo.model.Todo;
import com.example.demo.model.User;

public interface TodoRepository extends JpaRepository<Todo, Long> {
    List<Todo> findByUser(User user);
    List<Todo> findByUserAndTaskGroupId(User user, Long groupId);
    List<Todo> findByUserAndTaskGroupIdAndCompleted(User user, Long groupId, boolean completed);
    List<Todo> findByUserAndCompleted(User user, Boolean completed);
    
    long countByUserId(Long userId);

    @Query("SELECT COUNT(t) FROM Todo t WHERE t.user.id = :userId AND t.completed = true")
    long countCompletedByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(t) FROM Todo t WHERE t.user.id = :userId AND t.completed = false")
    long countUncompletedByUserId(@Param("userId") Long userId);
}
