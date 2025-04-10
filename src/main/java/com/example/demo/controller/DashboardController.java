package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;

import com.example.demo.model.TaskGroup;
import com.example.demo.model.User;

import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import com.example.demo.repository.TaskGroupRepository;
import com.example.demo.repository.UserRepository;

@Controller
public class DashboardController {

    private final TaskGroupRepository taskGroupRepository;
    private final UserRepository userRepository;

    public DashboardController(TaskGroupRepository taskGroupRepository, UserRepository userRepository) {
        this.userRepository = userRepository;
        this.taskGroupRepository = taskGroupRepository;
    }
    
    @GetMapping("/dashboard")
    public String dashboard(Model model) {

        // 認証されたユーザーを取得
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません: " + username));

        // ユーザーのタスクグループの取得
        List<TaskGroup> groups = taskGroupRepository.findByUser(user);
        model.addAttribute("groups", groups);

        return "dashboard";
    }
    
}
