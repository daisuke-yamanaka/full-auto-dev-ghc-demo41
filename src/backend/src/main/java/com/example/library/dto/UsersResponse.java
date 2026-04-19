package com.example.library.dto;

import lombok.Data;
import java.util.List;

@Data
public class UsersResponse {
    private List<UserSummary> users;
    private Integer total;
    private Integer page;
    private Integer size;
}
