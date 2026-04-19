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
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock private BookDao bookDao;
    @Mock private LoanDao loanDao;
    @Mock private ReservationDao reservationDao;
    @Mock private UserDao userDao;

    @InjectMocks
    private BookService bookService;

    private Book testBook;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        testBook = new Book();
        testBook.setId(10L);
        testBook.setTitle("Java入門");
        testBook.setAuthor("著者A");
        testBook.setIsbn("9784123456789");
        testBook.setPublisher("技術出版");
        testBook.setPublishedYear(2020);
        testBook.setCategory("プログラミング");
        testBook.setTotalCopies(2);
        testBook.setVersion(0L);
    }

    // TC-B021: searchBooks 全件検索
    @Test
    void searchBooks_allNull_success() {
        when(bookDao.search(null, null, null, null, 10, 0)).thenReturn(List.of(testBook));
        when(bookDao.countSearch(null, null, null, null)).thenReturn(1);
        when(loanDao.countActiveByBookId(10L)).thenReturn(0);

        BooksResponse response = bookService.searchBooks(null, null, null, null, 1, 10);

        assertThat(response.getBooks()).hasSize(1);
        assertThat(response.getTotal()).isEqualTo(1);
        assertThat(response.getBooks().get(0).getAvailableCopies()).isEqualTo(2);
    }

    // TC-B022: searchBooks タイトル指定
    @Test
    void searchBooks_withTitle_callsSearchWithTitle() {
        when(bookDao.search("Java", null, null, null, 10, 0)).thenReturn(List.of(testBook));
        when(bookDao.countSearch("Java", null, null, null)).thenReturn(1);
        when(loanDao.countActiveByBookId(10L)).thenReturn(0);

        BooksResponse response = bookService.searchBooks("Java", null, null, null, 1, 10);

        verify(bookDao).search("Java", null, null, null, 10, 0);
        assertThat(response.getBooks()).hasSize(1);
    }

    // TC-B023: getBook 正常系
    @Test
    void getBook_success() {
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByBookId(10L)).thenReturn(1);
        when(reservationDao.countByBookId(10L)).thenReturn(2);

        BookDetailResponse response = bookService.getBook(10L, null);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getTitle()).isEqualTo("Java入門");
        assertThat(response.getAvailableCopies()).isEqualTo(1); // totalCopies=2 - active=1
        assertThat(response.getReservationCount()).isEqualTo(2);
        assertThat(response.getCurrentUserStatus()).isEqualTo("none");
    }

    // TC-B024: getBook 存在しない
    @Test
    void getBook_notFound_throwsResourceNotFoundException() {
        when(bookDao.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.getBook(999L, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // TC-B025: createBook 正常系
    @Test
    void createBook_success() {
        when(bookDao.search(null, null, null, "9784999999999", 1, 0)).thenReturn(Collections.emptyList());

        CreateBookRequest request = new CreateBookRequest();
        request.setTitle("新しい図書");
        request.setAuthor("著者B");
        request.setIsbn("9784999999999");
        request.setPublisher("出版社B");
        request.setPublishedYear(2024);
        request.setCategory("Web開発");
        request.setTotalCopies(3);

        bookService.createBook(request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookDao).insert(captor.capture());
        Book captured = captor.getValue();
        assertThat(captured.getTitle()).isEqualTo("新しい図書");
        assertThat(captured.getIsbn()).isEqualTo("9784999999999");
        assertThat(captured.getTotalCopies()).isEqualTo(3);
        assertThat(captured.getVersion()).isEqualTo(0L);
    }

    // TC-B026: createBook ISBN重複
    @Test
    void createBook_duplicateIsbn_throwsBusinessRuleViolation() {
        when(bookDao.search(null, null, null, "9784123456789", 1, 0)).thenReturn(List.of(testBook));

        CreateBookRequest request = new CreateBookRequest();
        request.setTitle("重複図書");
        request.setAuthor("著者");
        request.setIsbn("9784123456789");
        request.setTotalCopies(1);

        assertThatThrownBy(() -> bookService.createBook(request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("ISBNが既に登録されています");
    }

    // TC-B027: updateBook 正常系
    @Test
    void updateBook_success() {
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByBookId(10L)).thenReturn(0);

        UpdateBookRequest request = new UpdateBookRequest();
        request.setTitle("更新タイトル");
        request.setAuthor("著者A");
        request.setIsbn("9784123456789");
        request.setPublisher("技術出版");
        request.setPublishedYear(2021);
        request.setCategory("プログラミング");
        request.setTotalCopies(5);
        request.setVersion(0L);

        bookService.updateBook(10L, request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookDao).update(captor.capture());
        assertThat(captor.getValue().getTitle()).isEqualTo("更新タイトル");
        assertThat(captor.getValue().getTotalCopies()).isEqualTo(5);
    }

    // TC-B028: updateBook バージョン不一致
    @Test
    void updateBook_versionMismatch_throwsOptimisticLock() {
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));

        UpdateBookRequest request = new UpdateBookRequest();
        request.setTitle("更新タイトル");
        request.setAuthor("著者A");
        request.setIsbn("9784123456789");
        request.setVersion(99L); // mismatch

        assertThatThrownBy(() -> bookService.updateBook(10L, request))
                .isInstanceOf(OptimisticLockException.class);
    }

    // TC-B029: deleteBook 正常系
    @Test
    void deleteBook_success() {
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByBookId(10L)).thenReturn(0);

        bookService.deleteBook(10L, 0L);

        verify(bookDao).delete(testBook);
    }

    // TC-B030: deleteBook 貸出中
    @Test
    void deleteBook_withActiveLoans_throwsBusinessRuleViolation() {
        when(bookDao.findById(10L)).thenReturn(Optional.of(testBook));
        when(loanDao.countActiveByBookId(10L)).thenReturn(1);

        assertThatThrownBy(() -> bookService.deleteBook(10L, 0L))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("貸出中の図書は削除できません");
    }
}
