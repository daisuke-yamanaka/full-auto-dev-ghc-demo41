package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class BooksResponse {
    private List<BookSummary> books;
    private Integer total;
    private Integer page;
    private Integer size;
}
