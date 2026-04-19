# 単体テスト仕様書

## 概要

| 項目 | 内容 |
|------|------|
| 対象システム | 図書館管理システム |
| テストフレームワーク（BE） | JUnit 5 + Mockito + Spring Boot Test + H2 |
| テストフレームワーク（FE） | Vitest + React Testing Library |
| カバレッジ目標 | ライン90%以上 |

---

## バックエンドテスト

### Service層テスト（@ExtendWith(MockitoExtension.class) + Mockito）

---

### TC-B001 - LoanService: 貸出作成 正常系 (FR-011)
- **テストクラス**: `LoanServiceTest`
- **対象メソッド**: `createLoan(String userId, CreateLoanRequest request)`
- **テスト種別**: 正常系
- **前提条件**: ユーザ存在、図書存在、activeLoans=4（< MAX=5）、延滞なし、図書在庫あり、未貸出
- **入力データ**: userId="user001", bookId=1
- **期待結果**:
  - `loanDao.insert` が呼ばれる
  - ArgumentCaptorで `loan.userId`, `loan.bookId`, `loan.dueDate` (today+7) を検証
  - `operationLogDao.insert` が呼ばれ、operationType="LOAN" を検証
  - 返却値 `LoanResponse` の bookId, bookTitle, dueDate が正しい

---

### TC-B002 - LoanService: 貸出作成 activeLoans=4（境界値・正常） (FR-011)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 境界値
- **前提条件**: activeLoans=4 (MAX_LOANS_PER_USER=5 の1つ手前)
- **期待結果**: 貸出が成功し LoanResponse が返る

---

### TC-B003 - LoanService: 貸出作成 activeLoans=5（境界値・異常） (FR-011)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 境界値 / 異常系
- **前提条件**: activeLoans=5 (MAX_LOANS_PER_USER=5 に達している)
- **期待結果**: `BusinessRuleViolationException` ("貸出上限") がスローされる

---

### TC-B004 - LoanService: 貸出作成 延滞あり (FR-011)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 異常系
- **前提条件**: countOverdueByUserId > 0
- **期待結果**: `BusinessRuleViolationException` ("延滞中") がスローされる

---

### TC-B005 - LoanService: 貸出作成 在庫なし (FR-011)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 異常系
- **前提条件**: activeLoanCount >= totalCopies
- **期待結果**: `BusinessRuleViolationException` ("貸出可能な蔵書がありません") がスローされる

---

### TC-B006 - LoanService: 貸出作成 既に貸出中 (FR-011)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 異常系
- **前提条件**: findActiveByUserIdAndBookId が Optional.of(existingLoan) を返す
- **期待結果**: `BusinessRuleViolationException` ("既に貸出中") がスローされる

---

### TC-B007 - LoanService: 返却処理 正常系（予約なし） (FR-018)
- **テストクラス**: `LoanServiceTest`
- **対象メソッド**: `returnLoan`
- **テスト種別**: 正常系
- **前提条件**: 未返却、バージョン一致、予約キューなし
- **期待結果**: `loanDao.update` が呼ばれ returnedAt が設定される、ReturnLoanResponse が返る

---

### TC-B008 - LoanService: 返却処理 FR-018 自動貸出（予約連動） (FR-018)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 正常系
- **前提条件**: 予約キューに activeLoans<5 かつ 延滞なしのユーザが存在
- **期待結果**:
  - 予約ユーザへの自動貸出 `loanDao.insert` が呼ばれる
  - `reservationDao.delete` が呼ばれる
  - 自動貸出の operationLogDao に operationType="LOAN", detail="自動貸出（予約連動）" が記録される

---

### TC-B009 - LoanService: 返却処理 FR-018 スキップ（予約ユーザ延滞あり） (FR-018)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 正常系 (条件分岐)
- **前提条件**: 予約キューにユーザが存在するが延滞あり
- **期待結果**: 自動貸出は行われず、`loanDao.insert` は呼ばれない（返却は成功）

---

