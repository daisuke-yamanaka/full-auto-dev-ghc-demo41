// ==================== Auth ====================
export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  role: 'USER' | 'ADMIN';
  name: string;
  fontSize: FontSize;
}

// ==================== Profile / Settings ====================
export type FontSize = 'NORMAL' | 'LARGE' | 'XLARGE';

export interface ProfileResponse {
  id: number;
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  fontSize: FontSize;
  version: number;
}

export interface UpdateProfileRequest {
  name: string;
  version: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateSettingsRequest {
  fontSize: FontSize;
  version: number;
}

export interface SettingsResponse {
  id: number;
  fontSize: FontSize;
  version: number;
}

// ==================== Loans ====================
export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export interface LoanItem {
  loanId: number;
  bookId: number;
  bookTitle: string;
  author: string;
  loanedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: LoanStatus;
  isOverdue: boolean;
  version: number;
}

export interface MyLoansResponse {
  currentLoanCount: number;
  remainingLoanCount: number;
  isOverdue: boolean;
  loans: LoanItem[];
  total: number;
  page: number;
  size: number;
}

export interface CreateLoanRequest {
  bookId: number;
}

export interface LoanResponse {
  id: number;
  bookId: number;
  bookTitle: string;
  loanedAt: string;
  dueDate: string;
  version: number;
}

export interface ReturnLoanRequest {
  version: number;
}

export interface ReturnLoanResponse {
  id: number;
  bookId: number;
  bookTitle: string;
  returnedAt: string;
  version: number;
}

// ==================== Reservations ====================
export interface ReservationItem {
  id: number;
  bookId: number;
  bookTitle: string;
  author: string;
  reservedAt: string;
  queuePosition: number;
  version: number;
}

export interface MyReservationsResponse {
  reservations: ReservationItem[];
  total: number;
  page: number;
  size: number;
}

export interface CreateReservationRequest {
  bookId: number;
}

export interface ReservationResponse {
  id: number;
  bookId: number;
  bookTitle: string;
  reservedAt: string;
  queuePosition: number;
  version: number;
}

export interface CancelReservationRequest {
  version: number;
}

// ==================== Activities ====================
export type ActivityType = 'LOAN' | 'RETURN' | 'RESERVATION';

export interface ActivityItem {
  id: number;
  type: ActivityType;
  bookId: number;
  bookTitle: string;
  datetime: string;
}

export interface ActivitiesResponse {
  activities: ActivityItem[];
}

// ==================== Books ====================
export interface BookSummary {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  availableCopies: number;
  earliestDueDate: string | null;
  version: number;
}

export interface BooksResponse {
  books: BookSummary[];
  total: number;
  page: number;
  size: number;
}

export type CurrentUserStatus = 'none' | 'loaned' | 'reserved';

export interface BookDetailResponse {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  availableCopies: number;
  reservationCount: number;
  earliestDueDate: string | null;
  currentUserLoanId: number | null;
  currentUserLoanVersion: number | null;
  currentUserReservationId: number | null;
  currentUserReservationVersion: number | null;
  currentUserStatus: CurrentUserStatus;
  currentUserQueuePosition: number | null;
  version: number;
}

export interface BookSearchParams {
  title?: string;
  author?: string;
  category?: string;
  isbn?: string;
  page?: number;
  size?: number;
}

// ==================== Admin - Books ====================
export interface CreateBookRequest {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
}

export interface UpdateBookRequest {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  version: number;
}

export interface AdminBookResponse {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  availableCopies: number;
  version: number;
}

export interface DeleteRequest {
  version: number;
}

// ==================== Admin - Users ====================
export interface UserSummary {
  id: number;
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  version: number;
}

export interface UsersResponse {
  users: UserSummary[];
  total: number;
  page: number;
  size: number;
}

export interface CreateUserRequest {
  userId: string;
  email: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  password: string;
}

export interface UpdateUserRequest {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  version: number;
}

export interface AdminUserResponse {
  id: number;
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  version: number;
}

export interface AdminResetPasswordRequest {
  newPassword: string;
}

// ==================== Admin - Loans ====================
export interface AdminLoanItem {
  loanId: number;
  bookId: number;
  bookTitle: string;
  userId: number;
  userName: string;
  userLoginId: string;
  loanedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: LoanStatus;
  isOverdue: boolean;
  version: number;
}

export interface AdminLoansResponse {
  loans: AdminLoanItem[];
  total: number;
  page: number;
  size: number;
}

// ==================== Admin - Reservations ====================
export interface AdminReservationItem {
  id: number;
  bookId: number;
  bookTitle: string;
  userId: number;
  userName: string;
  userLoginId: string;
  reservedAt: string;
  queuePosition: number;
  version: number;
}

export interface AdminReservationsResponse {
  reservations: AdminReservationItem[];
  total: number;
  page: number;
  size: number;
}

// ==================== Admin - Logs ====================
export interface OperationLogItem {
  id: number;
  operationType: string;
  userId: number;
  userLoginId: string;
  userName: string;
  targetType: string;
  targetId: number | null;
  detail: string | null;
  createdAt: string;
}

export interface OperationLogsResponse {
  logs: OperationLogItem[];
  total: number;
  page: number;
  size: number;
}

// ==================== Error ====================
export interface ErrorResponse {
  code: string;
  message: string;
  details: string[];
}
