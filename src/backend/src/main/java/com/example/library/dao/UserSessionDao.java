package com.example.library.dao;

import com.example.library.domain.UserSession;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.util.List;
import java.util.Optional;

@Dao
@ConfigAutowireable
public interface UserSessionDao {

    @Select
    @Sql("SELECT * FROM user_sessions WHERE token_hash = /* tokenHash */'' AND expires_at > CURRENT_TIMESTAMP")
    Optional<UserSession> findByTokenHash(String tokenHash);

    @Select
    @Sql("SELECT * FROM user_sessions WHERE user_id = /* userId */0")
    List<UserSession> findByUserId(Long userId);

    @Insert
    int insert(UserSession session);

    @Delete
    int delete(UserSession session);

    @BatchDelete
    int[] deleteAll(List<UserSession> sessions);
}
