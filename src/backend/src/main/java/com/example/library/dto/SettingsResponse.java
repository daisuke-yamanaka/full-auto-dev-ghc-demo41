package com.example.library.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SettingsResponse {
    private Long id;
    private String fontSize;
    private Long version;
}
