package com.example.library.dao;

import com.example.library.domain.Reservation;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.util.List;
import java.util.Optional;

@Dao
@ConfigAutowireable
public interface ReservationDao {

    @Select
    @Sql("SELECT * FROM reservations WHERE id = /* id */0")
    Optional<Reservation> findById(Long id);

    @Select
    @Sql("SELECT * FROM reservations WHERE user_id = /* userId */0 ORDER BY reserved_at DESC LIMIT /* limit */20 OFFSET /* offset */0")
    List<Reservation> findByUserId(Long userId, int limit, int offset);

    @Select
    @Sql("SELECT COUNT(*) FROM reservations WHERE user_id = /* userId */0")
    int countByUserId(Long userId);

    @Select
    @Sql("SELECT * FROM reservations WHERE book_id = /* bookId */0 ORDER BY reserved_at ASC")
    List<Reservation> findByBookIdOrderByReservedAt(Long bookId);

    @Select
    @Sql("SELECT COUNT(*) FROM reservations WHERE book_id = /* bookId */0")
    int countByBookId(Long bookId);

    @Select
    @Sql("SELECT * FROM reservations WHERE user_id = /* userId */0 AND book_id = /* bookId */0")
    Optional<Reservation> findByUserIdAndBookId(Long userId, Long bookId);

    @Select
    @Sql("""
        SELECT COUNT(*) + 1 FROM reservations
        WHERE book_id = /* bookId */0
        AND reserved_at < (SELECT reserved_at FROM reservations WHERE id = /* reservationId */0)
        """)
    int getQueuePosition(Long bookId, Long reservationId);

    @Insert
    int insert(Reservation reservation);

    @Update
    int update(Reservation reservation);

    @Delete
    int delete(Reservation reservation);
}
