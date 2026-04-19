package com.example.library.service;

import com.example.library.dao.BookDao;
import com.example.library.dao.LoanDao;
import com.example.library.dao.ReservationDao;
import com.example.library.dao.UserDao;
import com.example.library.domain.Book;
import com.example.library.domain.Loan;
import com.example.library.domain.Reservation;
import com.example.library.dto.*;
import com.example.library.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class BookService {

    private static final String BOOK_NOT_FOUND = "Book not found: ";

    private final BookDao bookDao;
    private final LoanDao loanDao;
    private final ReservationDao reservationDao;
    private final UserDao userDao;

    @Transactional(readOnly = true)
    public BooksResponse searchBooks(String title, String author, String category, String isbn, int page, int size) {
        int offset = (page - 1) * size;
        List<Book> books = bookDao.search(title, author, category, isbn, size, offset);
        int total = bookDao.countSearch(title, author, category, isbn);

        List<BookSummary> summaries = books.stream().map(this::toBookSummary).toList();

        BooksResponse response = new BooksResponse();
        response.setBooks(summaries);
        response.setTotal(total);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

    @Transactional(readOnly = true)
    public BookDetailResponse getBook(Long id, String currentUserId) {
        Book book = bookDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));

        int activeLoanCount = loanDao.countActiveByBookId(id);
        int availableCopies = Math.max(0, book.getTotalCopies() - activeLoanCount);
        int reservationCount = reservationDao.countByBookId(id);

        BookDetailResponse response = new BookDetailResponse();
        response.setId(book.getId());
        response.setTitle(book.getTitle());
        response.setAuthor(book.getAuthor());
        response.setIsbn(book.getIsbn());
        response.setPublisher(book.getPublisher());
        response.setPublishedYear(book.getPublishedYear());
        response.setCategory(book.getCategory());
        response.setTotalCopies(book.getTotalCopies());
        response.setAvailableCopies(availableCopies);
        response.setReservationCount(reservationCount);
        response.setVersion(book.getVersion());

        if (availableCopies == 0) {
            loanDao.findEarliestDueDateByBookId(id).ifPresent(response::setEarliestDueDate);
        }

        if (currentUserId != null) {
            userDao.findByUserId(currentUserId).ifPresent(user -> {
                Optional<Loan> activeLoan = loanDao.findActiveByUserIdAndBookId(user.getId(), id);
                Optional<Reservation> reservation = reservationDao.findByUserIdAndBookId(user.getId(), id);

                if (activeLoan.isPresent()) {
                    response.setCurrentUserStatus("loaned");
                    response.setCurrentUserLoanId(activeLoan.get().getId());
                    response.setCurrentUserLoanVersion(activeLoan.get().getVersion());
                } else if (reservation.isPresent()) {
                    response.setCurrentUserStatus("reserved");
                    response.setCurrentUserReservationId(reservation.get().getId());
                    response.setCurrentUserReservationVersion(reservation.get().getVersion());
                    int queuePos = reservationDao.getQueuePosition(id, reservation.get().getId());
                    response.setCurrentUserQueuePosition(queuePos);
                } else {
                    response.setCurrentUserStatus("none");
                }
            });
        } else {
            response.setCurrentUserStatus("none");
        }

        return response;
    }

    @Transactional
    public AdminBookResponse createBook(CreateBookRequest request) {
        List<Book> existing = bookDao.search(null, null, null, request.getIsbn(), 1, 0);
        if (!existing.isEmpty() && existing.stream().anyMatch(b -> b.getIsbn().equals(request.getIsbn()))) {
            throw new BusinessRuleViolationException("ISBNが既に登録されています: " + request.getIsbn());
        }

        Book book = new Book();
        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setIsbn(request.getIsbn());
        book.setPublisher(request.getPublisher());
        book.setPublishedYear(request.getPublishedYear());
        book.setCategory(request.getCategory());
        book.setTotalCopies(request.getTotalCopies());
        book.setVersion(0L);
        book.setCreatedAt(LocalDateTime.now());
        book.setUpdatedAt(LocalDateTime.now());
        bookDao.insert(book);

        String operator = getOperatorId();
        log.info("図書登録: isbn={}, bookId={}, operator={}", request.getIsbn(), book.getId(), operator);
        return toAdminBookResponse(book, book.getTotalCopies());
    }

    @Transactional
    public AdminBookResponse updateBook(Long id, UpdateBookRequest request) {
        Book book = bookDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));

        if (!book.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("図書情報が更新されています。再読み込みしてください。");
        }

        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setIsbn(request.getIsbn());
        book.setPublisher(request.getPublisher());
        book.setPublishedYear(request.getPublishedYear());
        book.setCategory(request.getCategory());
        book.setTotalCopies(request.getTotalCopies());
        book.setUpdatedAt(LocalDateTime.now());
        bookDao.update(book);

        String operator = getOperatorId();
        log.info("図書更新: bookId={}, operator={}", id, operator);
        Book updated = bookDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));
        int activeLoanCount = loanDao.countActiveByBookId(id);
        int availableCopies = Math.max(0, updated.getTotalCopies() - activeLoanCount);
        return toAdminBookResponse(updated, availableCopies);
    }

    @Transactional
    public void deleteBook(Long id, Long version) {
        Book book = bookDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));

        if (!book.getVersion().equals(version)) {
            throw new OptimisticLockException("図書情報が更新されています。再読み込みしてください。");
        }

        int activeLoanCount = loanDao.countActiveByBookId(id);
        if (activeLoanCount > 0) {
            throw new BusinessRuleViolationException("貸出中の図書は削除できません");
        }

        bookDao.delete(book);
        String operator = getOperatorId();
        log.info("図書削除: bookId={}, operator={}", id, operator);
    }

    private String getOperatorId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
            .getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private BookSummary toBookSummary(Book book) {
        int activeLoanCount = loanDao.countActiveByBookId(book.getId());
        int availableCopies = Math.max(0, book.getTotalCopies() - activeLoanCount);

        BookSummary s = new BookSummary();
        s.setId(book.getId());
        s.setTitle(book.getTitle());
        s.setAuthor(book.getAuthor());
        s.setIsbn(book.getIsbn());
        s.setPublisher(book.getPublisher());
        s.setPublishedYear(book.getPublishedYear());
        s.setCategory(book.getCategory());
        s.setTotalCopies(book.getTotalCopies());
        s.setAvailableCopies(availableCopies);
        s.setVersion(book.getVersion());

        if (availableCopies == 0) {
            loanDao.findEarliestDueDateByBookId(book.getId()).ifPresent(s::setEarliestDueDate);
        }

        return s;
    }

    private AdminBookResponse toAdminBookResponse(Book book, int availableCopies) {
        AdminBookResponse r = new AdminBookResponse();
        r.setId(book.getId());
        r.setTitle(book.getTitle());
        r.setAuthor(book.getAuthor());
        r.setIsbn(book.getIsbn());
        r.setPublisher(book.getPublisher());
        r.setPublishedYear(book.getPublishedYear());
        r.setCategory(book.getCategory());
        r.setTotalCopies(book.getTotalCopies());
        r.setAvailableCopies(availableCopies);
        r.setVersion(book.getVersion());
        return r;
    }
}
