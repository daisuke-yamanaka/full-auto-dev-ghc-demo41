package com.example.library.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateSettingsRequest {
    @NotBlank
    @Pattern(regexp = "^(NORMAL|LARGE|XLARGE)$", message = "フォントサイズはNORMAL、LARGE、XLARGEのいずれかを指定してください")
    private String fontSize;
    @NotNull
    private Long version;
}
