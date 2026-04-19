package com.example.library.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateBookRequest {
    @NotBlank
    @Size(min = 1, max = 200)
    private String title;
    @NotBlank
    @Size(min = 1, max = 100)
    private String author;
    @NotBlank
    @Pattern(regexp = "^\\d{10}(\\d{3})?$")
    private String isbn;
    @NotBlank
    @Size(min = 1, max = 100)
    private String publisher;
    @NotNull
    @Min(1000)
    @Max(9999)
    private Integer publishedYear;
    @NotBlank
    @Size(min = 1, max = 50)
    private String category;
    @NotNull
    @Min(1)
    private Integer totalCopies;
}
