package com.example.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReservationRequest {
    @NotNull
    private Long bookId;
}
