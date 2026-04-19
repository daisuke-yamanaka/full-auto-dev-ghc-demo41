package com.example.library.domain;

import lombok.Data;
import org.seasar.doma.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operation_logs")
@Data
public class OperationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String operationType;
    private String targetType;
    private String targetId;
    private String detail;
    private String ipAddress;
    private LocalDateTime createdAt;
}
