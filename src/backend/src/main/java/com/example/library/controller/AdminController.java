package com.example.library.controller;

import com.example.library.dto.*;
import com.example.library.service.BookService;
import com.example.library.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final BookService bookService;
    private final UserService userService;

    @PostMapping("/books")
    public ResponseEntity<AdminBookResponse> createBook(@Valid @RequestBody CreateBookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBook(request));
    }

    @PutMapping("/books/{id}")
    public ResponseEntity<AdminBookResponse> updateBook(@PathVariable Long id, @Valid @RequestBody UpdateBookRequest request) {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    @DeleteMapping("/books/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id, @Valid @RequestBody DeleteRequest request) {
        bookService.deleteBook(id, request.getVersion());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users")
    public ResponseEntity<UsersResponse> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.getUsers(page, size));
    }

    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @Valid @RequestBody DeleteRequest request) {
        userService.deleteUser(id, request.getVersion());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable Long id, @Valid @RequestBody AdminResetPasswordRequest request) {
        userService.resetPassword(id, request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "パスワードをリセットしました"));
    }
}
