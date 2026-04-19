package com.example.library.service;

import com.example.library.constants.BusinessConstants;
import com.example.library.dao.*;
import com.example.library.domain.*;
import com.example.library.dto.*;
import com.example.library.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    @Mock private LoanDao loanDao;
    @Mock private BookDao bookDao;
    @Mock private UserDao userDao;
    @Mock private ReservationDao reservationDao;
    @Mock private OperationLogDao operationLogDao;

    @InjectMocks
    private LoanService loanService;

    private User testUser;
    private Book testBook;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUserId("user001");
        testUser.setName("テストユーザ");
        testUser.setRole("USER");

        testBook = new Book();
        testBook.setId(10L);
        testBook.setTitle("Java入門");
        testBook.setAuthor("著者A");
        testBook.setTotalCopies(3);
        testBook.setVersion(0L);
    }

    // TC-B001: createLoan 正常系
    @Test
    void createLoan_success() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(2);
        when(loanDao.countOverdueByUserId(1L)).thenReturn(0);
        when(loanDao.countActiveByBookId(10L)).thenReturn(1);
        when(loanDao.findActiveByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        LoanResponse response = loanService.createLoan("user001", request);

        ArgumentCaptor<Loan> loanCaptor = ArgumentCaptor.forClass(Loan.class);
        verify(loanDao).insert(loanCaptor.capture());
        Loan capturedLoan = loanCaptor.getValue();
        assertThat(capturedLoan.getUserId()).isEqualTo(1L);
        assertThat(capturedLoan.getBookId()).isEqualTo(10L);
        assertThat(capturedLoan.getDueDate()).isEqualTo(LocalDate.now().plusDays(BusinessConstants.LOAN_PERIOD_DAYS));

        ArgumentCaptor<OperationLog> logCaptor = ArgumentCaptor.forClass(OperationLog.class);
        verify(operationLogDao).insert(logCaptor.capture());
        assertThat(logCaptor.getValue().getOperationType()).isEqualTo("LOAN");
        assertThat(logCaptor.getValue().getTargetId()).isEqualTo("10");

        assertThat(response.getBookId()).isEqualTo(10L);
        assertThat(response.getBookTitle()).isEqualTo("Java入門");
        assertThat(response.getDueDate()).isEqualTo(LocalDate.now().plusDays(BusinessConstants.LOAN_PERIOD_DAYS));
    }

    // TC-B002: activeLoans=4 境界値（正常）
    @Test
    void createLoan_atLimitBoundary_success() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(4); // MAX-1
        when(loanDao.countOverdueByUserId(1L)).thenReturn(0);
        when(loanDao.countActiveByBookId(10L)).thenReturn(0);
        when(loanDao.findActiveByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        assertThatCode(() -> loanService.createLoan("user001", request))
                .doesNotThrowAnyException();
    }

    // TC-B003: activeLoans=5 境界値（異常）
    @Test
    void createLoan_overLimit_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(5); // MAX

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> loanService.createLoan("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("貸出上限");
    }

    // TC-B004: 延滞あり
    @Test
    void createLoan_withOverdue_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(0);
        when(loanDao.countOverdueByUserId(1L)).thenReturn(1);

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> loanService.createLoan("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("延滞中");
    }

    // TC-B005: 在庫なし
    @Test
    void createLoan_noStock_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(0);
        when(loanDao.countOverdueByUserId(1L)).thenReturn(0);
        when(loanDao.countActiveByBookId(10L)).thenReturn(3); // totalCopies=3

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> loanService.createLoan("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("貸出可能な蔵書がありません");
    }

    // TC-B006: 既に貸出中
    @Test
    void createLoan_alreadyLoaned_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByUserId(1L)).thenReturn(1);
        when(loanDao.countOverdueByUserId(1L)).thenReturn(0);
        when(loanDao.countActiveByBookId(10L)).thenReturn(1);
        Loan existingLoan = new Loan();
        existingLoan.setId(99L);
        when(loanDao.findActiveByUserIdAndBookId(1L, 10L)).thenReturn(Optional.of(existingLoan));

        CreateLoanRequest request = new CreateLoanRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> loanService.createLoan("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("既に貸出中");
    }

    // TC-B007: returnLoan 正常系（予約なし）
    @Test
    void returnLoan_success_noReservation() {
        Loan loan = buildActiveLoan(100L, 1L, 10L, 0L);
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));
        when(reservationDao.findByBookIdOrderByReservedAt(10L)).thenReturn(Collections.emptyList());
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.findById(100L))
                .thenReturn(Optional.of(loan))
                .thenReturn(Optional.of(loan));

        ReturnLoanRequest request = new ReturnLoanRequest();
        request.setVersion(0L);

        ReturnLoanResponse response = loanService.returnLoan(100L, request, "user001");

        ArgumentCaptor<Loan> captor = ArgumentCaptor.forClass(Loan.class);
        verify(loanDao).update(captor.capture());
        assertThat(captor.getValue().getReturnedAt()).isNotNull();

        assertThat(response.getBookId()).isEqualTo(10L);
        assertThat(response.getBookTitle()).isEqualTo("Java入門");
    }

    // TC-B008: returnLoan FR-018 自動貸出（予約連動）
    @Test
    void returnLoan_withReservation_autoLoan() {
        Loan loan = buildActiveLoan(100L, 1L, 10L, 0L);
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        User reservedUser = new User();
        reservedUser.setId(2L);
        reservedUser.setUserId("user002");
        reservedUser.setRole("USER");

        Reservation reservation = new Reservation();
        reservation.setId(50L);
        reservation.setUserId(2L);
        reservation.setBookId(10L);

        when(reservationDao.findByBookIdOrderByReservedAt(10L)).thenReturn(List.of(reservation));
        when(userDao.findById(2L)).thenReturn(Optional.of(reservedUser));
        when(loanDao.countOverdueByUserId(2L)).thenReturn(0);
        when(loanDao.countActiveByUserId(2L)).thenReturn(1); // < MAX
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        ReturnLoanRequest request = new ReturnLoanRequest();
        request.setVersion(0L);

        loanService.returnLoan(100L, request, "user001");

        // 自動貸出のinsert検証
        ArgumentCaptor<Loan> loanCaptor = ArgumentCaptor.forClass(Loan.class);
        verify(loanDao, times(1)).insert(loanCaptor.capture());
        Loan autoLoan = loanCaptor.getValue();
        assertThat(autoLoan.getUserId()).isEqualTo(2L);
        assertThat(autoLoan.getBookId()).isEqualTo(10L);

        // 予約削除検証
        verify(reservationDao).delete(reservation);

        // 自動貸出ログ検証
        ArgumentCaptor<OperationLog> logCaptor = ArgumentCaptor.forClass(OperationLog.class);
        verify(operationLogDao, times(2)).insert(logCaptor.capture());
        List<OperationLog> logs = logCaptor.getAllValues();
        boolean hasAutoLoanLog = logs.stream()
                .anyMatch(l -> "LOAN".equals(l.getOperationType()) && "自動貸出（予約連動）".equals(l.getDetail()));
        assertThat(hasAutoLoanLog).isTrue();
    }

    // TC-B009: returnLoan FR-018 スキップ（予約ユーザが延滞）
    @Test
    void returnLoan_withReservation_overdueUser_skipAutoLoan() {
        Loan loan = buildActiveLoan(100L, 1L, 10L, 0L);
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        User reservedUser = new User();
        reservedUser.setId(2L);
        reservedUser.setUserId("user002");
        reservedUser.setRole("USER");

        Reservation reservation = new Reservation();
        reservation.setId(50L);
        reservation.setUserId(2L);
        reservation.setBookId(10L);

        when(reservationDao.findByBookIdOrderByReservedAt(10L)).thenReturn(List.of(reservation));
        when(userDao.findById(2L)).thenReturn(Optional.of(reservedUser));
        when(loanDao.countOverdueByUserId(2L)).thenReturn(1); // 延滞あり
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        ReturnLoanRequest request = new ReturnLoanRequest();
        request.setVersion(0L);

        loanService.returnLoan(100L, request, "user001");

        // 自動貸出は呼ばれないこと
        verify(loanDao, never()).insert(any());
        verify(reservationDao, never()).delete(any());
    }

    // TC-B010: returnLoan バージョン不一致
    @Test
    void returnLoan_versionMismatch_throwsOptimisticLock() {
        Loan loan = buildActiveLoan(100L, 1L, 10L, 0L);
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        ReturnLoanRequest request = new ReturnLoanRequest();
        request.setVersion(99L); // mismatch

        assertThatThrownBy(() -> loanService.returnLoan(100L, request, "user001"))
                .isInstanceOf(OptimisticLockException.class);
    }

    // TC-B011: returnLoan 既に返却済み
    @Test
    void returnLoan_alreadyReturned_throwsBusinessRuleViolation() {
        Loan loan = buildActiveLoan(100L, 1L, 10L, 0L);
        loan.setReturnedAt(LocalDateTime.now().minusDays(1));
        when(loanDao.findById(100L)).thenReturn(Optional.of(loan));

        ReturnLoanRequest request = new ReturnLoanRequest();
        request.setVersion(0L);

        assertThatThrownBy(() -> loanService.returnLoan(100L, request, "user001"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("既に返却されています");
    }

    // TC-B012: getMyLoans 正常系
    @Test
    void getMyLoans_success() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));

        Loan loan = buildActiveLoan(1L, 1L, 10L, 0L);
        when(loanDao.findByUserId(1L, 10, 0)).thenReturn(List.of(loan));
        when(loanDao.countByUserId(1L)).thenReturn(1);
        when(loanDao.countActiveByUserId(1L)).thenReturn(1);
        when(loanDao.countOverdueByUserId(1L)).thenReturn(0);
        when(bookDao.findByIds(List.of(10L))).thenReturn(List.of(testBook));

        MyLoansResponse response = loanService.getMyLoans("user001", 1, 10);

        assertThat(response.getLoans()).hasSize(1);
        assertThat(response.getTotal()).isEqualTo(1);
        assertThat(response.getCurrentLoanCount()).isEqualTo(1);
        assertThat(response.getRemainingLoanCount()).isEqualTo(BusinessConstants.MAX_LOANS_PER_USER - 1);
        assertThat(response.getIsOverdue()).isFalse();
        assertThat(response.getLoans().get(0).getBookTitle()).isEqualTo("Java入門");
    }

    private Loan buildActiveLoan(Long id, Long userId, Long bookId, Long version) {
        Loan loan = new Loan();
        loan.setId(id);
        loan.setUserId(userId);
        loan.setBookId(bookId);
        loan.setLoanedAt(LocalDateTime.now().minusDays(1));
        loan.setDueDate(LocalDate.now().plusDays(6));
        loan.setVersion(version);
        loan.setCreatedAt(LocalDateTime.now().minusDays(1));
        loan.setUpdatedAt(LocalDateTime.now().minusDays(1));
        return loan;
    }
}
