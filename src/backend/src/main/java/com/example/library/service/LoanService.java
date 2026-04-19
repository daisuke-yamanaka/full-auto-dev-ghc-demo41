package com.example.library.service;

import com.example.library.constants.BusinessConstants;
import com.example.library.dao.*;
import com.example.library.domain.*;
import com.example.library.dto.*;
import com.example.library.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LoanService {

    private final LoanDao loanDao;
    private final BookDao bookDao;
    private final UserDao userDao;
    private final ReservationDao reservationDao;
    private final OperationLogDao operationLogDao;

    @Transactional(readOnly = true)
    public MyLoansResponse getMyLoans(String userId, int page, int size) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        int offset = (page - 1) * size;
        List<Loan> loans = loanDao.findByUserId(user.getId(), size, offset);
        int total = loanDao.countByUserId(user.getId());
        int activeCount = loanDao.countActiveByUserId(user.getId());
        boolean isOverdue = loanDao.countOverdueByUserId(user.getId()) > 0;

        List<LoanItem> items = loans.stream().map(loan -> {
            Book book = bookDao.findById(loan.getBookId()).orElse(null);
            return toLoanItem(loan, book);
        }).collect(Collectors.toList());

        MyLoansResponse response = new MyLoansResponse();
        response.setCurrentLoanCount(activeCount);
        response.setRemainingLoanCount(Math.max(0, BusinessConstants.MAX_LOANS_PER_USER - activeCount));
        response.setIsOverdue(isOverdue);
        response.setLoans(items);
        response.setTotal(total);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

    @Transactional
    public LoanResponse createLoan(String userId, CreateLoanRequest request) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Book book = bookDao.findById(request.getBookId())
            .orElseThrow(() -> new ResourceNotFoundException("Book not found: " + request.getBookId()));

        int activeLoans = loanDao.countActiveByUserId(user.getId());
        if (activeLoans >= BusinessConstants.MAX_LOANS_PER_USER) {
            throw new BusinessRuleViolationException("貸出上限（" + BusinessConstants.MAX_LOANS_PER_USER + "冊）に達しています");
        }

        if (loanDao.countOverdueByUserId(user.getId()) > 0) {
            throw new BusinessRuleViolationException("延滞中の図書があります。返却してから貸出してください。");
        }

        int activeLoanCount = loanDao.countActiveByBookId(book.getId());
        if (activeLoanCount >= book.getTotalCopies()) {
            throw new BusinessRuleViolationException("貸出可能な蔵書がありません");
        }

        if (loanDao.findActiveByUserIdAndBookId(user.getId(), book.getId()).isPresent()) {
            throw new BusinessRuleViolationException("この図書は既に貸出中です");
        }

        Loan loan = new Loan();
        loan.setUserId(user.getId());
        loan.setBookId(book.getId());
        loan.setLoanedAt(LocalDateTime.now());
        loan.setDueDate(LocalDate.now().plusDays(BusinessConstants.LOAN_PERIOD_DAYS));
        loan.setVersion(0L);
        loan.setCreatedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());
        loanDao.insert(loan);

        OperationLog opLog = new OperationLog();
        opLog.setUserId(user.getId());
        opLog.setOperationType("LOAN");
        opLog.setTargetType("BOOK");
        opLog.setTargetId(book.getId().toString());
        opLog.setDetail(book.getTitle());
        opLog.setCreatedAt(LocalDateTime.now());
        operationLogDao.insert(opLog);

        log.info("図書貸出: bookId={}, userId={}", book.getId(), userId);

        LoanResponse response = new LoanResponse();
        response.setId(loan.getId());
        response.setBookId(book.getId());
        response.setBookTitle(book.getTitle());
        response.setLoanedAt(loan.getLoanedAt());
        response.setDueDate(loan.getDueDate());
        response.setVersion(loan.getVersion());
        return response;
    }

    @Transactional
    public ReturnLoanResponse returnLoan(Long loanId, ReturnLoanRequest request, String operatorUserId) {
        Loan loan = loanDao.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        if (!loan.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("貸出情報が更新されています。再読み込みしてください。");
        }

        if (loan.getReturnedAt() != null) {
            throw new BusinessRuleViolationException("この図書は既に返却されています");
        }

        loan.setReturnedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());
        loanDao.update(loan);

        Long bookId = loan.getBookId();
        List<Reservation> reservationQueue = reservationDao.findByBookIdOrderByReservedAt(bookId);

        for (Reservation reservation : reservationQueue) {
            User reservedUser = userDao.findById(reservation.getUserId()).orElse(null);
            if (reservedUser == null) continue;

            boolean isOverdue = loanDao.countOverdueByUserId(reservedUser.getId()) > 0;
            int activeLoans = loanDao.countActiveByUserId(reservedUser.getId());

            if (!isOverdue && activeLoans < BusinessConstants.MAX_LOANS_PER_USER) {
                Loan autoLoan = new Loan();
                autoLoan.setUserId(reservedUser.getId());
                autoLoan.setBookId(bookId);
                autoLoan.setLoanedAt(LocalDateTime.now());
                autoLoan.setDueDate(LocalDate.now().plusDays(BusinessConstants.LOAN_PERIOD_DAYS));
                autoLoan.setVersion(0L);
                autoLoan.setCreatedAt(LocalDateTime.now());
                autoLoan.setUpdatedAt(LocalDateTime.now());
                loanDao.insert(autoLoan);

                reservationDao.delete(reservation);

                log.info("自動貸出: bookId={}, userId={}", bookId, reservedUser.getUserId());
                break;
            }
        }

        User operator = userDao.findByUserId(operatorUserId).orElse(null);
        OperationLog opLog = new OperationLog();
        opLog.setUserId(operator != null ? operator.getId() : null);
        opLog.setOperationType("RETURN");
        opLog.setTargetType("LOAN");
        opLog.setTargetId(loanId.toString());
        opLog.setCreatedAt(LocalDateTime.now());
        operationLogDao.insert(opLog);

        log.info("図書返却: loanId={}, operator={}", loanId, operatorUserId);

        Book book = bookDao.findById(bookId)
            .orElseThrow(() -> new ResourceNotFoundException("Book not found: " + bookId));
        Loan updated = loanDao.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        ReturnLoanResponse response = new ReturnLoanResponse();
        response.setId(updated.getId());
        response.setBookId(bookId);
        response.setBookTitle(book.getTitle());
        response.setReturnedAt(updated.getReturnedAt());
        response.setVersion(updated.getVersion());
        return response;
    }

    private LoanItem toLoanItem(Loan loan, Book book) {
        LoanItem item = new LoanItem();
        item.setLoanId(loan.getId());
        item.setBookId(loan.getBookId());
        item.setBookTitle(book != null ? book.getTitle() : "N/A");
        item.setAuthor(book != null ? book.getAuthor() : "N/A");
        item.setLoanedAt(loan.getLoanedAt());
        item.setDueDate(loan.getDueDate());
        item.setReturnedAt(loan.getReturnedAt());
        item.setVersion(loan.getVersion());

        if (loan.getReturnedAt() != null) {
            item.setStatus("RETURNED");
            item.setIsOverdue(false);
        } else if (loan.getDueDate().isBefore(LocalDate.now())) {
            item.setStatus("OVERDUE");
            item.setIsOverdue(true);
        } else {
            item.setStatus("ACTIVE");
            item.setIsOverdue(false);
        }

        return item;
    }
}
