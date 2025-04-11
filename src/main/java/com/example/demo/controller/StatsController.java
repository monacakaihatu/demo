package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Todo;
import com.example.demo.model.User;
import com.example.demo.repository.TodoRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.TaskGroupRepository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final TodoRepository todoRepository;
    private final UserRepository userRepository;
    private final TaskGroupRepository taskGroupRepository;

    public StatsController(TodoRepository todoRepository, UserRepository userRepository, TaskGroupRepository taskGroupRepository) {
        this.userRepository = userRepository;
        this.todoRepository = todoRepository;
        this.taskGroupRepository = taskGroupRepository;
    }

    @GetMapping("/group/{id}")
    public Map<String, Long> getStatsByGroup(@PathVariable Long id) {
        var group = taskGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var tasks = todoRepository.findByUserAndTaskGroupId(group.getUser(), group.getId());
        long completed = tasks.stream().filter(t -> t.isCompleted()).count();
        long uncompleted = tasks.size() - completed;
        return Map.of("completed", completed, "uncompleted", uncompleted);
    }

    @GetMapping("/due-categories")
    public Map<String, Long> getDueDateStats() {
        List<Todo> todos = todoRepository.findAll();
        return buildDueDateStats(todos);
    }

    @GetMapping("/summary")
    public Map<String, Long> getTaskStats() {

        User user = findAuthUser();

        long total = todoRepository.countByUserId(user.getId());
        long completed = todoRepository.countCompletedByUserId(user.getId());
        long uncompleted = todoRepository.countUncompletedByUserId(user.getId());

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("completed", completed);
        stats.put("uncompleted", uncompleted);

        return stats;
    }

    @GetMapping("/due")
    public Map<String, Long> getDueStats(@RequestParam(required = false) Long groupId) {
        
        User user = findAuthUser();

        List<Todo> todos = (groupId != null)
            ? todoRepository.findByUserAndTaskGroupId(user, groupId)
            : todoRepository.findAll();
        return buildDueDateStats(todos);
    }

    /**
     * userの取得
     * @param todos
     * @return　User user
     */
    private User findAuthUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;

        if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        return user;
    }

    /**
     * 統計で各設定日数ごとに対象のタスク件数を返すメソッド
     * @param todos
     * @return Map
     */
    private Map<String, Long> buildDueDateStats(List<Todo> todos) {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        LocalDate in2Days = today.plusDays(2);
        LocalDate in5Days = today.plusDays(5);

        long countToday = todos.stream()
            .filter(t -> t.getDueDate() != null && t.getDueDate().isEqual(today) && !t.isCompleted())
            .count();
    
        long countTomorrow = todos.stream()
            .filter(t -> t.getDueDate() != null && t.getDueDate().isEqual(tomorrow) && !t.isCompleted())
            .count();
    
        long count2to5 = todos.stream()
            .filter(t -> t.getDueDate() != null &&
                         !t.getDueDate().isBefore(in2Days) &&
                         !t.getDueDate().isAfter(in5Days)
                         && !t.isCompleted())
            .count();
    
        long countAfter = todos.stream()
            .filter(t -> t.getDueDate() != null && t.getDueDate().isAfter(in5Days) && !t.isCompleted())
            .count();
    
        long countUnset = todos.stream()
            .filter(t -> t.getDueDate() == null && !t.isCompleted())
            .count();
    
        return Map.of(
            "今日", countToday,
            "明日", countTomorrow,
            "2～5日後", count2to5,
            "それ以降", countAfter,
            "未設定", countUnset
        );
    }    
}