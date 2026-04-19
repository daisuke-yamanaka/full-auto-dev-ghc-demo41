package com.example.library.dao;

import com.example.library.domain.Loan;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Dao
@ConfigAutowireable
public interface LoanDao {

    @Select
    @Sql("SELECT * FROM loans WHERE id = /* id */0")
    Optional<Loan> findById(Long id);

    @Select
    @Sql("SELECT * FROM loans WHERE user_id = /* userId */0 AND returned_at IS NULL")
    List<Loan> findActiveByUserId(Long userId);

    @Select
    @Sql("SELECT COUNT(*) FROM loans WHERE user_id = /* userId */0 AND returned_at IS NULL")
    int countActiveByUserId(Long userId);

    @Select
    @Sql("SELECT COUNT(*) FROM loans WHERE user_id = /* userId */0 AND returned_at IS NULL AND due_date < CURRENT_DATE")
    int countOverdueByUserId(Long userId);

    @Select
    @Sql("SELECT * FROM loans WHERE user_id = /* userId */0 ORDER BY loaned_at DESC LIMIT /* limit */20 OFFSET /* offset */0")
    List<Loan> findByUserId(Long userId, int limit, int offset);

    @Select
    @Sql("SELECT COUNT(*) FROM loans WHERE user_id = /* userId */0")
    int countByUserId(Long userId);

    @Select
    @Sql("SELECT COUNT(*) FROM loans WHERE book_id = /* bookId */0 AND returned_at IS NULL")
    int countActiveByBookId(Long bookId);

    @Select
    @Sql("SELECT MIN(due_date) FROM loans WHERE book_id = /* bookId */0 AND returned_at IS NULL")
    Optional<LocalDate> findEarliestDueDateByBookId(Long bookId);

    @Select
    @Sql("SELECT * FROM loans WHERE user_id = /* userId */0 AND book_id = /* bookId */0 AND returned_at IS NULL")
    Optional<Loan> findActiveByUserIdAndBookId(Long userId, Long bookId);

    @Insert
    int insert(Loan loan);

    @Update
    int update(Loan loan);

    @Delete
    int delete(Loan loan);
}
