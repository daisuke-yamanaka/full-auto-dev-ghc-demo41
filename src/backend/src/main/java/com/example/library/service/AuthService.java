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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserDao userDao;
    private final UserSessionDao userSessionDao;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userDao.findByUserIdOrEmail(request.getLoginId())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.info("ログイン失敗: loginId={}", request.getLoginId());
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtTokenProvider.generateToken(user.getUserId(), user.getRole());

        List<UserSession> existingSessions = userSessionDao.findByUserId(user.getId());
        if (!existingSessions.isEmpty()) {
            userSessionDao.deleteAll(existingSessions);
        }

        UserSession session = new UserSession();
        session.setUserId(user.getId());
        session.setTokenHash(JwtAuthenticationFilter.hashToken(token));
        session.setCreatedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusSeconds(jwtExpiration / 1000));
        userSessionDao.insert(session);

        log.info("ログイン成功: userId={}", user.getUserId());
        return new LoginResponse(token, user.getId(), user.getRole(), user.getName(), user.getFontSize());
    }

    @Transactional
    public void logout(String userId) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<UserSession> sessions = userSessionDao.findByUserId(user.getId());
        if (!sessions.isEmpty()) {
            userSessionDao.deleteAll(sessions);
        }
        log.info("ログアウト: userId={}", userId);
    }
}
