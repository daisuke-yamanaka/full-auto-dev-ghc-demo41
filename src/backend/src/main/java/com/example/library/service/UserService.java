package com.example.library.service;

import com.example.library.dao.UserDao;
import com.example.library.domain.User;
import com.example.library.dto.*;
import com.example.library.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private static final String USER_NOT_FOUND = "User not found";
    private static final String USER_NOT_FOUND_ID = "User not found: ";

    private final UserDao userDao;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String userId) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        return toProfileResponse(user);
    }

    @Transactional
    public ProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

        if (!user.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("プロフィール情報が更新されています。再読み込みしてください。");
        }

        user.setName(request.getName());
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);

        log.info("プロフィール更新: userId={}, operator={}", userId, userId);
        return toProfileResponse(userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND)));
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("現在のパスワードが正しくありません");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessRuleViolationException("新しいパスワードと確認用パスワードが一致しません");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);
        log.info("パスワード変更: userId={}", userId);
    }

    @Transactional
    public SettingsResponse updateSettings(String userId, UpdateSettingsRequest request) {
        User user = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

        if (!user.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("設定情報が更新されています。再読み込みしてください。");
        }

        user.setFontSize(request.getFontSize());
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);

        log.info("設定更新: userId={}, fontSize={}", userId, request.getFontSize());
        User updated = userDao.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        return new SettingsResponse(updated.getId(), updated.getFontSize(), updated.getVersion());
    }

    @Transactional(readOnly = true)
    public UsersResponse getUsers(int page, int size) {
        int offset = (page - 1) * size;
        List<User> users = userDao.findAll(size, offset);
        int total = userDao.countAll();

        List<UserSummary> summaries = users.stream().map(this::toUserSummary).toList();

        UsersResponse response = new UsersResponse();
        response.setUsers(summaries);
        response.setTotal(total);
        response.setPage(page);
        response.setSize(size);
        return response;
    }

    @Transactional
    public AdminUserResponse createUser(CreateUserRequest request) {
        if (userDao.findByUserId(request.getUserId()).isPresent()) {
            throw new BusinessRuleViolationException("ユーザIDが既に使用されています: " + request.getUserId());
        }
        if (userDao.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessRuleViolationException("メールアドレスが既に使用されています: " + request.getEmail());
        }

        User user = new User();
        user.setUserId(request.getUserId());
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setRole(request.getRole() != null ? request.getRole() : "USER");
        user.setFontSize("NORMAL");
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setVersion(0L);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        userDao.insert(user);
        String operator = getOperatorId();
        log.info("ユーザ登録: userId={}, operator={}", request.getUserId(), operator);
        return toAdminUserResponse(user);
    }

    @Transactional
    public AdminUserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_ID + id));

        if (!user.getVersion().equals(request.getVersion())) {
            throw new OptimisticLockException("ユーザ情報が更新されています。再読み込みしてください。");
        }

        userDao.findByUserId(request.getUserId()).ifPresent(u -> {
            if (!u.getId().equals(id)) throw new BusinessRuleViolationException("ユーザIDが既に使用されています");
        });
        userDao.findByEmail(request.getEmail()).ifPresent(u -> {
            if (!u.getId().equals(id)) throw new BusinessRuleViolationException("メールアドレスが既に使用されています");
        });

        user.setUserId(request.getUserId());
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setRole(request.getRole());
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);

        String operator = getOperatorId();
        log.info("ユーザ更新: id={}, operator={}", id, operator);
        return toAdminUserResponse(userDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_ID + id)));
    }

    @Transactional
    public void deleteUser(Long id, Long version) {
        User user = userDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_ID + id));

        if (!user.getVersion().equals(version)) {
            throw new OptimisticLockException("ユーザ情報が更新されています。再読み込みしてください。");
        }

        userDao.delete(user);
        String operator = getOperatorId();
        log.info("ユーザ削除: id={}, operator={}", id, operator);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = userDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_ID + id));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userDao.update(user);
        String operator = getOperatorId();
        log.info("パスワードリセット: id={}, operator={}", id, operator);
    }

    private String getOperatorId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
            .getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(user.getId(), user.getUserId(), user.getEmail(),
            user.getName(), user.getRole(), user.getFontSize(), user.getVersion());
    }

    private UserSummary toUserSummary(User user) {
        UserSummary s = new UserSummary();
        s.setId(user.getId());
        s.setUserId(user.getUserId());
        s.setEmail(user.getEmail());
        s.setName(user.getName());
        s.setRole(user.getRole());
        s.setVersion(user.getVersion());
        return s;
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        AdminUserResponse r = new AdminUserResponse();
        r.setId(user.getId());
        r.setUserId(user.getUserId());
        r.setEmail(user.getEmail());
        r.setName(user.getName());
        r.setRole(user.getRole());
        r.setVersion(user.getVersion());
        return r;
    }
}
