package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class MyLoansResponse {
    private Integer currentLoanCount;
    private Integer remainingLoanCount;
    private Boolean isOverdue;
    private List<LoanItem> loans;
    private Integer total;
    private Integer page;
    private Integer size;
}
