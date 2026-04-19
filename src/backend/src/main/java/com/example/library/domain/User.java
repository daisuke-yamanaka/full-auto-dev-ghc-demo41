package com.example.library.domain;

import lombok.Data;
import org.seasar.doma.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userId;
    private String email;
    private String name;
    private String passwordHash;
    private String role;
    private String fontSize;
    @Version
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
