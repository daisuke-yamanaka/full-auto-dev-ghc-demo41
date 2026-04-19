package com.example.library.dao;

import com.example.library.domain.OperationLog;
import org.seasar.doma.*;
import org.seasar.doma.boot.ConfigAutowireable;
import java.util.List;

@Dao
@ConfigAutowireable
public interface OperationLogDao {

    @Select
    @Sql("SELECT * FROM operation_logs WHERE user_id = /* userId */0 AND operation_type IN ('LOAN', 'RETURN', 'RESERVE') ORDER BY created_at DESC LIMIT /* limit */20")
    List<OperationLog> findRecentByUserId(Long userId, int limit);

    @Select
    @Sql("SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT /* limit */20 OFFSET /* offset */0")
    List<OperationLog> findAll(int limit, int offset);

    @Select
    @Sql("SELECT COUNT(*) FROM operation_logs")
    long countAll();

    @Insert
    int insert(OperationLog log);
}
