package com.example.library.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateUserRequest {
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
    @NotBlank
    @Pattern(regexp = "^(USER|ADMIN)$", message = "ロールはUSERまたはADMINを指定してください")
    private String role;
    @NotNull
    private Long version;
}
