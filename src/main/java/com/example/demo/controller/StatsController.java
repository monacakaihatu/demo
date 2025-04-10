package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping; 
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.User;
import com.example.demo.repository.TodoRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.TaskGroupRepository;

import java.util.HashMap;
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

    @GetMapping("/summary")
    public Map<String, Long> getTaskStats() {

        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;

        if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        long total = todoRepository.countByUserId(user.getId());
        long completed = todoRepository.countCompletedByUserId(user.getId());
        long uncompleted = todoRepository.countUncompletedByUserId(user.getId());

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("completed", completed);
        stats.put("uncompleted", uncompleted);

        return stats;
    }
}