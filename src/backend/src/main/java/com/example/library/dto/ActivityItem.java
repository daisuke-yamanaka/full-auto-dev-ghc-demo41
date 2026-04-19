package com.example.library.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ActivityItem {
    private Long id;
    private String type;
    private Long bookId;
    private String bookTitle;
    private LocalDateTime datetime;
}
