package com.example.library.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReservationItem {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private String author;
    private LocalDateTime reservedAt;
    private Integer queuePosition;
    private Long version;
}
