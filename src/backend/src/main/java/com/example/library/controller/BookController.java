package com.example.library.controller;

import com.example.library.dto.*;
import com.example.library.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @GetMapping
    public ResponseEntity<BooksResponse> searchBooks(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String isbn,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(bookService.searchBooks(title, author, category, isbn, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookDetailResponse> getBook(@PathVariable Long id, Authentication auth) {
        String userId = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(bookService.getBook(id, userId));
    }
}
