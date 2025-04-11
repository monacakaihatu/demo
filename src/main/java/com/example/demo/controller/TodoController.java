package com.example.demo.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Todo;
import com.example.demo.model.User;
import com.example.demo.model.TaskGroup;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.TodoRepository;
import com.example.demo.repository.TaskGroupRepository;
import com.example.demo.service.TodoService;

import jakarta.validation.Valid;

import com.example.demo.model.dto.TodoDto;
import com.example.demo.model.form.TodoForm;

@Controller
@RequestMapping("/todos")
public class TodoController {

    @Autowired
    private TodoService todoService;

    private final UserRepository userRepository;
    private final TodoRepository todoRepository;
    private final TaskGroupRepository taskGroupRepository;

    public TodoController(
            UserRepository userRepository,
            TodoRepository todoRepository,
            TaskGroupRepository taskGroupRepository) {
        this.userRepository = userRepository;
        this.todoRepository = todoRepository;
        this.taskGroupRepository = taskGroupRepository;
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

        // タスクとグループを取得
        List<Todo> todos = todoRepository.findByUser(user);
        List<TaskGroup> groups = taskGroupRepository.findByUser(user);

        model.addAttribute("todos", todos);
        model.addAttribute("groups", groups);

        // 未完了のタスクのカウント総数
        long count = todos.stream().filter(todo -> !todo.isCompleted()).count();
        model.addAttribute("count", count);

        return "todo-list";
    }

    @PatchMapping("/{id}/toggle")
    @ResponseBody
    public ResponseEntity<?> toggleCompleted(@PathVariable Long id) {
        Todo todo = todoService.findById(id);
        if (todo == null)
            return ResponseEntity.notFound().build();

        todo.setCompleted(!todo.isCompleted());
        todoService.saveTodo(todo);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/add-ajax")
    @ResponseBody
    public ResponseEntity<?> addTodoAjax(@Valid @RequestBody TodoForm form, BindingResult bindingResult) {
        // バリデーションエラーの処理
        System.out.println("=== 受信フォーム ===");
        System.out.println("task = " + form.getTask());
        System.out.println("groupId = " + form.getGroupId());
        System.out.println("newGroupName = " + form.getNewGroupName());

        if (bindingResult.hasErrors()) {
            System.out.println("バリデーションエラー: " + bindingResult.getAllErrors());

            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error -> {
                errors.put(error.getField(), error.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        Todo todo = new Todo();
        todo.setTask(form.getTask());
        todo.setCompleted(false);
        todo.setUser(user);
        todo.setDueDate(form.getDueDate());

        // グループの処理
        if (form.getNewGroupName() != null && !form.getNewGroupName().isBlank()) {
            TaskGroup newGroup = new TaskGroup();
            newGroup.setName(form.getNewGroupName());
            newGroup.setUser(user);
            taskGroupRepository.save(newGroup);
            todo.setTaskGroup(newGroup);
        } else if (form.getGroupId() != null) {
            TaskGroup group = taskGroupRepository.findById(form.getGroupId())
                    .orElseThrow(() -> new RuntimeException("グループが見つかりません: " + form.getGroupId()));
            todo.setTaskGroup(group);
        }

        Todo saved = todoService.saveTodoAjax(todo);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("task", saved.getTask());
        response.put("completed", saved.isCompleted());
        response.put("groupId", saved.getTaskGroup() != null ? saved.getTaskGroup().getId() : null);
        response.put("groupName", saved.getTaskGroup() != null ? saved.getTaskGroup().getName() : null);

        return ResponseEntity.ok(response);
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
        String dueDateStr = payload.get("dueDate");
        
        Todo todo = todoService.findById(id);
        if (todo == null)
            return ResponseEntity.notFound().build();

        todo.setTask(task);
        todo.setUpdatedAt(LocalDateTime.now());
        if (dueDateStr != null && !dueDateStr.isEmpty()) {
            LocalDate dueDate = LocalDate.parse(dueDateStr); // "yyyy-MM-dd" 形式ならこれでOK
            todo.setDueDate(dueDate);
        } else {
            todo.setDueDate(null); // 未設定にする場合
        }
        todoService.saveTodo(todo);

        return ResponseEntity.ok(todo);
    }

    @GetMapping("/all")
    @ResponseBody
    public List<TodoDto> getAllTodos(@RequestParam(required = false) Boolean completed) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません"));

        List<Todo> todos = todoRepository.findByUserAndCompleted(user, completed);
        return todos.stream().map(TodoDto::new).toList();
    }

    @GetMapping("/group/{groupId}")
    @ResponseBody
    public List<TodoDto> getTodosByGroupAndCompletion(
            @PathVariable Long groupId,
            @RequestParam(required = false) Boolean completed) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません"));

        List<Todo> todos;

        if (completed == null) {
            todos = todoRepository.findByUserAndTaskGroupId(user, groupId);
        } else {
            todos = todoRepository.findByUserAndTaskGroupIdAndCompleted(user, groupId, completed);
        }

        return todos.stream().map(TodoDto::new).toList();
    }

}
