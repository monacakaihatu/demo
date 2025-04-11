package com.example.demo.model.dto;

import java.time.LocalDate;

public class TodoDto {
    private Long id;
    private String task;
    private boolean completed;
    private LocalDate dueDate;
    private GroupsDto group;

    public TodoDto(com.example.demo.model.Todo todo) {
        this.id = todo.getId();
        this.task = todo.getTask();
        this.completed = todo.isCompleted();
        this.dueDate = todo.getDueDate();
        if (todo.getTaskGroup() != null) {
            this.group = new GroupsDto(todo.getTaskGroup());
        }
    }

    public Long getId() { return id; }
    public String getTask() { return task; }
    public boolean isCompleted() { return completed; }
    public LocalDate getDueDate() { return dueDate; }
    public GroupsDto getTaskGroup() { return group;}
}
