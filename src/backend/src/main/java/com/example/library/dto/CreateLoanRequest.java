package com.example.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateLoanRequest {
    @NotNull
    private Long bookId;
}
