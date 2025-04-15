package com.example.demo.model.form;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TodoForm {

    @NotBlank(message = "{task.required}")
    @Size(max = 100, message = "{task.length}")
    private String task;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dueDate;

    private Long groupId;

    @Size(max = 50, message = "{group.length}")
    private String newGroupName;
}
