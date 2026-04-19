package com.example.library.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class BookDetailResponse {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String publisher;
    private Integer publishedYear;
    private String category;
    private Integer totalCopies;
    private Integer availableCopies;
    private Integer reservationCount;
    private LocalDate earliestDueDate;
    private Long currentUserLoanId;
    private Long currentUserLoanVersion;
    private Long currentUserReservationId;
    private Long currentUserReservationVersion;
    private String currentUserStatus;
    private Integer currentUserQueuePosition;
    private Long version;
}
