package com.example.library.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReturnLoanResponse {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private LocalDateTime returnedAt;
    private Long version;
}
