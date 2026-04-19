package com.example.library.service;

import com.example.library.dao.*;
import com.example.library.domain.*;
import com.example.library.dto.*;
import com.example.library.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReservationService {

    private static final String USER_NOT_FOUND = "User not found";

    private final ReservationDao reservationDao;
    private final BookDao bookDao;
    private final UserDao userDao;
    private final LoanDao loanDao;
    private final OperationLogDao operationLogDao;

    @Transactional(readOnly = true)
    public MyReservationsResponse getMyReservations(String userId, int page, int size) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

        int offset = (page - 1) * size;
        List<Reservation> reservations = reservationDao.findByUserId(user.getId(), size, offset);
        int total = reservationDao.countByUserId(user.getId());

        List<Long> bookIds = reservations.stream().map(Reservation::getBookId).distinct().toList();
        Map<Long, Book> bookMap = bookIds.isEmpty() ? Collections.emptyMap() :
            bookDao.findByIds(bookIds).stream().collect(Collectors.toMap(Book::getId, b -> b));

        List<ReservationItem> items = reservations.stream().map(r -> {
            Book book = bookMap.get(r.getBookId());
            int queuePos = reservationDao.getQueuePosition(r.getBookId(), r.getId());
            return toReservationItem(r, book, queuePos);
        }).toList();

        MyReservationsResponse response = new MyReservationsResponse();
        response.setReservations(items);
        response.setTotal(total);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

    @Transactional
    public ReservationResponse createReservation(String userId, CreateReservationRequest request) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        Book book = bookDao.findById(request.getBookId())
            .orElseThrow(() -> new ResourceNotFoundException("Book not found: " + request.getBookId()));

        if (reservationDao.findByUserIdAndBookId(user.getId(), book.getId()).isPresent()) {
            throw new BusinessRuleViolationException("この図書は既に予約済みです");
        }

        if (loanDao.findActiveByUserIdAndBookId(user.getId(), book.getId()).isPresent()) {
            throw new BusinessRuleViolationException("この図書は現在貸出中です。返却されると自動貸出されます。");
        }

        int activeLoanCount = loanDao.countActiveByBookId(book.getId());
        if (activeLoanCount < book.getTotalCopies()) {
            throw new BusinessRuleViolationException("貸出可能な蔵書があります。予約は全冊貸出中の場合のみ可能です。");
        }

        Reservation reservation = new Reservation();
        reservation.setUserId(user.getId());
        reservation.setBookId(book.getId());
        reservation.setReservedAt(LocalDateTime.now());
        reservation.setVersion(0L);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setUpdatedAt(LocalDateTime.now());
        reservationDao.insert(reservation);

        OperationLog opLog = new OperationLog();
        opLog.setUserId(user.getId());
        opLog.setOperationType("RESERVE");
        opLog.setTargetType("BOOK");
        opLog.setTargetId(book.getId().toString());
        opLog.setDetail(book.getTitle());
        opLog.setCreatedAt(LocalDateTime.now());
        operationLogDao.insert(opLog);

        log.info("予約: bookId={}, userId={}", book.getId(), userId);

        int queuePos = reservationDao.getQueuePosition(book.getId(), reservation.getId());

        ReservationResponse response = new ReservationResponse();
        response.setId(reservation.getId());
        response.setBookId(book.getId());
        response.setBookTitle(book.getTitle());
        response.setReservedAt(reservation.getReservedAt());
        response.setQueuePosition(queuePos);
        response.setVersion(reservation.getVersion());
        return response;
    }

    @Transactional
    public void cancelReservation(Long reservationId, String userId, CancelReservationRequest request) {
        Reservation reservation = reservationDao.findById(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

        if (!reservation.getUserId().equals(user.getId()) && !"ADMIN".equals(user.getRole())) {
            throw new UnauthorizedOperationException("この予約をキャンセルする権限がありません");
        }

        if (!reservation.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("予約情報が更新されています。再読み込みしてください。");
        }

        Book book = bookDao.findById(reservation.getBookId()).orElse(null);
        reservationDao.delete(reservation);

        OperationLog opLog = new OperationLog();
        opLog.setUserId(user.getId());
        opLog.setOperationType("CANCEL_RESERVE");
        opLog.setTargetType("BOOK");
        opLog.setTargetId(reservation.getBookId().toString());
        opLog.setDetail(book != null ? book.getTitle() : "");
        opLog.setCreatedAt(LocalDateTime.now());
        operationLogDao.insert(opLog);

        log.info("予約キャンセル: id={}, userId={}", reservationId, userId);
    }

    private ReservationItem toReservationItem(Reservation r, Book book, int queuePos) {
        ReservationItem item = new ReservationItem();
        item.setId(r.getId());
        item.setBookId(r.getBookId());
        item.setBookTitle(book != null ? book.getTitle() : "N/A");
        item.setAuthor(book != null ? book.getAuthor() : "N/A");
        item.setReservedAt(r.getReservedAt());
        item.setQueuePosition(queuePos);
        item.setVersion(r.getVersion());
        return item;
    }
}
