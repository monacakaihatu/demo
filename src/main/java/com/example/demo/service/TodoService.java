package com.example.demo.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Todo;
import com.example.demo.repository.TodoRepository;

@Service
public class TodoService {

    @Autowired
    private TodoRepository todoRepository;

    public List<Todo> getAllTodos() {
        return todoRepository.findAll();
    }

    public void saveTodo(Todo todo) {
        todoRepository.save(todo);
    }

    public Todo saveTodoAjax(Todo todo) {
        return todoRepository.save(todo);
    }    

    public void deleteTodo(Long id) {
        todoRepository.deleteById(id);
    }

    public Optional<Todo> getTodoById(Long id) {   
        return todoRepository.findById(id);
    }

    public Todo findById(Long id) {
        return todoRepository.findById(id).orElse(null);
    }
}
