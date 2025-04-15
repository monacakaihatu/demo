package com.example.demo.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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

        // 今日の日付
        LocalDate today = LocalDate.now();

        // 今日までの未完了タスク
        List<Todo> dueTodayOrPast = new ArrayList<>();
        // それ以外の未完了タスク（未来 or 期限なし）
        List<Todo> dueFutureOrNoDate = new ArrayList<>();

        for (Todo todo : todos) {
            if (!todo.isCompleted()) {
                if (todo.getDueDate() != null && !todo.getDueDate().isAfter(today)) {
                    dueTodayOrPast.add(todo);
                } else {
                    dueFutureOrNoDate.add(todo);
                }
            }
        }

        model.addAttribute("dueTodayOrPast", dueTodayOrPast);
        model.addAttribute("dueFutureOrNoDate", dueFutureOrNoDate);
        model.addAttribute("groups", groups);
        model.addAttribute("todos", todos);

        // 未完了の合計カウント（任意）
        model.addAttribute("count", dueTodayOrPast.size() + dueFutureOrNoDate.size());

        return "todo-list";
    }

    @GetMapping("/api/{id}")
    @ResponseBody
    public TodoDto getTodoDetail(@PathVariable Long id) {
        Todo todo = todoService.findById(id);
        if (todo == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);

        return new TodoDto(todo); // DTOで返却
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
        if (bindingResult.hasErrors()) {
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
        LocalDate today = LocalDate.now();
        boolean isToday = false;

        if (todo.getDueDate() != null && !todo.getDueDate().isAfter(today)) {
            isToday = true;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("task", saved.getTask());
        response.put("completed", saved.isCompleted());
        response.put("dueDate", saved.getDueDate());
        response.put("groupId", saved.getTaskGroup() != null ? saved.getTaskGroup().getId() : null);
        response.put("groupName", saved.getTaskGroup() != null ? saved.getTaskGroup().getName() : null);
        response.put("isToday", isToday);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/update-ajax/{id}")
    @ResponseBody
    public ResponseEntity<?> updateTodoAjax(@PathVariable Long id, @Valid @RequestBody TodoForm form,
            BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error -> {
                errors.put(error.getField(), error.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        LocalDate dueDate = form.getDueDate();

        Todo todo = todoService.findById(id);
        if (todo == null)
            return ResponseEntity.notFound().build();

        todo.setTask(form.getTask());
        todo.setUpdatedAt(LocalDateTime.now(ZoneId.of("Asia/Tokyo")));

        if (dueDate != null) {
            todo.setDueDate(dueDate);
        } else {
            todo.setDueDate(null);
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

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
        todoService.saveTodo(todo);

        // debug
        System.out.println("form：　　　" + form);
        System.out.println("デバッグ：　　　" + todo);

        return ResponseEntity.ok(todo);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteTodoAjax(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return ResponseEntity.ok().build();
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

    @GetMapping("/tab")
    @ResponseBody
    public Map<String, List<TodoDto>> getTodosByTab(
            @RequestParam(required = false) Boolean completed,
            @RequestParam(defaultValue = "all") String tab,
            @RequestParam(required = false) Long groupId) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません"));

        List<Todo> todos = todoRepository.findByUserAndCompleted(user, completed);
        LocalDate today = LocalDate.now();

        List<TodoDto> filtered = todos.stream()
                .filter(todo -> {
                    if ("today".equals(tab)) {
                        return !todo.isCompleted() && todo.getDueDate() != null && !todo.getDueDate().isAfter(today);
                    } else if ("other".equals(tab)) {
                        return !todo.isCompleted() && (todo.getDueDate() == null || todo.getDueDate().isAfter(today));
                    } else if ("completed".equals(tab)) {
                        return todo.isCompleted();
                    }
                    return true;
                })
                .filter(todo -> groupId == null
                        || (todo.getTaskGroup() != null && groupId.equals(todo.getTaskGroup().getId())))
                .map(TodoDto::new)
                .toList();

        return Map.of("todos", filtered);
    }

}
