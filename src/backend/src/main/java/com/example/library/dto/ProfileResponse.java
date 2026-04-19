package com.example.library.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfileResponse {
    private Long id;
    private String userId;
    private String email;
    private String name;
    private String role;
    private String fontSize;
    private Long version;
}
