package com.example.library.controller;

import com.example.library.dto.*;
import com.example.library.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @PostMapping
    public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody CreateLoanRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(loanService.createLoan(auth.getName(), request));
    }

    @PutMapping("/{id}/return")
    public ResponseEntity<ReturnLoanResponse> returnLoan(
            @PathVariable Long id,
            @Valid @RequestBody ReturnLoanRequest request,
            Authentication auth) {
        return ResponseEntity.ok(loanService.returnLoan(id, request, auth.getName()));
    }
}
