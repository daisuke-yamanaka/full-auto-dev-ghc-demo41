package com.example.library.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OperationLogItem {
    private Long id;
    private String operationType;
    private Long userId;
    private String userLoginId;
    private String userName;
    private String targetType;
    private String targetId;
    private String detail;
    private LocalDateTime createdAt;
}
