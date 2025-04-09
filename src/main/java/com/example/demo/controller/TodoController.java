package com.example.demo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Todo;
import com.example.demo.model.User;
import com.example.demo.model.TaskGroup;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.TodoRepository;
import com.example.demo.repository.TaskGroupRepository;
import com.example.demo.service.TodoService;
import com.example.demo.model.dto.TodoDto;

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
    public ResponseEntity<Todo> addTodoAjax(@RequestBody Map<String, String> payload) {
        String task = payload.get("task");
        String groupId = payload.get("groupId");
        String newGroupName = payload.get("newGroupName");

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
        
        // グループの処理
        if (newGroupName != null && !newGroupName.isBlank()) {
            TaskGroup newGroup = new TaskGroup();
            newGroup.setName(newGroupName);
            newGroup.setUser(user);
            taskGroupRepository.save(newGroup);
            todo.setTaskGroup(newGroup);
        } else if (groupId != null && !groupId.isBlank()) {
            taskGroupRepository.findById(Long.parseLong(groupId)).ifPresent(todo::setTaskGroup);
            todo.setTaskGroup(taskGroupRepository.findById(Long.parseLong(groupId))
                    .orElseThrow(() -> new RuntimeException("グループが見つかりません: " + groupId)));
        }
        
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
        if (todo == null)
            return ResponseEntity.notFound().build();

        todo.setTask(task);
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