### TC-B010 - LoanService: 返却処理 バージョン不一致 (FR-018)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 異常系
- **前提条件**: request.version != loan.version
- **期待結果**: `OptimisticLockException` がスローされる

---

### TC-B011 - LoanService: 返却処理 既に返却済み (FR-018)
- **テストクラス**: `LoanServiceTest`
- **テスト種別**: 異常系
- **前提条件**: loan.returnedAt != null
- **期待結果**: `BusinessRuleViolationException` ("既に返却されています") がスローされる

---

### TC-B012 - LoanService: 貸出一覧取得 正常系 (FR-012)
- **テストクラス**: `LoanServiceTest`
- **対象メソッド**: `getMyLoans`
- **テスト種別**: 正常系
- **期待結果**: MyLoansResponse の loans, total, currentLoanCount, remainingLoanCount が正しい

---

### TC-B013 - ReservationService: 予約作成 正常系 (FR-014)
- **テストクラス**: `ReservationServiceTest`
- **対象メソッド**: `createReservation`
- **テスト種別**: 正常系
- **前提条件**: 未予約、未貸出、全冊貸出中（activeLoanCount >= totalCopies）
- **期待結果**:
  - ArgumentCaptorで reservation.userId, bookId を検証
  - ReservationResponse が返る

---

### TC-B014 - ReservationService: 予約作成 既に予約済み (FR-014)
- **テストクラス**: `ReservationServiceTest`
- **テスト種別**: 異常系
- **前提条件**: findByUserIdAndBookId が存在する予約を返す
- **期待結果**: `BusinessRuleViolationException` ("既に予約済みです") がスローされる

---

### TC-B015 - ReservationService: 予約作成 貸出可能あり (FR-014)
- **テストクラス**: `ReservationServiceTest`
- **テスト種別**: 異常系
- **前提条件**: activeLoanCount < totalCopies
- **期待結果**: `BusinessRuleViolationException` ("貸出可能な蔵書があります") がスローされる

---

### TC-B016 - ReservationService: 予約キャンセル 正常系（本人）
- **テストクラス**: `ReservationServiceTest`
- **対象メソッド**: `cancelReservation`
- **テスト種別**: 正常系
- **前提条件**: reservation.userId == user.id、バージョン一致
- **期待結果**: `reservationDao.delete` が呼ばれる

---

### TC-B017 - ReservationService: 予約キャンセル 正常系（管理者）
- **テストクラス**: `ReservationServiceTest`
- **テスト種別**: 正常系
- **前提条件**: user.role = "ADMIN", reservation.userId != user.id
- **期待結果**: `reservationDao.delete` が呼ばれる

---

### TC-B018 - ReservationService: 予約キャンセル 権限なし
- **テストクラス**: `ReservationServiceTest`
- **テスト種別**: 異常系
- **前提条件**: reservation.userId != user.id、role="USER"
- **期待結果**: `UnauthorizedOperationException` がスローされる

---

### TC-B019 - ReservationService: 予約キャンセル バージョン不一致
- **テストクラス**: `ReservationServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `OptimisticLockException` がスローされる

---

### TC-B020 - ReservationService: 予約一覧取得 正常系
- **テストクラス**: `ReservationServiceTest`
- **対象メソッド**: `getMyReservations`
- **テスト種別**: 正常系
- **期待結果**: MyReservationsResponse が正しく返る

---

### TC-B021 - BookService: 図書検索 全件検索 (FR-001)
- **テストクラス**: `BookServiceTest`
- **対象メソッド**: `searchBooks`
- **テスト種別**: 正常系
- **入力データ**: title=null, author=null, category=null, isbn=null
- **期待結果**: BooksResponse が返る

---

### TC-B022 - BookService: 図書検索 タイトル指定 (FR-001)
- **テストクラス**: `BookServiceTest`
- **テスト種別**: 正常系
- **入力データ**: title="Java"
- **期待結果**: bookDao.search が ("Java", null, null, null, ...) で呼ばれる

---

### TC-B023 - BookService: 図書詳細取得 正常系 (FR-002)
- **テストクラス**: `BookServiceTest`
- **対象メソッド**: `getBook`
- **テスト種別**: 正常系
- **期待結果**: BookDetailResponse に availableCopies, reservationCount が含まれる

---

### TC-B024 - BookService: 図書詳細取得 存在しない (FR-002)
- **テストクラス**: `BookServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `ResourceNotFoundException` がスローされる

