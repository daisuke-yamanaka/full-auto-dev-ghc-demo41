package com.example.library.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LoanResponse {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private LocalDateTime loanedAt;
    private LocalDate dueDate;
    private Long version;
}
