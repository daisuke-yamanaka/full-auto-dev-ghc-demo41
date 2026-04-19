package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class ActivitiesResponse {
    private List<ActivityItem> activities;
}
