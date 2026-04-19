package com.example.library.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LoanItem {
    private Long loanId;
    private Long bookId;
    private String bookTitle;
    private String author;
    private LocalDateTime loanedAt;
    private LocalDate dueDate;
    private LocalDateTime returnedAt;
    private String status;
    private Boolean isOverdue;
    private Long version;
}