---

### TC-B025 - BookService: 図書登録 正常系 (FR-005)
- **テストクラス**: `BookServiceTest`
- **対象メソッド**: `createBook`
- **テスト種別**: 正常系
- **期待結果**: ArgumentCaptor で book.title, isbn, totalCopies を検証

---

### TC-B026 - BookService: 図書登録 ISBN重複 (FR-005)
- **テストクラス**: `BookServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BusinessRuleViolationException` ("ISBNが既に登録されています") がスローされる

---

### TC-B027 - BookService: 図書更新 正常系 (FR-006)
- **テストクラス**: `BookServiceTest`
- **対象メソッド**: `updateBook`
- **テスト種別**: 正常系
- **期待結果**: bookDao.update が呼ばれ、AdminBookResponse が返る

---

### TC-B028 - BookService: 図書更新 バージョン不一致 (FR-006)
- **テストクラス**: `BookServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `OptimisticLockException` がスローされる

---

### TC-B029 - BookService: 図書削除 正常系 (FR-007)
- **テストクラス**: `BookServiceTest`
- **対象メソッド**: `deleteBook`
- **テスト種別**: 正常系
- **前提条件**: activeLoanCount=0
- **期待結果**: bookDao.delete が呼ばれる

---

### TC-B030 - BookService: 図書削除 貸出中 (FR-007)
- **テストクラス**: `BookServiceTest`
- **テスト種別**: 異常系
- **前提条件**: activeLoanCount > 0
- **期待結果**: `BusinessRuleViolationException` ("貸出中の図書は削除できません") がスローされる

---

### TC-B031 - AuthService: ログイン 正常系 (FR-008)
- **テストクラス**: `AuthServiceTest`
- **対象メソッド**: `login`
- **テスト種別**: 正常系
- **期待結果**: LoginResponse が返る、userSessionDao.insert が呼ばれる

---

### TC-B032 - AuthService: ログイン ユーザ不存在 (FR-008)
- **テストクラス**: `AuthServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BadCredentialsException` がスローされる

---

### TC-B033 - AuthService: ログイン パスワード不一致 (FR-008)
- **テストクラス**: `AuthServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BadCredentialsException` がスローされる

---

### TC-B034 - AuthService: ログアウト 正常系 (FR-009)
- **テストクラス**: `AuthServiceTest`
- **対象メソッド**: `logout`
- **テスト種別**: 正常系
- **期待結果**: userSessionDao.deleteAll が呼ばれる

---

### TC-B035 - UserService: ユーザ一覧取得 正常系 (FR-020)
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 正常系
- **期待結果**: UsersResponse が返る

---

### TC-B036 - UserService: ユーザ登録 正常系 (FR-021)
- **テストクラス**: `UserServiceTest`
- **対象メソッド**: `createUser`
- **テスト種別**: 正常系
- **期待結果**: ArgumentCaptor で user.userId, email, role を検証

---

### TC-B037 - UserService: ユーザ登録 userId重複 (FR-021)
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BusinessRuleViolationException` ("ユーザIDが既に使用されています") がスローされる

---

### TC-B038 - UserService: ユーザ登録 email重複 (FR-021)
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BusinessRuleViolationException` ("メールアドレスが既に使用されています") がスローされる

---

### TC-B039 - UserService: パスワード変更 正常系 (FR-025)
- **テストクラス**: `UserServiceTest`
- **対象メソッド**: `changePassword`
- **テスト種別**: 正常系
- **期待結果**: userDao.update が呼ばれる

---

### TC-B040 - UserService: パスワード変更 現在パスワード不一致 (FR-025)
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BadCredentialsException` がスローされる

