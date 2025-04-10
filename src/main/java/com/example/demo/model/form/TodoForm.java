package com.example.demo.model.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TodoForm {
    
    @NotBlank(message = "{task.required}")
    @Size(max = 100, message = "{task.length}")
    private String task;

    private Long groupId;

    @Size(max = 50, message = "{group.length}")
    private String newGroupName;
}
