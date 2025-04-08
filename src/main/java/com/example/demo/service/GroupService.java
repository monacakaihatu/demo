package com.example.demo.service;

import org.springframework.stereotype.Service;

import com.example.demo.model.TaskGroup;
import com.example.demo.repository.TaskGroupRepository;
import com.example.demo.repository.TodoRepository;

@Service
public class GroupService {
    private final TaskGroupRepository taskGroupRepository;
    private final TodoRepository todoRepository;

    public GroupService(TaskGroupRepository taskGroupRepository, TodoRepository todoRepository) {
        this.taskGroupRepository = taskGroupRepository;
        this.todoRepository = todoRepository;
    }

    public TaskGroup renameGroup(Long id, String newName) {
        TaskGroup group = taskGroupRepository.findById(id).orElseThrow(() -> new RuntimeException("Group not found"));
        group.setName(newName);
        return taskGroupRepository.save(group);
    }

    public void deleteGroupAndTasks(Long id) {
        TaskGroup group = taskGroupRepository.findById(id).orElseThrow(() -> new RuntimeException("Group not found"));
        todoRepository.deleteAll(group.getTodos());
        taskGroupRepository.delete(group);
    }   
}