---

### TC-B041 - UserService: パスワード変更 新パスワード確認不一致 (FR-025)
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 異常系
- **期待結果**: `BusinessRuleViolationException` がスローされる

---

### TC-B042 - UserService: プロフィール取得 正常系
- **テストクラス**: `UserServiceTest`
- **テスト種別**: 正常系
- **期待結果**: ProfileResponse が返る

---

---

## DAO層テスト（@SpringBootTest + H2 + @Transactional）

---

### TC-B043 - BookDao: insert & findById
- **テストクラス**: `BookDaoTest`
- **テスト種別**: 正常系
- **入力データ**: Book エンティティ（title, author, isbn 等設定）
- **期待結果**: insert後にfindById で同一エンティティが取得できる

---

### TC-B044 - BookDao: search 動的SQL（全件）
- **テストクラス**: `BookDaoTest`
- **テスト種別**: 正常系
- **入力データ**: 全パラメータ null
- **期待結果**: 1件以上の Book が返る

---

### TC-B045 - BookDao: search 動的SQL（タイトル前方一致）
- **テストクラス**: `BookDaoTest`
- **テスト種別**: 正常系
- **入力データ**: title="TestBook_"
- **期待結果**: 挿入した図書のみが返る

---

### TC-B046 - BookDao: countSearch
- **テストクラス**: `BookDaoTest`
- **テスト種別**: 正常系
- **期待結果**: search の件数と一致する

---

### TC-B047 - BookDao: update & delete
- **テストクラス**: `BookDaoTest`
- **テスト種別**: 正常系
- **期待結果**: update後に findById でタイトル変更確認、delete後に findById でEmpty確認

---

### TC-B048 - LoanDao: insert & findById
- **テストクラス**: `LoanDaoTest`
- **テスト種別**: 正常系
- **期待結果**: insert後に findById で loanId, userId, bookId, dueDate が一致

---

### TC-B049 - LoanDao: countActiveByUserId
- **テストクラス**: `LoanDaoTest`
- **テスト種別**: 正常系
- **入力データ**: userId のアクティブ貸出2件挿入
- **期待結果**: countActiveByUserId == 2

---

### TC-B050 - LoanDao: countOverdueByUserId
- **テストクラス**: `LoanDaoTest`
- **テスト種別**: 正常系
- **入力データ**: dueDate が過去の未返却貸出を挿入
- **期待結果**: countOverdueByUserId >= 1

---

### TC-B051 - LoanDao: findActiveByUserIdAndBookId
- **テストクラス**: `LoanDaoTest`
- **テスト種別**: 正常系
- **期待結果**: 未返却貸出は Optional.isPresent()、返却済み貸出は Optional.empty()

---

### TC-B052 - LoanDao: findEarliestDueDateByBookId
- **テストクラス**: `LoanDaoTest`
- **テスト種別**: 正常系
- **期待結果**: 複数貸出中で最も早い due_date が返る

---

### TC-B053 - ReservationDao: insert & findById
- **テストクラス**: `ReservationDaoTest`
- **テスト種別**: 正常系
- **期待結果**: insert後に findById で正しい値が返る

---

### TC-B054 - ReservationDao: findByUserIdAndBookId
- **テストクラス**: `ReservationDaoTest`
- **テスト種別**: 正常系
- **期待結果**: 存在する場合 Optional.isPresent()、存在しない場合 Optional.empty()

---

### TC-B055 - ReservationDao: getQueuePosition
- **テストクラス**: `ReservationDaoTest`
- **テスト種別**: 正常系
- **入力データ**: 同一本に2ユーザが予約（順番に）
- **期待結果**: 1番目に予約したユーザは position=1、2番目は position=2

---

### TC-B056 - ReservationDao: findByBookIdOrderByReservedAt
- **テストクラス**: `ReservationDaoTest`
- **テスト種別**: 正常系
- **期待結果**: reserved_at 昇順で返る

---

