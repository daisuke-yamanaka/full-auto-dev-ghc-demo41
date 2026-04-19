package com.example.library.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class BookSummary {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publisher;
    private Integer publishedYear;
    private String category;
    private Integer totalCopies;
    private Integer availableCopies;
    private LocalDate earliestDueDate;
    private Long version;
}
