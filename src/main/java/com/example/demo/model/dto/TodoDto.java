package com.example.demo.model.dto;

public class TodoDto {
    private Long id;
    private String task;
    private boolean completed;

    public TodoDto(com.example.demo.model.Todo todo) {
        this.id = todo.getId();
        this.task = todo.getTask();
        this.completed = todo.isCompleted();
    }

    public Long getId() { return id; }
    public String getTask() { return task; }
    public boolean isCompleted() { return completed; }
}
