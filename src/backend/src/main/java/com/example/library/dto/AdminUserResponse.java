package com.example.library.dto;

import lombok.Data;

@Data
public class AdminUserResponse {
    private Long id;
    private String userId;
    private String email;
    private String name;
    private String role;
    private String fontSize;
    private Long version;
}
