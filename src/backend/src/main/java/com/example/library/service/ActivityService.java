package com.example.library.service;

import com.example.library.dao.BookDao;
import com.example.library.dao.OperationLogDao;
import com.example.library.dao.UserDao;
import com.example.library.domain.OperationLog;
import com.example.library.domain.User;
import com.example.library.dto.ActivitiesResponse;
import com.example.library.dto.ActivityItem;
import com.example.library.dto.OperationLogItem;
import com.example.library.dto.OperationLogsResponse;
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
    public OperationLogsResponse getOperationLogs(int page, int size) {
        int offset = (page - 1) * size;
        List<OperationLog> logs = operationLogDao.findAll(size, offset);
        long total = operationLogDao.countAll();

        List<OperationLogItem> items = logs.stream().map(log -> {
            OperationLogItem item = new OperationLogItem();
            item.setId(log.getId());
            item.setOperationType(log.getOperationType());
            item.setUserId(log.getUserId());
            item.setTargetType(log.getTargetType());
            item.setTargetId(log.getTargetId());
            item.setDetail(log.getDetail());
            item.setCreatedAt(log.getCreatedAt());
            userDao.findById(log.getUserId()).ifPresent(user -> {
                item.setUserLoginId(user.getUserId());
                item.setUserName(user.getName());
            });
            return item;
        }).collect(Collectors.toList());

        OperationLogsResponse response = new OperationLogsResponse();
        response.setLogs(items);
        response.setTotal(total);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

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
            case "CANCEL_RESERVE" -> "CANCEL_RESERVATION";
            default -> operationType;
        };
    }
}
