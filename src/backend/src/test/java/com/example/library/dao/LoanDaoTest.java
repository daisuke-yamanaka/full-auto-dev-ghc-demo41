package com.example.library.dao;

import com.example.library.domain.Book;
import com.example.library.domain.Loan;
import com.example.library.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
@TestPropertySource(properties = {"JWT_SECRET=testjwtsecretkey12345678901234567890abcdefgh"})
class LoanDaoTest {

    @Autowired private LoanDao loanDao;
    @Autowired private UserDao userDao;
    @Autowired private BookDao bookDao;

    private User testUser;
    private Book testBook;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId("loan_test_user_" + System.nanoTime());
        testUser.setEmail("loantest_" + System.nanoTime() + "@test.com");
        testUser.setName("貸出テストユーザ");
        testUser.setPasswordHash("$2a$10$dummy");
        testUser.setRole("USER");
        testUser.setFontSize("NORMAL");
        testUser.setVersion(0L);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());
        userDao.insert(testUser);

        testBook = new Book();
        testBook.setTitle("貸出テスト図書_" + System.nanoTime());
        testBook.setAuthor("貸出著者");
        testBook.setIsbn("LT" + (System.nanoTime() % 99999999999L));
        testBook.setPublisher("テスト出版");
        testBook.setPublishedYear(2024);
        testBook.setCategory("テスト");
        testBook.setTotalCopies(3);
        testBook.setVersion(0L);
        testBook.setCreatedAt(LocalDateTime.now());
        testBook.setUpdatedAt(LocalDateTime.now());
        bookDao.insert(testBook);
    }

    // TC-B048: insert & findById
    @Test
    void insertAndFindById() {
        Loan loan = buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().plusDays(7));
        loanDao.insert(loan);

        assertThat(loan.getId()).isNotNull();

        Optional<Loan> found = loanDao.findById(loan.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(testUser.getId());
        assertThat(found.get().getBookId()).isEqualTo(testBook.getId());
        assertThat(found.get().getDueDate()).isEqualTo(LocalDate.now().plusDays(7));
        assertThat(found.get().getReturnedAt()).isNull();
    }

    // TC-B049: countActiveByUserId
    @Test
    void countActiveByUserId_returnsCorrectCount() {
        // 2件の未返却貸出を追加
        Loan loan1 = buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().plusDays(7));
        loanDao.insert(loan1);

        Book testBook2 = new Book();
        testBook2.setTitle("追加テスト図書");
        testBook2.setAuthor("著者");
        testBook2.setIsbn("LT2" + (System.nanoTime() % 9999999999L));
        testBook2.setPublisher("出版");
        testBook2.setPublishedYear(2024);
        testBook2.setCategory("テスト");
        testBook2.setTotalCopies(1);
        testBook2.setVersion(0L);
        testBook2.setCreatedAt(LocalDateTime.now());
        testBook2.setUpdatedAt(LocalDateTime.now());
        bookDao.insert(testBook2);

        Loan loan2 = buildLoan(testUser.getId(), testBook2.getId(), LocalDate.now().plusDays(7));
        loanDao.insert(loan2);

        int count = loanDao.countActiveByUserId(testUser.getId());
        assertThat(count).isEqualTo(2);
    }

    // TC-B050: countOverdueByUserId
    @Test
    void countOverdueByUserId_overdueLoan_returnsPositive() {
        Loan overdueLoan = buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().minusDays(1));
        loanDao.insert(overdueLoan);

        int count = loanDao.countOverdueByUserId(testUser.getId());
        assertThat(count).isGreaterThanOrEqualTo(1);
    }

    // TC-B051: findActiveByUserIdAndBookId
    @Test
    void findActiveByUserIdAndBookId_activeLoan_isPresent() {
        Loan loan = buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().plusDays(7));
        loanDao.insert(loan);

        Optional<Loan> found = loanDao.findActiveByUserIdAndBookId(testUser.getId(), testBook.getId());
        assertThat(found).isPresent();
    }

    @Test
    void findActiveByUserIdAndBookId_returnedLoan_isEmpty() {
        Loan loan = buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().plusDays(7));
        loan.setReturnedAt(LocalDateTime.now());
        loanDao.insert(loan);

        Optional<Loan> found = loanDao.findActiveByUserIdAndBookId(testUser.getId(), testBook.getId());
        assertThat(found).isEmpty();
    }

    // TC-B052: findEarliestDueDateByBookId
    @Test
    void findEarliestDueDateByBookId_returnsEarliestDate() {
        User user2 = new User();
        user2.setUserId("loan_test_u2_" + System.nanoTime());
        user2.setEmail("loantst2_" + System.nanoTime() + "@test.com");
        user2.setName("テスト2");
        user2.setPasswordHash("$2a$10$dummy");
        user2.setRole("USER");
        user2.setFontSize("NORMAL");
        user2.setVersion(0L);
        user2.setCreatedAt(LocalDateTime.now());
        user2.setUpdatedAt(LocalDateTime.now());
        userDao.insert(user2);

        LocalDate nearDate = LocalDate.now().plusDays(3);
        LocalDate farDate = LocalDate.now().plusDays(10);

        Loan loan1 = buildLoan(testUser.getId(), testBook.getId(), nearDate);
        Loan loan2 = buildLoan(user2.getId(), testBook.getId(), farDate);
        loanDao.insert(loan1);
        loanDao.insert(loan2);

        Optional<LocalDate> earliest = loanDao.findEarliestDueDateByBookId(testBook.getId());
        assertThat(earliest).isPresent();
        assertThat(earliest.get()).isEqualTo(nearDate);
    }

    // findByUserId ページネーション
    @Test
    void findByUserId_pagination() {
        Book b2 = new Book();
        b2.setTitle("追加本");
        b2.setAuthor("A");
        b2.setIsbn("PG" + (System.nanoTime() % 99999999999L));
        b2.setPublisher("P");
        b2.setPublishedYear(2024);
        b2.setCategory("T");
        b2.setTotalCopies(1);
        b2.setVersion(0L);
        b2.setCreatedAt(LocalDateTime.now());
        b2.setUpdatedAt(LocalDateTime.now());
        bookDao.insert(b2);

        loanDao.insert(buildLoan(testUser.getId(), testBook.getId(), LocalDate.now().plusDays(7)));
        loanDao.insert(buildLoan(testUser.getId(), b2.getId(), LocalDate.now().plusDays(7)));

        List<Loan> all = loanDao.findByUserId(testUser.getId(), 100, 0);
        assertThat(all.size()).isGreaterThanOrEqualTo(2);

        List<Loan> page1 = loanDao.findByUserId(testUser.getId(), 1, 0);
        assertThat(page1).hasSize(1);

        int count = loanDao.countByUserId(testUser.getId());
        assertThat(count).isGreaterThanOrEqualTo(2);
    }

    private Loan buildLoan(Long userId, Long bookId, LocalDate dueDate) {
        Loan loan = new Loan();
        loan.setUserId(userId);
        loan.setBookId(bookId);
        loan.setLoanedAt(LocalDateTime.now());
        loan.setDueDate(dueDate);
        loan.setVersion(0L);
        loan.setCreatedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());
        return loan;
    }
}
