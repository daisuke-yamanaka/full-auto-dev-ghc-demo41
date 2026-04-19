package com.example.library.dao;

import com.example.library.domain.User;
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
class UserDaoTest {

    @Autowired
    private UserDao userDao;

    // TC-B057: insert & findByUserId
    @Test
    void insertAndFindByUserId() {
        User user = buildUser("test_dao_user1_" + System.nanoTime());
        userDao.insert(user);

        assertThat(user.getId()).isNotNull();

        Optional<User> found = userDao.findByUserId(user.getUserId());
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(user.getUserId());
        assertThat(found.get().getRole()).isEqualTo("USER");
    }

    // TC-B058: findByEmail
    @Test
    void findByEmail_success() {
        User user = buildUser("test_dao_user2_" + System.nanoTime());
        userDao.insert(user);

        Optional<User> found = userDao.findByEmail(user.getEmail());
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo(user.getEmail());
    }

    // TC-B059: findByUserIdOrEmail userId検索
    @Test
    void findByUserIdOrEmail_byUserId_success() {
        User user = buildUser("test_dao_user3_" + System.nanoTime());
        userDao.insert(user);

        Optional<User> found = userDao.findByUserIdOrEmail(user.getUserId());
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(user.getUserId());
    }

    // TC-B060: findByUserIdOrEmail email検索
    @Test
    void findByUserIdOrEmail_byEmail_success() {
        User user = buildUser("test_dao_user4_" + System.nanoTime());
        userDao.insert(user);

        Optional<User> found = userDao.findByUserIdOrEmail(user.getEmail());
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo(user.getEmail());
    }

    // TC-B061: findAll ページネーション
    @Test
    void findAll_pagination() {
        int initialCount = userDao.countAll();

        User u1 = buildUser("test_pg_u1_" + System.nanoTime());
        User u2 = buildUser("test_pg_u2_" + System.nanoTime());
        User u3 = buildUser("test_pg_u3_" + System.nanoTime());
        userDao.insert(u1);
        userDao.insert(u2);
        userDao.insert(u3);

        List<User> page1 = userDao.findAll(2, initialCount);
        assertThat(page1).hasSize(2);

        List<User> page2 = userDao.findAll(2, initialCount + 2);
        assertThat(page2).hasSize(1);

        int total = userDao.countAll();
        assertThat(total).isEqualTo(initialCount + 3);
    }

    // findById
    @Test
    void findById_success() {
        User user = buildUser("test_dao_user5_" + System.nanoTime());
        userDao.insert(user);

        Optional<User> found = userDao.findById(user.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(user.getId());
    }

    // update & delete
    @Test
    void updateAndDelete() {
        User user = buildUser("test_dao_user6_" + System.nanoTime());
        userDao.insert(user);
        Long id = user.getId();

        // update
        user.setName("変更後の名前");
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);

        Optional<User> updated = userDao.findById(id);
        assertThat(updated).isPresent();
        assertThat(updated.get().getName()).isEqualTo("変更後の名前");

        // delete
        userDao.delete(user);
        Optional<User> deleted = userDao.findById(id);
        assertThat(deleted).isEmpty();
    }

    // findByUserId 存在しない場合
    @Test
    void findByUserId_notFound_returnsEmpty() {
        Optional<User> found = userDao.findByUserId("nonexistent_user_" + System.nanoTime());
        assertThat(found).isEmpty();
    }

    private User buildUser(String userId) {
        User user = new User();
        user.setUserId(userId);
        user.setEmail(userId + "@test.com");
        user.setName("テストユーザ_" + userId);
        user.setPasswordHash("$2a$10$testhashedpassword");
        user.setRole("USER");
        user.setFontSize("NORMAL");
        user.setVersion(0L);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
