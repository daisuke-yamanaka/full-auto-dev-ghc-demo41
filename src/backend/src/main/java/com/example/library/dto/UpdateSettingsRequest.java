package com.example.library.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateSettingsRequest {
    @NotBlank
    private String fontSize;
    @NotNull
    private Long version;
}
