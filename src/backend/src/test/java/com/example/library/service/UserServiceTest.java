package com.example.library.service;

import com.example.library.dao.UserDao;
import com.example.library.domain.User;
import com.example.library.dto.*;
import com.example.library.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserDao userDao;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(userService, "passwordEncoder", passwordEncoder);
    }

    // TC-B035: getUsers 正常系
    @Test
    void getUsers_success() {
        User u1 = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        User u2 = buildUser(2L, "user002", "u2@test.com", "USER", 0L);
        when(userDao.findAll(10, 0)).thenReturn(List.of(u1, u2));
        when(userDao.countAll()).thenReturn(2);

        UsersResponse response = userService.getUsers(1, 10);

        assertThat(response.getUsers()).hasSize(2);
        assertThat(response.getTotal()).isEqualTo(2);
        assertThat(response.getUsers().get(0).getUserId()).isEqualTo("user001");
    }

    // TC-B036: createUser 正常系
    @Test
    void createUser_success() {
        when(userDao.findByUserId("newuser")).thenReturn(Optional.empty());
        when(userDao.findByEmail("new@test.com")).thenReturn(Optional.empty());

        CreateUserRequest request = new CreateUserRequest();
        request.setUserId("newuser");
        request.setEmail("new@test.com");
        request.setName("新ユーザ");
        request.setRole("USER");
        request.setPassword("password123");

        userService.createUser(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userDao).insert(captor.capture());
        User captured = captor.getValue();
        assertThat(captured.getUserId()).isEqualTo("newuser");
        assertThat(captured.getEmail()).isEqualTo("new@test.com");
        assertThat(captured.getRole()).isEqualTo("USER");
        assertThat(captured.getPasswordHash()).isNotEqualTo("password123"); // hashed
        assertThat(passwordEncoder.matches("password123", captured.getPasswordHash())).isTrue();
    }

    // TC-B037: createUser userId重複
    @Test
    void createUser_duplicateUserId_throwsBusinessRuleViolation() {
        User existing = buildUser(1L, "existing", "e@test.com", "USER", 0L);
        when(userDao.findByUserId("existing")).thenReturn(Optional.of(existing));

        CreateUserRequest request = new CreateUserRequest();
        request.setUserId("existing");
        request.setEmail("other@test.com");
        request.setName("テスト");
        request.setPassword("pass");

        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("ユーザIDが既に使用されています");
    }

    // TC-B038: createUser email重複
    @Test
    void createUser_duplicateEmail_throwsBusinessRuleViolation() {
        when(userDao.findByUserId("newuser")).thenReturn(Optional.empty());
        User existing = buildUser(1L, "user001", "dup@test.com", "USER", 0L);
        when(userDao.findByEmail("dup@test.com")).thenReturn(Optional.of(existing));

        CreateUserRequest request = new CreateUserRequest();
        request.setUserId("newuser");
        request.setEmail("dup@test.com");
        request.setName("テスト");
        request.setPassword("pass");

        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("メールアドレスが既に使用されています");
    }

    // TC-B039: changePassword 正常系
    @Test
    void changePassword_success() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        user.setPasswordHash(passwordEncoder.encode("oldpass"));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpass");
        request.setNewPassword("newpass123");
        request.setConfirmPassword("newpass123");

        userService.changePassword("user001", request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userDao).update(captor.capture());
        assertThat(passwordEncoder.matches("newpass123", captor.getValue().getPasswordHash())).isTrue();
    }

    // TC-B040: changePassword 現在パスワード不一致
    @Test
    void changePassword_wrongCurrentPassword_throwsBadCredentials() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        user.setPasswordHash(passwordEncoder.encode("correctpass"));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrongpass");
        request.setNewPassword("newpass");
        request.setConfirmPassword("newpass");

        assertThatThrownBy(() -> userService.changePassword("user001", request))
                .isInstanceOf(BadCredentialsException.class);
    }

    // TC-B041: changePassword 新パスワード確認不一致
    @Test
    void changePassword_confirmMismatch_throwsBusinessRuleViolation() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        user.setPasswordHash(passwordEncoder.encode("oldpass"));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpass");
        request.setNewPassword("newpass1");
        request.setConfirmPassword("newpass2"); // mismatch

        assertThatThrownBy(() -> userService.changePassword("user001", request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("一致しません");
    }

    // TC-B042: getProfile 正常系
    @Test
    void getProfile_success() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        user.setFontSize("NORMAL");
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));

        ProfileResponse response = userService.getProfile("user001");

        assertThat(response.getUserId()).isEqualTo("user001");
        assertThat(response.getEmail()).isEqualTo("u1@test.com");
        assertThat(response.getRole()).isEqualTo("USER");
    }

    // updateUser 正常系
    @Test
    void updateUser_success() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        when(userDao.findById(1L)).thenReturn(Optional.of(user));
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));
        when(userDao.findByEmail("u1@test.com")).thenReturn(Optional.of(user));

        UpdateUserRequest request = new UpdateUserRequest();
        request.setUserId("user001");
        request.setEmail("u1@test.com");
        request.setName("変更後");
        request.setRole("USER");
        request.setVersion(0L);

        userService.updateUser(1L, request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userDao).update(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("変更後");
    }

    // deleteUser 正常系
    @Test
    void deleteUser_success() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        when(userDao.findById(1L)).thenReturn(Optional.of(user));

        userService.deleteUser(1L, 0L);

        verify(userDao).delete(user);
    }

    // deleteUser バージョン不一致
    @Test
    void deleteUser_versionMismatch_throwsOptimisticLock() {
        User user = buildUser(1L, "user001", "u1@test.com", "USER", 0L);
        when(userDao.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.deleteUser(1L, 99L))
                .isInstanceOf(OptimisticLockException.class);
    }

    private User buildUser(Long id, String userId, String email, String role, Long version) {
        User user = new User();
        user.setId(id);
        user.setUserId(userId);
        user.setEmail(email);
        user.setName("テスト" + userId);
        user.setRole(role);
        user.setFontSize("NORMAL");
        user.setVersion(version);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
