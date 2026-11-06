import { DailyQuiz, User, PointLog, UserQuizSubmission, DatabaseConfig } from '../types/index';
import { INITIAL_QUIZZES, INITIAL_USERS, INITIAL_LOGS } from '../data/seedData';

const STORAGE_KEYS = {
  QUIZZES: 'coptic_bible_quizzes_v2',
  USERS: 'coptic_bible_users_v2',
  CURRENT_USER_ID: 'coptic_bible_current_user_id_v2',
  POINT_LOGS: 'coptic_bible_point_logs_v2',
  SENIOR_SETTINGS: 'coptic_bible_senior_settings_v2',
  DB_CONFIG: 'coptic_bible_db_config_v2',
};

export interface SeniorSettings {
  fontSizeLevel: number;
  highContrast: boolean;
  autoPlayAudio: boolean;
  showVowelMarks: boolean;
}

const DEFAULT_SENIOR_SETTINGS: SeniorSettings = {
  fontSizeLevel: 1,
  highContrast: false,
  autoPlayAudio: false,
  showVowelMarks: true,
};

const DEFAULT_DB_CONFIG: DatabaseConfig = {
  host: '34.96.62.46',
  port: 3306,
  database: 'u123456789_bible_quiz',
  user: 'u123456789_admin',
  password: '',
  ssl: false,
  isConnected: false,
  tablePrefix: 'cbq_',
  syncMode: 'bridge',
  bridgeUrl: '',
  bridgeSecret: 'cbq_sec_9a7d4f128e',
};

export const STORAGE_CHANGE_EVENT = 'coptic_bible_storage_changed';

function dispatchChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT));
  }
}

