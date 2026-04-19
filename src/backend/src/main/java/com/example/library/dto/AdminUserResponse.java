package com.example.library.dto;

import lombok.Data;

/** openapi.yaml AdminUserResponse スキーマ準拠（fontSize は対象外） */
@Data
public class AdminUserResponse {
    private Long id;
    private String userId;
    private String email;
    private String name;
    private String role;
    private Long version;
}
