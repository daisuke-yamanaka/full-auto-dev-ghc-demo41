package com.example.library.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateUserRequest {
    @NotBlank
    @Size(min = 1, max = 50)
    private String userId;
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;
    @NotBlank
    @Size(min = 1, max = 100)
    private String name;
    private String role = "USER";
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
