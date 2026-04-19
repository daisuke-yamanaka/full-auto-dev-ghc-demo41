package com.example.library.dao;

import com.example.library.domain.Book;
import com.example.library.domain.Reservation;
import com.example.library.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
@TestPropertySource(properties = {"JWT_SECRET=testjwtsecretkey12345678901234567890abcdefgh"})
class ReservationDaoTest {

    @Autowired private ReservationDao reservationDao;
    @Autowired private UserDao userDao;
    @Autowired private BookDao bookDao;

    private User testUser1;
    private User testUser2;
    private Book testBook;

    @BeforeEach
    void setUp() {
        testUser1 = createUser("res_user1_" + System.nanoTime());
        testUser2 = createUser("res_user2_" + System.nanoTime());
        userDao.insert(testUser1);
        userDao.insert(testUser2);

        testBook = new Book();
        testBook.setTitle("予約テスト図書_" + System.nanoTime());
        testBook.setAuthor("予約著者");
        testBook.setIsbn("RT" + (System.nanoTime() % 99999999999L));
        testBook.setPublisher("テスト出版");
        testBook.setPublishedYear(2024);
        testBook.setCategory("テスト");
        testBook.setTotalCopies(1);
        testBook.setVersion(0L);
        testBook.setCreatedAt(LocalDateTime.now());
        testBook.setUpdatedAt(LocalDateTime.now());
        bookDao.insert(testBook);
    }

    // TC-B053: insert & findById
    @Test
    void insertAndFindById() {
        Reservation reservation = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        reservationDao.insert(reservation);

        assertThat(reservation.getId()).isNotNull();

        Optional<Reservation> found = reservationDao.findById(reservation.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(testUser1.getId());
        assertThat(found.get().getBookId()).isEqualTo(testBook.getId());
    }

    // TC-B054: findByUserIdAndBookId
    @Test
    void findByUserIdAndBookId_exists_isPresent() {
        Reservation reservation = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        reservationDao.insert(reservation);

        Optional<Reservation> found = reservationDao.findByUserIdAndBookId(testUser1.getId(), testBook.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(reservation.getId());
    }

    @Test
    void findByUserIdAndBookId_notExists_isEmpty() {
        Optional<Reservation> found = reservationDao.findByUserIdAndBookId(testUser1.getId(), testBook.getId());
        assertThat(found).isEmpty();
    }

    // TC-B055: getQueuePosition
    @Test
    void getQueuePosition_firstReserver_positionOne() throws InterruptedException {
        Reservation r1 = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        Thread.sleep(10);
        Reservation r2 = buildReservation(testUser2.getId(), testBook.getId(), LocalDateTime.now().plusNanos(1_000_000));
        reservationDao.insert(r1);
        reservationDao.insert(r2);

        int pos1 = reservationDao.getQueuePosition(testBook.getId(), r1.getId());
        int pos2 = reservationDao.getQueuePosition(testBook.getId(), r2.getId());

        assertThat(pos1).isEqualTo(1);
        assertThat(pos2).isEqualTo(2);
    }

    // TC-B056: findByBookIdOrderByReservedAt
    @Test
    void findByBookIdOrderByReservedAt_orderedAscending() throws InterruptedException {
        LocalDateTime time1 = LocalDateTime.now();
        Thread.sleep(10);
        LocalDateTime time2 = LocalDateTime.now().plusNanos(1_000_000);

        Reservation r1 = buildReservation(testUser1.getId(), testBook.getId(), time1);
        Reservation r2 = buildReservation(testUser2.getId(), testBook.getId(), time2);
        reservationDao.insert(r1);
        reservationDao.insert(r2);

        List<Reservation> list = reservationDao.findByBookIdOrderByReservedAt(testBook.getId());
        assertThat(list).hasSizeGreaterThanOrEqualTo(2);

        // Reserved_at 昇順
        List<Reservation> testReservations = list.stream()
                .filter(r -> r.getId().equals(r1.getId()) || r.getId().equals(r2.getId()))
                .toList();
        assertThat(testReservations.get(0).getId()).isEqualTo(r1.getId());
        assertThat(testReservations.get(1).getId()).isEqualTo(r2.getId());
    }

    // countByBookId
    @Test
    void countByBookId_afterInsert_returnsCorrectCount() {
        Reservation r1 = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        Reservation r2 = buildReservation(testUser2.getId(), testBook.getId(), LocalDateTime.now().plusSeconds(1));
        reservationDao.insert(r1);
        reservationDao.insert(r2);

        int count = reservationDao.countByBookId(testBook.getId());
        assertThat(count).isEqualTo(2);
    }

    // findByUserId ページネーション
    @Test
    void findByUserId_pagination() {
        Reservation r1 = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        reservationDao.insert(r1);

        List<Reservation> results = reservationDao.findByUserId(testUser1.getId(), 10, 0);
        assertThat(results).hasSizeGreaterThanOrEqualTo(1);

        int count = reservationDao.countByUserId(testUser1.getId());
        assertThat(count).isGreaterThanOrEqualTo(1);
    }

    // delete
    @Test
    void delete_removesReservation() {
        Reservation reservation = buildReservation(testUser1.getId(), testBook.getId(), LocalDateTime.now());
        reservationDao.insert(reservation);

        reservationDao.delete(reservation);

        Optional<Reservation> found = reservationDao.findById(reservation.getId());
        assertThat(found).isEmpty();
    }

    private Reservation buildReservation(Long userId, Long bookId, LocalDateTime reservedAt) {
        Reservation r = new Reservation();
        r.setUserId(userId);
        r.setBookId(bookId);
        r.setReservedAt(reservedAt);
        r.setVersion(0L);
        r.setCreatedAt(LocalDateTime.now());
        r.setUpdatedAt(LocalDateTime.now());
        return r;
    }

    private User createUser(String userId) {
        User user = new User();
        user.setUserId(userId);
        user.setEmail(userId + "@test.com");
        user.setName("テスト " + userId);
        user.setPasswordHash("$2a$10$dummy");
        user.setRole("USER");
        user.setFontSize("NORMAL");
        user.setVersion(0L);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