export const StorageService = {
  // --- Quizzes by Day ---
  getQuizzes(): DailyQuiz[] {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(INITIAL_QUIZZES));
      return INITIAL_QUIZZES;
    }
    try {
      const parsed: DailyQuiz[] = JSON.parse(raw);
      // Ensure dayNumber is present on all
      return parsed.map((q, idx) => ({
        ...q,
        dayNumber: q.dayNumber || (idx + 1),
      }));
    } catch {
      return INITIAL_QUIZZES;
    }
  },

  saveQuizzes(quizzes: DailyQuiz[]): void {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
    dispatchChange();
  },

  getQuizById(id: string): DailyQuiz | undefined {
    return this.getQuizzes().find(q => q.id === id);
  },

  getQuizByDayNumber(dayNumber: number): DailyQuiz | undefined {
    return this.getQuizzes().find(q => q.dayNumber === dayNumber);
  },

  // --- Egypt Timezone (Africa/Cairo) & Date Logic ---
  getEgyptTodayDate(): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date()); // Formats as YYYY-MM-DD in Cairo
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  },

  isQuizLockedFuture(quizDate?: string): boolean {
    if (!quizDate) return false;
    const egyptToday = this.getEgyptTodayDate();
    return quizDate > egyptToday;
  },

  isQuizTodayInEgypt(quizDate?: string): boolean {
    if (!quizDate) return false;
    return quizDate === this.getEgyptTodayDate();
  },

  // Returns the current Main Day quiz (strictly respecting Egypt timezone)
  // Future days are never returned as the active today quiz ahead of time.
  // When a future date arrives in Egypt, it automatically unlocks and becomes today's quiz.
  getMainTodayQuiz(): DailyQuiz {
    const quizzes = this.getQuizzes();
    const egyptToday = this.getEgyptTodayDate();

    // 1. Primary: Unlocked quiz whose date matches TODAY in Egypt
    const todayMatch = quizzes.find(q => q.date === egyptToday);
    if (todayMatch) return todayMatch;

    // 2. Secondary: An unlocked quiz (date <= egyptToday) marked as isMainToday
    const unlockedQuizzes = quizzes.filter(q => !q.date || q.date <= egyptToday);
    const explicitMain = unlockedQuizzes.find(q => q.isMainToday);
    if (explicitMain) return explicitMain;

    // 3. Tertiary: The latest unlocked quiz by date / dayNumber
    if (unlockedQuizzes.length > 0) {
      const sorted = [...unlockedQuizzes].sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.dayNumber || 0) - (a.dayNumber || 0);
      });
      return sorted[0];
    }

    // 4. Fallback if all quizzes are future or empty
    return quizzes[0] || INITIAL_QUIZZES[0];
  },

  // Returns all previous and future days (excluding main today, sorted descending by dayNumber)
  getPreviousDaysQuizzes(): DailyQuiz[] {
    const quizzes = this.getQuizzes();
    const mainQuiz = this.getMainTodayQuiz();
    return quizzes
      .filter(q => q.id !== mainQuiz.id)
      .sort((a, b) => (b.dayNumber || 0) - (a.dayNumber || 0));
  },

  setMainDay(quizId: string): void {
    const quizzes = this.getQuizzes().map(q => ({
      ...q,
      isMainToday: q.id === quizId,
    }));
    this.saveQuizzes(quizzes);
    this.dbCrud('set_main_day', { quizId });
  },

  saveOrUpdateQuiz(quiz: DailyQuiz): void {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex(q => q.id === quiz.id);

    // If new quiz is set as main, unset others
    let updated = [...quizzes];
    if (quiz.isMainToday) {
      updated = updated.map(q => ({ ...q, isMainToday: false }));
    }

    if (index >= 0) {
      updated[index] = quiz;
    } else {
      updated.unshift(quiz);
    }
    this.saveQuizzes(updated);
    this.dbCrud('save_quiz', { quiz });
  },

  deleteQuiz(quizId: string): void {
    const quizzes = this.getQuizzes().filter(q => q.id !== quizId);
    this.saveQuizzes(quizzes);
    this.dbCrud('delete_quiz', { quizId });
  },

  // --- Users & Authentication ---
  getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    let users: User[] = [];
    if (!raw) {
      users = INITIAL_USERS;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    } else {
      try {
        users = JSON.parse(raw);
      } catch {
        users = INITIAL_USERS;
      }
    }

    // Always guarantee Kirillos admin exists with required email & pass
    const kirillosEmail = 'kirilloshelal@gmail.com';
    const hasKirillos = users.some(u => u.email?.toLowerCase() === kirillosEmail.toLowerCase());
    if (!hasKirillos) {
      const kirillosAdmin: User = {
        id: 'user-admin-kirillos',
        fullName: 'كيرلس هلال (الخادم المسؤول)',
        email: kirillosEmail,
        password: '123456789',
        phone: '01220001111',
        ageGroup: 'servant',
        role: 'admin',
        totalPoints: 200,
        quizzesSolved: 12,
        currentStreak: 12,
        registeredBy: 'self',
        servantNotes: 'المشرف العام وأدمن مسابقة الكتاب المقدس',
        createdAt: '2026-10-01',
        submissions: []
      };
      users.unshift(kirillosAdmin);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    return users;
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    dispatchChange();
  },

  // Authenticate user with Email or Phone and Password
  authenticate(identifier: string, pass: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!user) {
      return { success: false, error: 'المستخدم غير موجود. يرجى التأكد من البريد أو رقم الهاتف أو إنشاء حساب جديد.' };
    }

    // If user has a password set, verify it
    if (user.password && user.password !== cleanPass) {
      return { success: false, error: 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.' };
    }

    this.setCurrentUser(user.id);
    return { success: true, user };
  },

  getCurrentUser(): User | null {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentId) {
      const found = users.find(u => u.id === currentId);
      if (found) return found;
    }
    // Visitor / Guest mode by default — DO NOT automatically sign in as admin!
    return null;
  },

  setCurrentUser(userId: string | null): void {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
    dispatchChange();
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    dispatchChange();
  },

  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    this.dbCrud('save_user', { user });
  },

  updateUser(updatedUser: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index >= 0) {
      users[index] = updatedUser;
      this.saveUsers(users);
      this.dbCrud('save_user', { user: updatedUser });
    }
  },

  deleteUser(userId: string): void {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
    this.dbCrud('delete_user', { userId });
  },

  // --- Points Adjustment by Admin ---
  adjustUserPoints(userId: string, pointsDelta: number, reason: string, adminName: string): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    users[userIndex].totalPoints = Math.max(0, users[userIndex].totalPoints + pointsDelta);
    this.saveUsers(users);

    const logId = 'log-' + Date.now();
    const logs = this.getPointLogs();
    const newLog: PointLog = {
      id: logId,
      userId,
      userName: users[userIndex].fullName,
      change: pointsDelta,
      reason,
      date: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      adminName,
    };
    logs.unshift(newLog);
    this.savePointLogs(logs);

    this.dbCrud('adjust_points', {
      userId,
      pointsDelta,
      reason,
      adminName,
      logId,
      userName: users[userIndex].fullName,
    });
  },

  // --- Quiz Submission ---
  submitQuiz(userId: string, submission: UserQuizSubmission): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const user = users[userIndex];
    // Strictly prevent re-solving or overwriting: only the first submission counts
    const alreadySolved = user.submissions.some(s => s.quizId === submission.quizId);
    if (alreadySolved) {
      return;
    }

    user.submissions.push(submission);
    user.quizzesSolved += 1;
    user.currentStreak += 1;
    user.totalPoints += submission.score;

    this.saveUsers(users);
    this.dbCrud('submit_quiz', { userId, submission });
  },

  // --- Point Logs ---
  getPointLogs(): PointLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POINT_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.POINT_LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_LOGS;
    }
  },

  savePointLogs(logs: PointLog[]): void {
    localStorage.setItem(STORAGE_KEYS.POINT_LOGS, JSON.stringify(logs));
    dispatchChange();
  },

  // --- Senior Settings ---
  getSeniorSettings(): SeniorSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SENIOR_SETTINGS);
    if (!raw) return DEFAULT_SENIOR_SETTINGS;
    try {
      return { ...DEFAULT_SENIOR_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SENIOR_SETTINGS;
    }
  },

  saveSeniorSettings(settings: SeniorSettings): void {
    localStorage.setItem(STORAGE_KEYS.SENIOR_SETTINGS, JSON.stringify(settings));
    if (typeof document !== 'undefined') {
      if (settings.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }
    dispatchChange();
  },

  // --- Database Configuration (Hostinger / phpMyAdmin MySQL) ---
  getDatabaseConfig(): DatabaseConfig {
    if (typeof localStorage === 'undefined') return DEFAULT_DB_CONFIG;
    const raw = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
    if (!raw) return DEFAULT_DB_CONFIG;
    try {
      return { ...DEFAULT_DB_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_DB_CONFIG;
    }
  },

  saveDatabaseConfig(config: DatabaseConfig): void {
    localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(config));
    // Persist to server config so any connected client automatically links to Hostinger
    try {
      fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {});
    } catch {}
    dispatchChange();
  },

  // Asynchronous real-time CRUD synchronization with Hostinger MySQL / Bridge
  async dbCrud(action: string, payload: any): Promise<{ success: boolean; message?: string }> {
    try {
      const config = this.getDatabaseConfig();
      const res = await fetch('/api/db/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, config }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Real-time DB CRUD sync notice:', err?.message);
      return { success: false, message: err?.message };
    }
  },

  // Pull and synchronize all data from Hostinger MySQL / phpMyAdmin into the website
  async syncWithDatabase(): Promise<{ success: boolean; message: string; fromDb: boolean }> {
    try {
      const config = this.getDatabaseConfig();
      const res = await fetch('/api/db/sync', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      if (data && data.success && data.fromDb) {
        if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
          localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(data.quizzes));
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
        }
        if (Array.isArray(data.pointLogs) && data.pointLogs.length > 0) {
          localStorage.setItem(STORAGE_KEYS.POINT_LOGS, JSON.stringify(data.pointLogs));
        }
        this.saveDatabaseConfig({
          ...config,
          isConnected: true,
          lastChecked: new Date().toLocaleTimeString('ar-EG'),
        });
        dispatchChange();
        return { success: true, message: data.message || 'تمت المزامنة بنجاح مع قاعدة بيانات Hostinger!', fromDb: true };
      }

      return { success: false, message: data?.message || 'لم يتم العثور على قاعدة بيانات متصلة.', fromDb: false };
    } catch (err: any) {
      return { success: false, message: `تعذر الاتصال بالسيرفر: ${err.message}`, fromDb: false };
    }
  },

  // Export full SQL Script for phpMyAdmin import
  generatePhpMyAdminSql(): string {
    const config = this.getDatabaseConfig();
    const prefix = config.tablePrefix || 'cbq_';
    const users = this.getUsers();
    const quizzes = this.getQuizzes();

    return `-- ======================================================
-- مسابقة الكتاب المقدس اليومية - الكنيسة القبطية الأرثوذكسية
-- سكربت إنشاء الجداول وتصدير البيانات لـ phpMyAdmin (Hostinger)
-- تم التوليد بتاريخ: ${new Date().toLocaleString('ar-EG')}
-- قاعدة البيانات: \`${config.database}\`
-- ======================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS \`${prefix}users\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`fullName\` VARCHAR(191) NOT NULL,
  \`email\` VARCHAR(191) DEFAULT NULL,
  \`password\` VARCHAR(191) DEFAULT NULL,
  \`phone\` VARCHAR(32) NOT NULL,
  \`ageGroup\` ENUM('senior', 'youth', 'family', 'servant') DEFAULT 'senior',
  \`role\` ENUM('admin', 'user') DEFAULT 'user',
  \`totalPoints\` INT NOT NULL DEFAULT 0,
  \`quizzesSolved\` INT NOT NULL DEFAULT 0,
  \`currentStreak\` INT NOT NULL DEFAULT 0,
  \`registeredBy\` ENUM('self', 'admin') DEFAULT 'self',
  \`servantNotes\` TEXT DEFAULT NULL,
  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_email\` (\`email\`),
  KEY \`idx_phone\` (\`phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول الأيام والمسابقات (Daily Quizzes)
CREATE TABLE IF NOT EXISTS \`${prefix}daily_quizzes\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`dayNumber\` INT NOT NULL,
  \`dayLabel\` VARCHAR(100) DEFAULT NULL,
  \`date\` DATE NOT NULL,
  \`isMainToday\` TINYINT(1) DEFAULT 0,
  \`testament\` ENUM('old', 'new') DEFAULT 'new',
  \`bookName\` VARCHAR(100) NOT NULL,
  \`chapterNumber\` INT NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`keyVerse\` TEXT DEFAULT NULL,
  \`reflection\` TEXT DEFAULT NULL,
  \`audioUrl\` TEXT NOT NULL,
  \`audioDuration\` VARCHAR(20) DEFAULT '5:00',
  \`versesJson\` LONGTEXT NOT NULL,
  \`questionsJson\` LONGTEXT NOT NULL,
  \`totalPoints\` INT NOT NULL DEFAULT 20,
  \`published\` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_day_number\` (\`dayNumber\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول تسليم الإجابات (Submissions)
CREATE TABLE IF NOT EXISTS \`${prefix}submissions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`userId\` VARCHAR(64) NOT NULL,
  \`quizId\` VARCHAR(64) NOT NULL,
  \`dayNumber\` INT DEFAULT NULL,
  \`score\` INT NOT NULL DEFAULT 0,
  \`maxScore\` INT NOT NULL DEFAULT 0,
  \`answersJson\` LONGTEXT NOT NULL,
  \`status\` ENUM('graded', 'needs_review') DEFAULT 'graded',
  \`submittedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY \`idx_user_quiz\` (\`userId\`, \`quizId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول سجل النقاط والمكافآت (Point Logs)
CREATE TABLE IF NOT EXISTS \`${prefix}point_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`userId\` VARCHAR(64) NOT NULL,
  \`userName\` VARCHAR(191) NOT NULL,
  \`pointsChange\` INT NOT NULL,
  \`reason\` TEXT NOT NULL,
  \`adminName\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- إدخال بيانات المستخدم الأساسي (أدمن كيرلس هلال)
-- ======================================================
INSERT INTO \`${prefix}users\` 
  (\`id\`, \`fullName\`, \`email\`, \`password\`, \`phone\`, \`ageGroup\`, \`role\`, \`totalPoints\`, \`quizzesSolved\`, \`currentStreak\`, \`registeredBy\`)
VALUES 
  ('user-admin-kirillos', 'كيرلس هلال (الخادم المسؤول)', 'kirilloshelal@gmail.com', '123456789', '01220001111', 'servant', 'admin', 200, 12, 12, 'self')
ON DUPLICATE KEY UPDATE \`password\`='123456789', \`role\`='admin';

SET FOREIGN_KEY_CHECKS = 1;
-- ======================================================
-- انتهى السكربت. جاهز للاستيراد في phpMyAdmin
-- ======================================================
`;
  },

  // Export PHP Bridge script that runs locally on Hostinger with zero firewall issues
  generatePhpSyncBridgeScript(): string {
    const config = this.getDatabaseConfig();
    const prefix = config.tablePrefix || 'cbq_';
    const secret = config.bridgeSecret || 'cbq_sec_9a7d4f128e';
    const dbName = config.database || 'u123456789_bible_quiz';
    const dbUser = config.user || 'u123456789_admin';
    const dbPass = config.password || '';
    const dbHost = (config.host && config.host !== 'localhost' && !config.host.startsWith('34.96')) ? config.host : 'localhost';

    const p = prefix;
    const parts = [
      '<?php',
      '/**',
      ' * Bible Quiz - Hostinger Direct PHP Sync Bridge',
      ' * جـسر الربط المباشر مع قاعدة بيانات Hostinger',
      ' */',
      'error_reporting(0);',
      "ini_set('display_errors', '0');",
      "header('Access-Control-Allow-Origin: *');",
      "header('Access-Control-Allow-Methods: GET, POST, OPTIONS');",
      "header('Access-Control-Allow-Headers: Content-Type, X-Bridge-Secret, Authorization');",
      "header('Content-Type: application/json; charset=UTF-8');",
      '',
      "if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {",
      '    http_response_code(200);',
      '    exit;',
      '}',
      '',
      "$EXPECTED_SECRET = '" + secret + "';",
      "$providedSecret = $_SERVER['HTTP_X_BRIDGE_SECRET'] ?? $_GET['secret'] ?? $_POST['secret'] ?? '';",
      "$rawInput = file_get_contents('php://input');",
      "$jsonInput = json_decode($rawInput, true) ?? [];",
      "if (empty($providedSecret) && !empty($jsonInput['secret'])) { $providedSecret = $jsonInput['secret']; }",
      '',
      "if ($providedSecret !== $EXPECTED_SECRET) {",
      "    http_response_code(401);",
      "    echo json_encode(['success' => false, 'message' => 'رمز الأمان السري غير صحيح.'], JSON_UNESCAPED_UNICODE);",
      "    exit;",
      "}",
      '',
      "$dbHost = '" + dbHost + "';",
      "$dbName = '" + dbName + "';",
      "$dbUser = '" + dbUser + "';",
      "$dbPass = '" + dbPass + "';",
      "$prefix = '" + p + "';",
      '',
      "try {",
      '    $pdo = new PDO("mysql:host=localhost;dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [',
      '        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,',
      '        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,',
      '        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"',
      '    ]);',
      "} catch (PDOException $e1) {",
      "    try {",
      '        $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [',
      '            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,',
      '            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,',
      '            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"',
      '        ]);',
      "    } catch (PDOException $e2) {",
      "        echo json_encode(['success' => false, 'message' => 'فشل الاتصال بقاعدة البيانات في Hostinger: ' . $e2->getMessage()], JSON_UNESCAPED_UNICODE);",
      "        exit;",
      "    }",
      "}",
      '',
      "$action = $_GET['action'] ?? $jsonInput['action'] ?? 'ping';",
      '',
      "if ($action === 'ping' || $action === 'test') {",
      '    $stmt = $pdo->query("SHOW TABLES");',
      '    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);',
      "    echo json_encode(['success' => true, 'message' => 'تم الاتصال بنجاح بقاعدة بيانات Hostinger عبر جسر PHP! عدد الجداول الحالية: ' . count($tables), 'tables' => $tables], JSON_UNESCAPED_UNICODE);",
      "    exit;",
      "}",
      '',
      "if ($action === 'sync_tables') {",
      '    $ddl = "',
      '    CREATE TABLE IF NOT EXISTS " . $prefix . "users (',
      '      id VARCHAR(64) NOT NULL PRIMARY KEY,',
      '      fullName VARCHAR(191) NOT NULL,',
      '      email VARCHAR(191) DEFAULT NULL,',
      '      password VARCHAR(191) DEFAULT NULL,',
      '      phone VARCHAR(32) NOT NULL,',
      "      ageGroup ENUM('senior', 'youth', 'family', 'servant') DEFAULT 'senior',",
      "      role ENUM('admin', 'user') DEFAULT 'user',",
      '      totalPoints INT NOT NULL DEFAULT 0,',
      '      quizzesSolved INT NOT NULL DEFAULT 0,',
      '      currentStreak INT NOT NULL DEFAULT 0,',
      "      registeredBy ENUM('self', 'admin') DEFAULT 'self',",
      '      servantNotes TEXT DEFAULT NULL,',
      '      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,',
      '      KEY idx_email (email)',
      '    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
      '',
      '    CREATE TABLE IF NOT EXISTS " . $prefix . "daily_quizzes (',
      '      id VARCHAR(64) NOT NULL PRIMARY KEY,',
      '      dayNumber INT NOT NULL,',
      '      dayLabel VARCHAR(100) DEFAULT NULL,',
      '      date DATE NOT NULL,',
      '      isMainToday TINYINT(1) DEFAULT 0,',
      "      testament ENUM('old', 'new') DEFAULT 'new',",
      '      bookName VARCHAR(100) NOT NULL,',
      '      chapterNumber INT NOT NULL,',
      '      title VARCHAR(255) NOT NULL,',
      '      keyVerse TEXT DEFAULT NULL,',
      '      reflection TEXT DEFAULT NULL,',
      '      audioUrl TEXT NOT NULL,',
      "      audioDuration VARCHAR(20) DEFAULT '5:00',",
      '      versesJson LONGTEXT NOT NULL,',
      '      questionsJson LONGTEXT NOT NULL,',
      '      totalPoints INT NOT NULL DEFAULT 20,',
      '      published TINYINT(1) DEFAULT 1,',
      '      UNIQUE KEY idx_day_number (dayNumber)',
      '    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
      '',
      '    CREATE TABLE IF NOT EXISTS " . $prefix . "submissions (',
      '      id INT AUTO_INCREMENT PRIMARY KEY,',
      '      userId VARCHAR(64) NOT NULL,',
      '      quizId VARCHAR(64) NOT NULL,',
      '      dayNumber INT DEFAULT NULL,',
      '      score INT NOT NULL DEFAULT 0,',
      '      maxScore INT NOT NULL DEFAULT 0,',
      '      answersJson LONGTEXT NOT NULL,',
      "      status ENUM('graded', 'needs_review') DEFAULT 'graded',",
      '      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP',
      '    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
      '',
      '    CREATE TABLE IF NOT EXISTS " . $prefix . "point_logs (',
      '      id VARCHAR(64) NOT NULL PRIMARY KEY,',
      '      userId VARCHAR(64) NOT NULL,',
      '      userName VARCHAR(191) NOT NULL,',
      '      pointsChange INT NOT NULL,',
      '      reason TEXT NOT NULL,',
      '      adminName VARCHAR(191) NOT NULL,',
      '      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP',
      '    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
      '',
      '    INSERT INTO " . $prefix . "users ',
      '      (id, fullName, email, password, phone, ageGroup, role, totalPoints, quizzesSolved, currentStreak, registeredBy)',
      '    VALUES ',
      "      ('user-admin-kirillos', 'كيرلس هلال (الخادم المسؤول)', 'kirilloshelal@gmail.com', '123456789', '01220001111', 'servant', 'admin', 200, 12, 12, 'self')",
      "    ON DUPLICATE KEY UPDATE password='123456789', role='admin';",
      '    ";',
      '    $pdo->exec($ddl);',
      "    echo json_encode(['success' => true, 'message' => 'تم إنشاء وتحديث كافة الجداول وتثبيت حساب أدمن كيرلس هلال بنجاح!'], JSON_UNESCAPED_UNICODE);",
      '    exit;',
      '}',
      '',
      "if ($action === 'pull') {",
      '    $quizzesStmt = $pdo->query("SELECT * FROM " . $prefix . "daily_quizzes ORDER BY dayNumber ASC");',
      '    $rawQuizzes = $quizzesStmt->fetchAll();',
      '    $quizzes = array_map(function($q) {',
      '        $q[\'isMainToday\'] = (bool)$q[\'isMainToday\'];',
      '        $q[\'published\'] = (bool)$q[\'published\'];',
      "        $q['verses'] = json_decode($q['versesJson'] ?? '[]', true) ?: [];",
      "        $q['questions'] = json_decode($q['questionsJson'] ?? '[]', true) ?: [];",
      '        return $q;',
      '    }, $rawQuizzes);',
      '',
      '    $rawSubs = [];',
      '    try {',
      '        $subsStmt = $pdo->query("SELECT * FROM " . $prefix . "submissions ORDER BY submittedAt DESC");',
      '        $rawSubs = $subsStmt->fetchAll();',
      '    } catch (Exception $e) {}',
      '',
      '    $usersStmt = $pdo->query("SELECT * FROM " . $prefix . "users");',
      '    $rawUsers = $usersStmt->fetchAll();',
      '    $users = array_map(function($u) use ($rawSubs) {',
      '        $uSubs = array_values(array_filter($rawSubs, function($s) use ($u) { return $s[\'userId\'] === $u[\'id\']; }));',
      '        $u[\'submissions\'] = array_map(function($s) {',
      '            return [',
      '                \'quizId\' => $s[\'quizId\'],',
      '                \'date\' => substr($s[\'submittedAt\'], 0, 10),',
      '                \'submittedAt\' => $s[\'submittedAt\'],',
      '                \'score\' => (int)$s[\'score\'],',
      '                \'maxScore\' => (int)($s[\'maxScore\'] ?? 20),',
      '                \'answers\' => json_decode($s[\'answersJson\'] ?? \'{}\', true) ?: [],',
      '                \'status\' => $s[\'status\'] ?? \'graded\',',
      '            ];',
      '        }, $uSubs);',
      '        return $u;',
      '    }, $rawUsers);',
      '',
      '    $logsStmt = $pdo->query("SELECT * FROM " . $prefix . "point_logs ORDER BY createdAt DESC");',
      '    $rawLogs = $logsStmt->fetchAll();',
      '    $pointLogs = array_map(function($l) {',
      '        return [',
      "            'id' => $l['id'],",
      "            'userId' => $l['userId'],",
      "            'userName' => $l['userName'],",
      "            'change' => (int)$l['pointsChange'],",
      "            'reason' => $l['reason'],",
      "            'adminName' => $l['adminName'],",
      "            'date' => substr($l['createdAt'], 0, 10),",
      '        ];',
      '    }, $rawLogs);',
      '',
      "    echo json_encode(['success' => true, 'message' => 'تم جلب البيانات بنجاح من Hostinger!', 'quizzes' => $quizzes, 'users' => $users, 'pointLogs' => $pointLogs], JSON_UNESCAPED_UNICODE);",
      '    exit;',
      '}',
      '',
      "if ($action === 'crud') {",
      "    $crudAction = $jsonInput['crud_action'] ?? $_POST['crud_action'] ?? '';",
      "    if ($crudAction === 'save_quiz') {",
      "        $q = $jsonInput['quiz'] ?? [];",
      "        if (!empty($q['id'])) {",
      '            $qSql = "INSERT INTO " . $prefix . "daily_quizzes (id, dayNumber, dayLabel, date, isMainToday, testament, bookName, chapterNumber, title, keyVerse, reflection, audioUrl, audioDuration, versesJson, questionsJson, totalPoints, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), dayLabel=VALUES(dayLabel), isMainToday=VALUES(isMainToday), keyVerse=VALUES(keyVerse), reflection=VALUES(reflection), versesJson=VALUES(versesJson), questionsJson=VALUES(questionsJson), totalPoints=VALUES(totalPoints)";',
      '            $stmt = $pdo->prepare($qSql);',
      "            $stmt->execute([$q['id'], $q['dayNumber'] ?? 1, $q['dayLabel'] ?? null, $q['date'], !empty($q['isMainToday']) ? 1 : 0, $q['testament'] ?? 'new', $q['bookName'] ?? '', $q['chapterNumber'] ?? 1, $q['title'] ?? '', $q['keyVerse'] ?? null, $q['reflection'] ?? null, $q['audioUrl'] ?? '', $q['audioDuration'] ?? '5:00', json_encode($q['verses'] ?? []), json_encode($q['questions'] ?? []), $q['totalPoints'] ?? 20, isset($q['published']) && $q['published'] === false ? 0 : 1]);",
      "            echo json_encode(['success' => true, 'message' => 'تم حفظ الأصحاح في Hostinger!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'delete_quiz') {",
      "        $quizId = $jsonInput['quizId'] ?? '';",
      '        if (!empty($quizId)) {',
      '            $pdo->prepare("DELETE FROM " . $prefix . "daily_quizzes WHERE id = ?")->execute([$quizId]);',
      "            echo json_encode(['success' => true, 'message' => 'تم حذف المسابقة!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'set_main_day') {",
      "        $quizId = $jsonInput['quizId'] ?? '';",
      '        if (!empty($quizId)) {',
      '            $pdo->prepare("UPDATE " . $prefix . "daily_quizzes SET isMainToday = 0")->execute();',
      '            $pdo->prepare("UPDATE " . $prefix . "daily_quizzes SET isMainToday = 1 WHERE id = ?")->execute([$quizId]);',
      "            echo json_encode(['success' => true, 'message' => 'تم تعيين اليوم الرئيسي بنجاح!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'save_user') {",
      "        $u = $jsonInput['user'] ?? [];",
      "        if (!empty($u['id'])) {",
      '            $uSql = "INSERT INTO " . $prefix . "users (id, fullName, email, password, phone, ageGroup, role, totalPoints, quizzesSolved, currentStreak, registeredBy, servantNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE fullName=VALUES(fullName), email=VALUES(email), password=COALESCE(VALUES(password), password), phone=VALUES(phone), ageGroup=VALUES(ageGroup), role=VALUES(role), totalPoints=VALUES(totalPoints), quizzesSolved=VALUES(quizzesSolved), currentStreak=VALUES(currentStreak), servantNotes=VALUES(servantNotes)";',
      '            $stmt = $pdo->prepare($uSql);',
      "            $stmt->execute([$u['id'], $u['fullName'] ?? '', $u['email'] ?? null, $u['password'] ?? null, $u['phone'] ?? '', $u['ageGroup'] ?? 'senior', $u['role'] ?? 'user', $u['totalPoints'] ?? 0, $u['quizzesSolved'] ?? 0, $u['currentStreak'] ?? 0, $u['registeredBy'] ?? 'self', $u['servantNotes'] ?? null]);",
      "            echo json_encode(['success' => true, 'message' => 'تم حفظ المتسابق بنجاح!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'delete_user') {",
      "        $userId = $jsonInput['userId'] ?? '';",
      '        if (!empty($userId)) {',
      '            $pdo->prepare("DELETE FROM " . $prefix . "users WHERE id = ?")->execute([$userId]);',
      '            $pdo->prepare("DELETE FROM " . $prefix . "submissions WHERE userId = ?")->execute([$userId]);',
      '            $pdo->prepare("DELETE FROM " . $prefix . "point_logs WHERE userId = ?")->execute([$userId]);',
      "            echo json_encode(['success' => true, 'message' => 'تم حذف المستخدم وبياناته!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'submit_quiz') {",
      "        $userId = $jsonInput['userId'] ?? '';",
      "        $sub = $jsonInput['submission'] ?? [];",
      "        if (!empty($userId) && !empty($sub['quizId'])) {",
      '            $check = $pdo->prepare("SELECT id FROM " . $prefix . "submissions WHERE userId = ? AND quizId = ?");',
      "            $check->execute([$userId, $sub['quizId']]);",
      '            if ($check->fetch()) {',
      "                echo json_encode(['success' => false, 'message' => 'تم الحل مسبقاً.'], JSON_UNESCAPED_UNICODE);",
      '                exit;',
      '            }',
      '            $stmt = $pdo->prepare("INSERT INTO " . $prefix . "submissions (userId, quizId, score, maxScore, answersJson, status, submittedAt) VALUES (?, ?, ?, ?, ?, ?, NOW())");',
      "            $stmt->execute([$userId, $sub['quizId'], $sub['score'] ?? 0, $sub['maxScore'] ?? 20, json_encode($sub['answers'] ?? []), $sub['status'] ?? 'graded']);",
      '            $pdo->prepare("UPDATE " . $prefix . "users SET totalPoints = totalPoints + ?, quizzesSolved = quizzesSolved + 1, currentStreak = currentStreak + 1 WHERE id = ?")->execute([$sub[\'score\'] ?? 0, $userId]);',
      "            echo json_encode(['success' => true, 'message' => 'تم تسجيل الإجابة بنجاح!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      "    if ($crudAction === 'adjust_points') {",
      "        $userId = $jsonInput['userId'] ?? '';",
      "        $delta = (int)($jsonInput['pointsDelta'] ?? 0);",
      "        $reason = $jsonInput['reason'] ?? '';",
      "        $adminName = $jsonInput['adminName'] ?? 'الخادم';",
      "        $logId = $jsonInput['logId'] ?? ('log-' . time());",
      "        $userName = $jsonInput['userName'] ?? '';",
      '        if (!empty($userId)) {',
      '            $pdo->prepare("INSERT INTO " . $prefix . "point_logs (id, userId, userName, pointsChange, reason, adminName, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())")->execute([$logId, $userId, $userName, $delta, $reason, $adminName]);',
      '            $pdo->prepare("UPDATE " . $prefix . "users SET totalPoints = totalPoints + ? WHERE id = ?")->execute([$delta, $userId]);',
      "            echo json_encode(['success' => true, 'message' => 'تم تعديل النقاط بنجاح!'], JSON_UNESCAPED_UNICODE);",
      '            exit;',
      '        }',
      '    }',
      '}',
      '',
      "if ($action === 'push') {",
      "    $quizzes = $jsonInput['quizzes'] ?? [];",
      "    $users = $jsonInput['users'] ?? [];",
      '    $pdo->beginTransaction();',
      '    if (!empty($users)) {',
      '        $uSql = "INSERT INTO " . $prefix . "users (id, fullName, email, password, phone, ageGroup, role, totalPoints, quizzesSolved, currentStreak, registeredBy, servantNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE fullName=VALUES(fullName), totalPoints=VALUES(totalPoints), quizzesSolved=VALUES(quizzesSolved), currentStreak=VALUES(currentStreak), role=VALUES(role), password=COALESCE(VALUES(password), password)";',
      '        $uStmt = $pdo->prepare($uSql);',
      '        foreach ($users as $u) {',
      "            $uStmt->execute([$u['id'], $u['fullName'], $u['email'] ?? null, $u['password'] ?? null, $u['phone'] ?? '', $u['ageGroup'] ?? 'senior', $u['role'] ?? 'user', $u['totalPoints'] ?? 0, $u['quizzesSolved'] ?? 0, $u['currentStreak'] ?? 0, $u['registeredBy'] ?? 'self', $u['servantNotes'] ?? null]);",
      '        }',
      '    }',
      '    if (!empty($quizzes)) {',
      '        $qSql = "INSERT INTO " . $prefix . "daily_quizzes (id, dayNumber, dayLabel, date, isMainToday, testament, bookName, chapterNumber, title, keyVerse, reflection, audioUrl, audioDuration, versesJson, questionsJson, totalPoints, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), dayLabel=VALUES(dayLabel), isMainToday=VALUES(isMainToday), keyVerse=VALUES(keyVerse), reflection=VALUES(reflection), versesJson=VALUES(versesJson), questionsJson=VALUES(questionsJson), totalPoints=VALUES(totalPoints)";',
      '        $qStmt = $pdo->prepare($qSql);',
      '        foreach ($quizzes as $q) {',
      "            $qStmt->execute([$q['id'], $q['dayNumber'], $q['dayLabel'] ?? null, $q['date'], !empty($q['isMainToday']) ? 1 : 0, $q['testament'] ?? 'new', $q['bookName'], $q['chapterNumber'], $q['title'], $q['keyVerse'] ?? null, $q['reflection'] ?? null, $q['audioUrl'], $q['audioDuration'] ?? '5:00', json_encode($q['verses'] ?? []), json_encode($q['questions'] ?? []), $q['totalPoints'] ?? 20, isset($q['published']) && $q['published'] === false ? 0 : 1]);",
      '        }',
      '    }',
      '    $pdo->commit();',
      "    echo json_encode(['success' => true, 'message' => 'تم حفظ ورفع البيانات بنجاح إلى Hostinger!'], JSON_UNESCAPED_UNICODE);",
      '    exit;',
      '}',
      '',
      "echo json_encode(['success' => false, 'message' => 'إجراء غير معروف'], JSON_UNESCAPED_UNICODE);",
    ];

    return parts.join('\n');
  },

  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.QUIZZES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.POINT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.getQuizzes();
    this.getUsers();
    this.getPointLogs();
    dispatchChange();
  }
};