### TC-B057 - UserDao: insert & findByUserId
- **テストクラス**: `UserDaoTest`
- **テスト種別**: 正常系
- **期待結果**: insert後に findByUserId で正しいユーザが返る

---

### TC-B058 - UserDao: findByEmail
- **テストクラス**: `UserDaoTest`
- **テスト種別**: 正常系
- **期待結果**: メールアドレスでユーザが取得できる

---

### TC-B059 - UserDao: findByUserIdOrEmail（userId検索）
- **テストクラス**: `UserDaoTest`
- **テスト種別**: 正常系
- **期待結果**: userId で検索できる

---

### TC-B060 - UserDao: findByUserIdOrEmail（email検索）
- **テストクラス**: `UserDaoTest`
- **テスト種別**: 正常系
- **期待結果**: email で検索できる

---

### TC-B061 - UserDao: findAll ページネーション
- **テストクラス**: `UserDaoTest`
- **テスト種別**: 正常系
- **入力データ**: limit=2, offset=0
- **期待結果**: 最大2件が返る

---

---

## GlobalExceptionHandlerテスト（MockMvc standaloneSetup）

---

### TC-B062 - GlobalExceptionHandler: ResourceNotFoundException → 404
- **テストクラス**: `GlobalExceptionHandlerTest`
- **テスト種別**: 正常系
- **期待結果**: HTTP 404, JSON body に code="NOT_FOUND" が含まれる

---

### TC-B063 - GlobalExceptionHandler: OptimisticLockException → 409
- **テスト種別**: 正常系
- **期待結果**: HTTP 409, code="OPTIMISTIC_LOCK_ERROR"

---

### TC-B064 - GlobalExceptionHandler: BusinessRuleViolationException → 409
- **テスト種別**: 正常系
- **期待結果**: HTTP 409, code="BUSINESS_LOGIC_ERROR"

---

### TC-B065 - GlobalExceptionHandler: BadCredentialsException → 401
- **テスト種別**: 正常系
- **期待結果**: HTTP 401, code="AUTHENTICATION_ERROR"

---

### TC-B066 - GlobalExceptionHandler: UnauthorizedOperationException → 403
- **テスト種別**: 正常系
- **期待結果**: HTTP 403, code="FORBIDDEN"

---

### TC-B067 - GlobalExceptionHandler: Exception → 500
- **テスト種別**: 正常系
- **期待結果**: HTTP 500, code="INTERNAL_SERVER_ERROR"

---

---

## フロントエンドテスト

---

### TC-F001 - LoginPage: フォーム入力・ログイン送信 (FR-008)
- **テストファイル**: `LoginPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: loginApi が成功レスポンスを返すようモック
- **入力データ**: loginId="user001", password="pass123"
- **期待結果**: loginApi が呼ばれ、ページ遷移が発生する

---

### TC-F002 - LoginPage: 送信ボタン 入力なしで無効化 (FR-008)
- **テストファイル**: `LoginPage.test.tsx`
- **テスト種別**: 異常系
- **前提条件**: loginId/password が空
- **期待結果**: 送信ボタンが disabled である

---

### TC-F003 - LoginPage: ログインエラー表示 (FR-008)
- **テストファイル**: `LoginPage.test.tsx`
- **テスト種別**: 異常系
- **前提条件**: loginApi が Error をスロー
- **期待結果**: エラーメッセージがレンダリングされる

---

### TC-F004 - BookListPage: 図書一覧の表示 (FR-001)
- **テストファイル**: `BookListPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: searchBooks がモックデータを返す
- **期待結果**: 図書タイトルが画面に表示される

---

### TC-F005 - BookListPage: 検索フォーム送信 (FR-001)
- **テストファイル**: `BookListPage.test.tsx`
- **テスト種別**: 正常系
- **入力データ**: title="Java"
- **期待結果**: searchBooks が title="Java" パラメータで呼ばれる

---

