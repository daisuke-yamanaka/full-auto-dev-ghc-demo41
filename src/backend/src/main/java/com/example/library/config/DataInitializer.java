package com.example.library.config;

import com.example.library.dao.BookDao;
import com.example.library.dao.UserDao;
import com.example.library.domain.Book;
import com.example.library.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserDao userDao;
    private final BookDao bookDao;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userDao.countAll() > 0) {
            log.info("初期データは既に存在します");
            return;
        }

        User admin = new User();
        admin.setUserId("admin");
        admin.setEmail("admin@example.com");
        admin.setName("管理者");
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        admin.setRole("ADMIN");
        admin.setFontSize("NORMAL");
        admin.setVersion(0L);
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());
        userDao.insert(admin);

        for (int i = 1; i <= 5; i++) {
            User user = new User();
            user.setUserId("user" + String.format("%03d", i));
            user.setEmail("user" + String.format("%03d", i) + "@example.com");
            user.setName("ユーザ" + i);
            user.setPasswordHash(passwordEncoder.encode("password" + i));
            user.setRole("USER");
            user.setFontSize("NORMAL");
            user.setVersion(0L);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userDao.insert(user);
        }

        String[][] bookData = {
            {"Java入門", "山田太郎", "9784123456789", "技術出版社", "2020", "プログラミング", "3"},
            {"Spring Boot実践", "田中花子", "9784234567890", "Java書房", "2021", "プログラミング", "2"},
            {"データベース設計", "鈴木一郎", "9784345678901", "DB出版", "2019", "データベース", "1"},
            {"アルゴリズムとデータ構造", "佐藤次郎", "9784456789012", "CS出版", "2022", "プログラミング", "2"},
            {"Webアプリケーション開発", "伊藤三郎", "9784567890123", "Web書房", "2021", "Web開発", "3"},
            {"機械学習入門", "渡辺四郎", "9784678901234", "AI出版", "2022", "AI/ML", "2"},
            {"クリーンアーキテクチャ", "中村五郎", "9784789012345", "設計書房", "2020", "ソフトウェア設計", "1"},
            {"DevOps実践ガイド", "小林六郎", "9784890123456", "運用出版", "2021", "インフラ", "2"},
            {"Reactモダン開発", "加藤七郎", "9784901234567", "フロント書房", "2023", "Web開発", "2"},
            {"マイクロサービス設計", "吉田八郎", "9784012345678", "アーキテクチャ出版", "2022", "ソフトウェア設計", "1"}
        };

        for (String[] data : bookData) {
            Book book = new Book();
            book.setTitle(data[0]);
            book.setAuthor(data[1]);
            book.setIsbn(data[2]);
            book.setPublisher(data[3]);
            book.setPublishedYear(Integer.parseInt(data[4]));
            book.setCategory(data[5]);
            book.setTotalCopies(Integer.parseInt(data[6]));
            book.setVersion(0L);
            book.setCreatedAt(LocalDateTime.now());
            book.setUpdatedAt(LocalDateTime.now());
            bookDao.insert(book);
        }

        log.info("初期データを作成しました");
    }
}
