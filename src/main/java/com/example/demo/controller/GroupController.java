package com.example.demo.controller;

import java.util.Map;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.TaskGroup;
import com.example.demo.model.User;
import com.example.demo.service.GroupService;
import com.example.demo.model.dto.GroupsDto;
import com.example.demo.repository.TaskGroupRepository;
import com.example.demo.repository.UserRepository;
@RestController
@RequestMapping("/todos/groups")
public class GroupController {

    @Autowired
    private GroupService groupService;

    private final UserRepository userRepository;
    private final TaskGroupRepository taskGroupRepository;

    public GroupController(
            UserRepository userRepository,
            TaskGroupRepository taskGroupRepository) {
        this.userRepository = userRepository;
        this.taskGroupRepository = taskGroupRepository;
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskGroup> updateGroup(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newName = body.get("name");
        TaskGroup updated = groupService.renameGroup(id, newName);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long id) {
        groupService.deleteGroupAndTasks(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/list")
    @ResponseBody
    public List<GroupsDto> getGroups() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ユーザーが見つかりません"));

        List<TaskGroup> groups = taskGroupRepository.findByUser(user);
        return groups.stream().map(GroupsDto::new).toList();
    }
}