### TC-F006 - BookListPage: 検索結果0件の表示 (FR-001)
- **テストファイル**: `BookListPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: searchBooks が空リストを返す
- **期待結果**: 「該当する図書が見つかりませんでした」が表示される

---

### TC-F007 - BookDetailPage: 図書詳細の表示 (FR-002)
- **テストファイル**: `BookDetailPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: getBook がモックデータを返す
- **期待結果**: title, author, isbn 等が画面に表示される

---

### TC-F008 - BookDetailPage: 貸出ボタンのクリック (FR-011)
- **テストファイル**: `BookDetailPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: availableCopies>0, currentUserStatus="none", createLoan がモック成功
- **期待結果**: createLoan が呼ばれる

---

### TC-F009 - BookDetailPage: 予約ボタンのクリック (FR-014)
- **テストファイル**: `BookDetailPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: availableCopies=0, currentUserStatus="none", createReservation がモック成功
- **期待結果**: createReservation が呼ばれる

---

### TC-F010 - LoanHistoryPage: 貸出一覧の表示 (FR-012)
- **テストファイル**: `LoanHistoryPage.test.tsx`
- **テスト種別**: 正常系
- **期待結果**: 貸出中図書タイトルが表示される

---

### TC-F011 - LoanHistoryPage: 返却操作 (FR-018)
- **テストファイル**: `LoanHistoryPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: returnLoan がモック成功
- **期待結果**: returnLoan が正しい loanId で呼ばれる

---

### TC-F012 - ReservationListPage: 予約一覧の表示 (FR-015)
- **テストファイル**: `ReservationListPage.test.tsx`
- **テスト種別**: 正常系
- **期待結果**: 予約図書タイトルが表示される

---

### TC-F013 - ReservationListPage: 予約キャンセル操作 (FR-016)
- **テストファイル**: `ReservationListPage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: cancelReservation がモック成功
- **期待結果**: ConfirmDialog が表示され、確認後 cancelReservation が呼ばれる

---

### TC-F014 - ProfilePage: プロフィール表示 (FR-023)
- **テストファイル**: `ProfilePage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: getMyProfile がモックデータを返す
- **期待結果**: name, userId, email が表示される

---

### TC-F015 - ProfilePage: 名前の編集・保存 (FR-023)
- **テストファイル**: `ProfilePage.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: updateMyProfile がモック成功
- **期待結果**: updateMyProfile が新しい名前で呼ばれる

---

### TC-F016 - ProfilePage: 名前空欄バリデーション (FR-023)
- **テストファイル**: `ProfilePage.test.tsx`
- **テスト種別**: 異常系
- **入力データ**: name=""
- **期待結果**: エラーメッセージ「名前は必須です」が表示される

---

### TC-F017 - Drawer: 開閉動作
- **テストファイル**: `Drawer.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: open=true の場合ナビゲーションが表示される
- **期待結果**: open=false のとき非表示（transform で非表示）

---

### TC-F018 - Drawer: 管理者メニュー表示条件
- **テストファイル**: `Drawer.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: role="ADMIN" の場合管理メニューが表示される、role="USER" の場合非表示
- **期待結果**: 「管理メニュー」テキストの有無

---

### TC-F019 - ConfirmDialog: 表示確認
- **テストファイル**: `ConfirmDialog.test.tsx`
- **テスト種別**: 正常系
- **前提条件**: open=true
- **期待結果**: title, message, confirmLabel が表示される

---

### TC-F020 - ConfirmDialog: 確認ボタンクリック
- **テストファイル**: `ConfirmDialog.test.tsx`
- **テスト種別**: 正常系
- **期待結果**: onConfirm が呼ばれる

---

### TC-F021 - ConfirmDialog: キャンセルボタンクリック
- **テストファイル**: `ConfirmDialog.test.tsx`
- **テスト種別**: 正常系
- **期待結果**: onCancel が呼ばれる

---

### TC-F022 - ConfirmDialog: open=false のとき非表示
- **テストファイル**: `ConfirmDialog.test.tsx`
- **テスト種別**: 正常系
- **期待結果**: コンポーネントが null を返しレンダリングされない
