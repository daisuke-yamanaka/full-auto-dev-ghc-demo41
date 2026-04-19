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

    @Insert
    int insert(OperationLog log);
}
