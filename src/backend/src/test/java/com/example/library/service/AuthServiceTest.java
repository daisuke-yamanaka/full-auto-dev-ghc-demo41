package com.example.library.service;

import com.example.library.dao.UserDao;
import com.example.library.dao.UserSessionDao;
import com.example.library.domain.User;
import com.example.library.domain.UserSession;
import com.example.library.dto.LoginRequest;
import com.example.library.dto.LoginResponse;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.security.JwtAuthenticationFilter;
import com.example.library.security.JwtTokenProvider;
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

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserDao userDao;
    @Mock private UserSessionDao userSessionDao;
    @Mock private JwtTokenProvider jwtTokenProvider;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "jwtExpiration", 3600000L);
        // BCryptPasswordEncoder を直接インジェクション（@Mock ではなく実インスタンス）
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
    }

    // TC-B031: login 正常系
    @Test
    void login_success() {
        User user = buildUser(1L, "user001", "user001@example.com", "USER");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setFontSize("NORMAL");

        when(userDao.findByUserIdOrEmail("user001")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateToken("user001", "USER")).thenReturn("test-token");
        when(userSessionDao.findByUserId(1L)).thenReturn(Collections.emptyList());

        LoginRequest request = new LoginRequest();
        request.setLoginId("user001");
        request.setPassword("password123");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("test-token");
        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getRole()).isEqualTo("USER");

        ArgumentCaptor<UserSession> sessionCaptor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionDao).insert(sessionCaptor.capture());
        UserSession session = sessionCaptor.getValue();
        assertThat(session.getUserId()).isEqualTo(1L);
        assertThat(session.getTokenHash()).isNotBlank();
        assertThat(session.getExpiresAt()).isNotNull();
    }

    // TC-B032: login ユーザ不存在
    @Test
    void login_userNotFound_throwsBadCredentials() {
        when(userDao.findByUserIdOrEmail("notexist")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setLoginId("notexist");
        request.setPassword("pass");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    // TC-B033: login パスワード不一致
    @Test
    void login_wrongPassword_throwsBadCredentials() {
        User user = buildUser(1L, "user001", "user001@example.com", "USER");
        user.setPasswordHash(passwordEncoder.encode("correctPassword"));
        user.setFontSize("NORMAL");

        when(userDao.findByUserIdOrEmail("user001")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setLoginId("user001");
        request.setPassword("wrongPassword");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    // TC-B034: logout 正常系
    @Test
    void logout_success() {
        User user = buildUser(1L, "user001", "user001@example.com", "USER");
        when(userDao.findByUserId("user001")).thenReturn(Optional.of(user));

        UserSession session = new UserSession();
        session.setId(1L);
        when(userSessionDao.findByUserId(1L)).thenReturn(List.of(session));

        authService.logout("user001");

        ArgumentCaptor<List<UserSession>> captor = ArgumentCaptor.forClass(List.class);
        verify(userSessionDao).deleteAll(captor.capture());
        assertThat(captor.getValue()).containsExactly(session);
    }

    // ログイン時に既存セッションが削除されることを検証
    @Test
    void login_existingSession_deletedAndRecreated() {
        User user = buildUser(1L, "user001", "user001@example.com", "USER");
        user.setPasswordHash(passwordEncoder.encode("pass"));
        user.setFontSize("NORMAL");

        UserSession existingSession = new UserSession();
        existingSession.setId(10L);

        when(userDao.findByUserIdOrEmail("user001")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateToken("user001", "USER")).thenReturn("new-token");
        when(userSessionDao.findByUserId(1L)).thenReturn(List.of(existingSession));

        LoginRequest request = new LoginRequest();
        request.setLoginId("user001");
        request.setPassword("pass");

        authService.login(request);

        verify(userSessionDao).deleteAll(List.of(existingSession));
        ArgumentCaptor<UserSession> newSessionCaptor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionDao).insert(newSessionCaptor.capture());
        UserSession newSession = newSessionCaptor.getValue();
        assertThat(newSession.getUserId()).isEqualTo(1L);
        assertThat(newSession.getTokenHash()).isNotBlank();
    }

    private User buildUser(Long id, String userId, String email, String role) {
        User user = new User();
        user.setId(id);
        user.setUserId(userId);
        user.setEmail(email);
        user.setName("テスト" + userId);
        user.setRole(role);
        user.setVersion(0L);
        return user;
    }
}
