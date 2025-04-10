package com.example.demo.model.form;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserForm {

    @Size(min = 1, max = 20, message = "{username.length}")
    private String username;

    @Size(min = 1, max = 20, message = "{password.length}")
    private String password;
}
