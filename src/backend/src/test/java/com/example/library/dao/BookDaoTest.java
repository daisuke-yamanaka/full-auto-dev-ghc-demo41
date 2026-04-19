package com.example.library.dao;

import com.example.library.domain.Book;
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
class BookDaoTest {

    @Autowired
    private BookDao bookDao;

    private static long testCounter = 0;

    private Book createTestBook(String suffix) {
        Book book = new Book();
        book.setTitle("TestBook_" + suffix);
        book.setAuthor("テスト著者_" + suffix);
        book.setIsbn("TEST" + suffix);
        book.setPublisher("テスト出版社");
        book.setPublishedYear(2024);
        book.setCategory("プログラミング");
        book.setTotalCopies(2);
        book.setVersion(0L);
        book.setCreatedAt(LocalDateTime.now());
        book.setUpdatedAt(LocalDateTime.now());
        return book;
    }

    // TC-B043: insert & findById
    @Test
    void insertAndFindById() {
        Book book = createTestBook("001");
        bookDao.insert(book);

        assertThat(book.getId()).isNotNull();

        Optional<Book> found = bookDao.findById(book.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("TestBook_001");
        assertThat(found.get().getIsbn()).isEqualTo("TEST001");
        assertThat(found.get().getTotalCopies()).isEqualTo(2);
    }

    // TC-B044: search 動的SQL（全件）
    @Test
    void search_allNull_returnsResults() {
        Book book = createTestBook("002");
        bookDao.insert(book);

        List<Book> results = bookDao.search(null, null, null, null, 100, 0);
        assertThat(results).isNotEmpty();
    }

    // TC-B045: search 動的SQL（タイトル前方一致）- DataInitializerのデータを使用
    @Test
    void search_withTitle_returnsMatchingBook() {
        // DataInitializerが投入した "Java入門" を検索
        List<Book> results = bookDao.search("Java", null, null, null, 10, 0);
        assertThat(results).isNotEmpty();
        assertThat(results.stream().allMatch(b -> b.getTitle().startsWith("Java"))).isTrue();
    }

    // TC-B046: countSearch
    @Test
    void countSearch_matchesSearchResult() {
        Book book = createTestBook("004");
        bookDao.insert(book);

        List<Book> results = bookDao.search("TestBook_004", null, null, null, 100, 0);
        int count = bookDao.countSearch("TestBook_004", null, null, null);
        assertThat(count).isEqualTo(results.size());
    }

    // TC-B047: update & delete
    @Test
    void updateAndDelete() {
        Book book = createTestBook("005");
        bookDao.insert(book);
        Long id = book.getId();

        // update
        book.setTitle("更新タイトル_005");
        book.setUpdatedAt(LocalDateTime.now());
        bookDao.update(book);

        Optional<Book> updated = bookDao.findById(id);
        assertThat(updated).isPresent();
        assertThat(updated.get().getTitle()).isEqualTo("更新タイトル_005");

        // delete
        bookDao.delete(book);
        Optional<Book> deleted = bookDao.findById(id);
        assertThat(deleted).isEmpty();
    }

    // findByIds
    @Test
    void findByIds_returnsAllRequestedBooks() {
        Book b1 = createTestBook("006a");
        Book b2 = createTestBook("006b");
        bookDao.insert(b1);
        bookDao.insert(b2);

        List<Book> results = bookDao.findByIds(List.of(b1.getId(), b2.getId()));
        assertThat(results).hasSize(2);
        assertThat(results.stream().map(Book::getId))
                .containsExactlyInAnyOrder(b1.getId(), b2.getId());
    }

    // search ページネーション - DataInitializerの10冊を使用
    @Test
    void search_pagination() {
        // DataInitializerが投入した10冊に対してページネーション
        int total = bookDao.countSearch(null, null, null, null);
        assertThat(total).isGreaterThanOrEqualTo(3);

        List<Book> page1 = bookDao.search(null, null, null, null, 3, 0);
        assertThat(page1).hasSize(3);

        List<Book> page2 = bookDao.search(null, null, null, null, 3, 3);
        assertThat(page2).hasSizeGreaterThanOrEqualTo(1);
    }
}
