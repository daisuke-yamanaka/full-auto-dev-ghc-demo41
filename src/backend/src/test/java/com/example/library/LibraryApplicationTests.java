package com.example.library;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@ActiveProfiles("dev")
@TestPropertySource(properties = {
    "JWT_SECRET=testjwtsecretkey12345678901234567890abcdefgh"
})
class LibraryApplicationTests {

    @Test
    void contextLoads() {
    }
}
