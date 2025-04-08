package com.example.demo.model;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "task_groupes")
@Getter
@Setter
@ToString
public class TaskGroup {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    private LocalDateTime createdAt = LocalDateTime.now(ZoneId.of("Asia/Tokyo"));
    private LocalDateTime updatedAt = LocalDateTime.now(ZoneId.of("Asia/Tokyo"));

    // 紐づいているTodoを取得するメソッド
    public List<Todo> getTodos() {
        return user.getTodos().stream()
                .filter(todo -> todo.getTaskGroup() != null && todo.getTaskGroup().getId().equals(this.id))
                .collect(Collectors.toList());
    }
}
