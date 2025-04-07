package com.example.demo.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Todo;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.TodoRepository;
import com.example.demo.service.TodoService;

@Controller
@RequestMapping("/todos")
public class TodoController {
    
    @Autowired
    private TodoService todoService;

    private final UserRepository userRepository;
    private final TodoRepository todoRepository;

    public TodoController(UserRepository userRepository, TodoRepository todoRepository) {
        this.userRepository = userRepository;
        this.todoRepository = todoRepository;
    }

    @GetMapping("")
    public String getTodos(Model model) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;

        if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        model.addAttribute("todos", todoRepository.findByUser(user));
        return "todo-list";
    }

    @PatchMapping("/{id}/toggle")
    @ResponseBody
    public ResponseEntity<?> toggleCompleted(@PathVariable Long id) {
        Todo todo = todoService.findById(id);
        if (todo == null) return ResponseEntity.notFound().build();

        todo.setCompleted(!todo.isCompleted());
        todoService.saveTodo(todo);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/add-ajax")
    @ResponseBody
    public ResponseEntity<Todo> addTodoAjax(@RequestBody Map<String, String> payload) {
        System.out.println("受け取ったペイロード: " + payload);  // ← これ追加！

        String task = payload.get("task");
        if (task == null || task.isBlank()) {
            throw new RuntimeException("タスクが空です！");
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        Todo todo = new Todo();
        todo.setTask(task);
        todo.setCompleted(false);
        todo.setUser(user);

        Todo saved = todoService.saveTodoAjax(todo);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteTodoAjax(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/update-ajax/{id}")
    @ResponseBody
    public ResponseEntity<Todo> updateTodoAjax(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String task = payload.get("task");
        Todo todo = todoService.findById(id);
        if (todo == null) return ResponseEntity.notFound().build();

        todo.setTask(task);
        todoService.saveTodo(todo);

        return ResponseEntity.ok(todo);
    }

}
