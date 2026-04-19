package com.example.library.controller;

import com.example.library.dto.*;
import com.example.library.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            @Valid @RequestBody CreateReservationRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reservationService.createReservation(auth.getName(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelReservation(
            @PathVariable Long id,
            @Valid @RequestBody CancelReservationRequest request,
            Authentication auth) {
        reservationService.cancelReservation(id, auth.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
