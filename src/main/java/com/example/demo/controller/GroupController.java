package com.example.demo.controller;

import java.util.Map;   

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.TaskGroup;
import com.example.demo.service.GroupService;

@RestController
@RequestMapping("/todos/groups")
public class GroupController {
    
    @Autowired
    private GroupService groupService;

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
}
