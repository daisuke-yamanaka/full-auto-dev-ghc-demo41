package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class OperationLogsResponse {
    private List<OperationLogItem> logs;
    private long total;
    private int page;
    private int size;
}
