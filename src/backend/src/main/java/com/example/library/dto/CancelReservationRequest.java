package com.example.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CancelReservationRequest {
    @NotNull
    private Long version;
}
