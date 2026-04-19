package com.example.library.dao;

import com.example.library.domain.Book;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.util.List;
import java.util.Optional;

@Dao
@ConfigAutowireable
public interface BookDao {

    @Select
    @Sql("SELECT * FROM books WHERE id = /* id */0")
    Optional<Book> findById(Long id);

    @Select
    @Sql("""
        SELECT * FROM books
        WHERE 1=1
        /*%if title != null*/
        AND title LIKE /* @prefix(title) */'%'
        /*%end*/
        /*%if author != null*/
        AND author LIKE /* @prefix(author) */'%'
        /*%end*/
        /*%if category != null*/
        AND category LIKE /* @prefix(category) */'%'
        /*%end*/
        /*%if isbn != null*/
        AND isbn LIKE /* @prefix(isbn) */'%'
        /*%end*/
        ORDER BY id
        LIMIT /* limit */20 OFFSET /* offset */0
        """)
    List<Book> search(String title, String author, String category, String isbn, int limit, int offset);

    @Select
    @Sql("""
        SELECT COUNT(*) FROM books
        WHERE 1=1
        /*%if title != null*/
        AND title LIKE /* @prefix(title) */'%'
        /*%end*/
        /*%if author != null*/
        AND author LIKE /* @prefix(author) */'%'
        /*%end*/
        /*%if category != null*/
        AND category LIKE /* @prefix(category) */'%'
        /*%end*/
        /*%if isbn != null*/
        AND isbn LIKE /* @prefix(isbn) */'%'
        /*%end*/
        """)
    int countSearch(String title, String author, String category, String isbn);

    @Insert
    int insert(Book book);

    @Update
    int update(Book book);

    @Delete
    int delete(Book book);
}
