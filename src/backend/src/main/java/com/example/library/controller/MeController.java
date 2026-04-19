package com.example.library.controller;

import com.example.library.dto.*;
import com.example.library.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;
    private final LoanService loanService;
    private final ReservationService reservationService;
    private final ActivityService activityService;

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile(auth.getName()));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request, Authentication auth) {
        return ResponseEntity.ok(userService.updateProfile(auth.getName(), request));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication auth) {
        userService.changePassword(auth.getName(), request);
        return ResponseEntity.ok(Map.of("message", "パスワードを変更しました"));
    }

    @PutMapping("/settings")
    public ResponseEntity<SettingsResponse> updateSettings(@Valid @RequestBody UpdateSettingsRequest request, Authentication auth) {
        return ResponseEntity.ok(userService.updateSettings(auth.getName(), request));
    }

    @GetMapping("/loans")
    public ResponseEntity<MyLoansResponse> getLoans(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(loanService.getMyLoans(auth.getName(), page, size));
    }

    @GetMapping("/reservations")
    public ResponseEntity<MyReservationsResponse> getReservations(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(reservationService.getMyReservations(auth.getName(), page, size));
    }

    @GetMapping("/activities")
    public ResponseEntity<ActivitiesResponse> getActivities(Authentication auth) {
        return ResponseEntity.ok(activityService.getMyActivities(auth.getName()));
    }
}
