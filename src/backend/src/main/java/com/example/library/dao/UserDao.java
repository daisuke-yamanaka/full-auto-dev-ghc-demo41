package com.example.library.dao;

import com.example.library.domain.User;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.util.List;
import java.util.Optional;

@Dao
@ConfigAutowireable
public interface UserDao {

    @Select
    @Sql("SELECT * FROM users WHERE id = /* id */0")
    Optional<User> findById(Long id);

    @Select
    @Sql("SELECT * FROM users WHERE user_id = /* userId */''")
    Optional<User> findByUserId(String userId);

    @Select
    @Sql("SELECT * FROM users WHERE email = /* email */''")
    Optional<User> findByEmail(String email);

    @Select
    @Sql("SELECT * FROM users WHERE user_id = /* loginId */'' OR email = /* loginId */''")
    Optional<User> findByUserIdOrEmail(String loginId);

    @Select
    @Sql("SELECT * FROM users ORDER BY id LIMIT /* limit */20 OFFSET /* offset */0")
    List<User> findAll(int limit, int offset);

    @Select
    @Sql("SELECT COUNT(*) FROM users")
    int countAll();

    @Insert
    int insert(User user);

    @Update
    int update(User user);

    @Delete
    int delete(User user);
}
