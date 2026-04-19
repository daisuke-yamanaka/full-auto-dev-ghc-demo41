package com.example.library.domain;

import lombok.Data;
import org.seasar.doma.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions")
@Data
public class UserSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String tokenHash;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
