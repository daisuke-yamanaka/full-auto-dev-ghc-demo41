package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class MyReservationsResponse {
    private List<ReservationItem> reservations;
    private Integer total;
    private Integer page;
    private Integer size;
}
