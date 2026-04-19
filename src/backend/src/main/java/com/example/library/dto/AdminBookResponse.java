package com.example.library.dto;

import lombok.Data;

@Data
public class AdminBookResponse {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publisher;
    private Integer publishedYear;
    private String category;
    private Integer totalCopies;
    private Integer availableCopies;
    private Long version;
}
