package com.example.library.service;

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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock private ReservationDao reservationDao;
    @Mock private BookDao bookDao;
    @Mock private UserDao userDao;
    @Mock private LoanDao loanDao;
    @Mock private OperationLogDao operationLogDao;

    @InjectMocks
    private ReservationService reservationService;

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
        testBook.setTotalCopies(2);
        testBook.setVersion(0L);
    }

    // TC-B013: createReservation 正常系
    @Test
    void createReservation_success() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(reservationDao.findByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());
        when(loanDao.findActiveByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());
        when(loanDao.countActiveByBookId(10L)).thenReturn(2); // totalCopies=2 → 全冊貸出中
        when(reservationDao.getQueuePosition(eq(10L), any())).thenReturn(1);

        CreateReservationRequest request = new CreateReservationRequest();
        request.setBookId(10L);

        ReservationResponse response = reservationService.createReservation("user001", request);

        ArgumentCaptor<Reservation> captor = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationDao).insert(captor.capture());
        Reservation captured = captor.getValue();
        assertThat(captured.getUserId()).isEqualTo(1L);
        assertThat(captured.getBookId()).isEqualTo(10L);

        ArgumentCaptor<OperationLog> logCaptor = ArgumentCaptor.forClass(OperationLog.class);
        verify(operationLogDao).insert(logCaptor.capture());
        assertThat(logCaptor.getValue().getOperationType()).isEqualTo("RESERVE");

        assertThat(response.getBookId()).isEqualTo(10L);
        assertThat(response.getBookTitle()).isEqualTo("Java入門");
    }

    // TC-B014: createReservation 既に予約済み
    @Test
    void createReservation_alreadyReserved_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        Reservation existing = new Reservation();
        existing.setId(99L);
        when(reservationDao.findByUserIdAndBookId(1L, 10L)).thenReturn(Optional.of(existing));

        CreateReservationRequest request = new CreateReservationRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> reservationService.createReservation("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("既に予約済みです");
    }

    // TC-B015: createReservation 貸出可能あり
    @Test
    void createReservation_stockAvailable_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(reservationDao.findByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());
        when(loanDao.findActiveByUserIdAndBookId(1L, 10L)).thenReturn(Optional.empty());
        when(loanDao.countActiveByBookId(10L)).thenReturn(1); // totalCopies=2 → 1冊あり

        CreateReservationRequest request = new CreateReservationRequest();
        request.setBookId(10L);

        assertThatThrownBy(() -> reservationService.createReservation("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("貸出可能な蔵書があります");
    }

    // TC-B016: cancelReservation 正常系（本人）
    @Test
    void cancelReservation_byOwner_success() {
        Reservation reservation = buildReservation(50L, 1L, 10L, 0L);
        when(reservationDao.findById(50L)).thenReturn(Optional.of(reservation));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));

        CancelReservationRequest request = new CancelReservationRequest();
        request.setVersion(0L);

        reservationService.cancelReservation(50L, "user001", request);

        verify(reservationDao).delete(reservation);
        ArgumentCaptor<OperationLog> logCaptor = ArgumentCaptor.forClass(OperationLog.class);
        verify(operationLogDao).insert(logCaptor.capture());
        assertThat(logCaptor.getValue().getOperationType()).isEqualTo("CANCEL_RESERVE");
    }

    // TC-B017: cancelReservation 正常系（管理者）
    @Test
    void cancelReservation_byAdmin_success() {
        Reservation reservation = buildReservation(50L, 1L, 10L, 0L);
        when(reservationDao.findById(50L)).thenReturn(Optional.of(reservation));

        User admin = new User();
        admin.setId(99L);
        admin.setUserId("admin");
        admin.setRole("ADMIN");
        when(userDao.findByUserId("admin")).thenReturn(Optional.of(admin));
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));

        CancelReservationRequest request = new CancelReservationRequest();
        request.setVersion(0L);

        reservationService.cancelReservation(50L, "admin", request);

        verify(reservationDao).delete(reservation);
    }

    // TC-B018: cancelReservation 権限なし
    @Test
    void cancelReservation_noPermission_throwsUnauthorized() {
        Reservation reservation = buildReservation(50L, 1L, 10L, 0L);
        when(reservationDao.findById(50L)).thenReturn(Optional.of(reservation));

        User other = new User();
        other.setId(2L);
        other.setUserId("user002");
        other.setRole("USER");
        when(userDao.findByUserId("user002")).thenReturn(Optional.of(other));

        CancelReservationRequest request = new CancelReservationRequest();
        request.setVersion(0L);

        assertThatThrownBy(() -> reservationService.cancelReservation(50L, "user002", request))
                .isInstanceOf(UnauthorizedOperationException.class);
    }

    // TC-B019: cancelReservation バージョン不一致
    @Test
    void cancelReservation_versionMismatch_throwsOptimisticLock() {
        Reservation reservation = buildReservation(50L, 1L, 10L, 0L);
        when(reservationDao.findById(50L)).thenReturn(Optional.of(reservation));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));

        CancelReservationRequest request = new CancelReservationRequest();
        request.setVersion(99L); // mismatch

        assertThatThrownBy(() -> reservationService.cancelReservation(50L, "user001", request))
                .isInstanceOf(OptimisticLockException.class);
    }

    // TC-B020: getMyReservations 正常系
    @Test
    void getMyReservations_success() {
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(testUser));
        Reservation reservation = buildReservation(50L, 1L, 10L, 0L);
        when(reservationDao.findByUserId(1L, 10, 0)).thenReturn(List.of(reservation));
        when(reservationDao.countByUserId(1L)).thenReturn(1);
        when(bookDao.findByIds(List.of(10L))).thenReturn(List.of(testBook));
        when(reservationDao.getQueuePosition(10L, 50L)).thenReturn(1);

        MyReservationsResponse response = reservationService.getMyReservations("user001", 1, 10);

        assertThat(response.getReservations()).hasSize(1);
        assertThat(response.getTotal()).isEqualTo(1);
        assertThat(response.getReservations().get(0).getBookTitle()).isEqualTo("Java入門");
        assertThat(response.getReservations().get(0).getQueuePosition()).isEqualTo(1);
    }

    private Reservation buildReservation(Long id, Long userId, Long bookId, Long version) {
        Reservation r = new Reservation();
        r.setId(id);
        r.setUserId(userId);
        r.setBookId(bookId);
        r.setReservedAt(LocalDateTime.now());
        r.setVersion(version);
        r.setCreatedAt(LocalDateTime.now());
        r.setUpdatedAt(LocalDateTime.now());
        return r;
    }
}
