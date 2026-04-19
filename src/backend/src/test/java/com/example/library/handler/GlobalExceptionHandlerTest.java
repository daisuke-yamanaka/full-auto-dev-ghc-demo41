package com.example.library.handler;

import com.example.library.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @RestController
    static class TestController {
        @GetMapping("/test/not-found")
        public void notFound() { throw new ResourceNotFoundException("Resource not found"); }

        @GetMapping("/test/optimistic-lock")
        public void optimisticLock() { throw new OptimisticLockException("Conflict"); }

        @GetMapping("/test/business-rule")
        public void businessRule() { throw new BusinessRuleViolationException("Business rule"); }

        @GetMapping("/test/bad-credentials")
        public void badCredentials() { throw new BadCredentialsException("Bad credentials"); }

        @GetMapping("/test/access-denied")
        public void accessDenied() { throw new AccessDeniedException("Access denied"); }

        @GetMapping("/test/unauthorized-operation")
        public void unauthorizedOperation() { throw new UnauthorizedOperationException("No permission"); }

        @GetMapping("/test/general-exception")
        public void generalException() throws Exception { throw new RuntimeException("Unexpected"); }
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // TC-B062: ResourceNotFoundException → 404
    @Test
    void handleNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("NOT_FOUND")))
                .andExpect(jsonPath("$.message", is("Resource not found")));
    }

    // TC-B063: OptimisticLockException → 409
    @Test
    void handleOptimisticLock_returns409() throws Exception {
        mockMvc.perform(get("/test/optimistic-lock"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("OPTIMISTIC_LOCK_ERROR")))
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    // TC-B064: BusinessRuleViolationException → 409
    @Test
    void handleBusinessRule_returns409() throws Exception {
        mockMvc.perform(get("/test/business-rule"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("BUSINESS_LOGIC_ERROR")))
                .andExpect(jsonPath("$.message", is("Business rule")));
    }

    // TC-B065: BadCredentialsException → 401
    @Test
    void handleBadCredentials_returns401() throws Exception {
        mockMvc.perform(get("/test/bad-credentials"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("AUTHENTICATION_ERROR")));
    }

    // TC-B066: UnauthorizedOperationException → 403
    @Test
    void handleUnauthorizedOperation_returns403() throws Exception {
        mockMvc.perform(get("/test/unauthorized-operation"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")))
                .andExpect(jsonPath("$.message", is("No permission")));
    }

    // TC-B067: Exception → 500
    @Test
    void handleGeneral_returns500() throws Exception {
        mockMvc.perform(get("/test/general-exception"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")));
    }
}
