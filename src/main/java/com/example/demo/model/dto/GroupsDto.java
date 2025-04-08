package com.example.demo.model.dto;

public class GroupsDto {
    private Long id;
    private String name;

    public GroupsDto(com.example.demo.model.TaskGroup taskGroup) {
        this.id = taskGroup.getId();
        this.name = taskGroup.getName();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
}
