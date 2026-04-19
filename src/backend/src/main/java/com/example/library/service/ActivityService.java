package com.example.library.service;

import com.example.library.dao.BookDao;
import com.example.library.dao.OperationLogDao;
import com.example.library.dao.UserDao;
import com.example.library.domain.OperationLog;
import com.example.library.domain.User;
import com.example.library.dto.ActivitiesResponse;
import com.example.library.dto.ActivityItem;
import com.example.library.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final OperationLogDao operationLogDao;
    private final UserDao userDao;
    private final BookDao bookDao;

    @Transactional(readOnly = true)
    public ActivitiesResponse getMyActivities(String userId) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<OperationLog> logs = operationLogDao.findRecentByUserId(user.getId(), 20);

        List<ActivityItem> activities = logs.stream().map(log -> {
            ActivityItem item = new ActivityItem();
            item.setId(log.getId());
            item.setType(mapOperationType(log.getOperationType()));

            if ("BOOK".equals(log.getTargetType()) && log.getTargetId() != null) {
                try {
                    Long bookId = Long.parseLong(log.getTargetId());
                    item.setBookId(bookId);
                    bookDao.findById(bookId).ifPresent(book -> item.setBookTitle(book.getTitle()));
                } catch (NumberFormatException ignored) {}
            }

            item.setDatetime(log.getCreatedAt());
            return item;
        }).collect(Collectors.toList());

        ActivitiesResponse response = new ActivitiesResponse();
        response.setActivities(activities);
        return response;
    }

    private String mapOperationType(String operationType) {
        return switch (operationType) {
            case "LOAN" -> "LOAN";
            case "RETURN" -> "RETURN";
            case "RESERVE" -> "RESERVATION";
            default -> operationType;
        };
    }
}
