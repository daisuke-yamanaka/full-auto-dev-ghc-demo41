package com.example.library.domain;

import lombok.Data;
import org.seasar.doma.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "books")
@Data
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publisher;
    private Integer publishedYear;
    private String category;
    private Integer totalCopies;
    @Version
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
