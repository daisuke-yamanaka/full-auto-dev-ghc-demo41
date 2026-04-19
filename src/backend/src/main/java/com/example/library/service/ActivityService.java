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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final OperationLogDao operationLogDao;
    private final UserDao userDao;
    private final BookDao bookDao;

    @Transactional(readOnly = true)
    public ActivitiesResponse getMyActivities(String userId) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<OperationLog> logs = operationLogDao.findRecentByUserId(user.getId(), 20);

        List<ActivityItem> activities = logs.stream().map(opLog -> {
            ActivityItem item = new ActivityItem();
            item.setId(opLog.getId());
            item.setType(mapOperationType(opLog.getOperationType()));

            if ("BOOK".equals(opLog.getTargetType()) && opLog.getTargetId() != null) {
                try {
                    Long bookId = Long.parseLong(opLog.getTargetId());
                    item.setBookId(bookId);
                    bookDao.findById(bookId).ifPresent(book -> item.setBookTitle(book.getTitle()));
                } catch (NumberFormatException ignored) {}
            }

            item.setDatetime(opLog.getCreatedAt());
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
