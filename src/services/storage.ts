import { DailyQuiz, User, PointLog, UserQuizSubmission } from '../types';
import { INITIAL_QUIZZES, INITIAL_USERS, INITIAL_LOGS } from '../data/seedData';

const STORAGE_KEYS = {
  QUIZZES: 'coptic_bible_quizzes_v1',
  USERS: 'coptic_bible_users_v1',
  CURRENT_USER_ID: 'coptic_bible_current_user_id_v1',
  POINT_LOGS: 'coptic_bible_point_logs_v1',
  SENIOR_SETTINGS: 'coptic_bible_senior_settings_v1',
};

export interface SeniorSettings {
  fontSizeLevel: number; // 0: Normal (18px), 1: Large (22px), 2: Extra Large (26px), 3: Super Large (32px)
  highContrast: boolean;
  autoPlayAudio: boolean;
  showVowelMarks: boolean; // التشكيل
}

const DEFAULT_SENIOR_SETTINGS: SeniorSettings = {
  fontSizeLevel: 1, // Start with Large by default for elderly comfort!
  highContrast: false,
  autoPlayAudio: false,
  showVowelMarks: true,
};

// Custom event name for instant state reactivity
export const STORAGE_CHANGE_EVENT = 'coptic_bible_storage_changed';

function dispatchChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT));
  }
}

export const StorageService = {
  // --- Quizzes ---
  getQuizzes(): DailyQuiz[] {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(INITIAL_QUIZZES));
      return INITIAL_QUIZZES;
    }
    try {
      return JSON.parse(raw);
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

  getTodayQuiz(): DailyQuiz {
    const quizzes = this.getQuizzes();
    const todayStr = new Date().toISOString().split('T')[0];
    const found = quizzes.find(q => q.date === todayStr);
    return found || quizzes[0];
  },

  saveOrUpdateQuiz(quiz: DailyQuiz): void {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex(q => q.id === quiz.id);
    if (index >= 0) {
      quizzes[index] = quiz;
    } else {
      quizzes.unshift(quiz);
    }
    this.saveQuizzes(quizzes);
  },

  deleteQuiz(quizId: string): void {
    const quizzes = this.getQuizzes().filter(q => q.id !== quizId);
    this.saveQuizzes(quizzes);
  },

  // --- Users ---
  getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    dispatchChange();
  },

  getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentId) {
      const found = users.find(u => u.id === currentId);
      if (found) return found;
    }
    // Default to senior user 1 to demonstrate senior UI immediately
    const defaultUser = users.find(u => u.id === 'user-senior-1') || users[0];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, defaultUser.id);
    return defaultUser;
  },

  setCurrentUser(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    dispatchChange();
  },

  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  },

  updateUser(updatedUser: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index >= 0) {
      users[index] = updatedUser;
      this.saveUsers(users);
    }
  },

  deleteUser(userId: string): void {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
  },

  // --- Points Adjustment by Admin ---
  adjustUserPoints(userId: string, pointsDelta: number, reason: string, adminName: string): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    users[userIndex].totalPoints = Math.max(0, users[userIndex].totalPoints + pointsDelta);
    this.saveUsers(users);

    // Record log
    const logs = this.getPointLogs();
    const newLog: PointLog = {
      id: 'log-' + Date.now(),
      userId,
      userName: users[userIndex].fullName,
      change: pointsDelta,
      reason,
      date: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      adminName,
    };
    logs.unshift(newLog);
    this.savePointLogs(logs);
  },

  // --- Quiz Submission ---
  submitQuiz(userId: string, submission: UserQuizSubmission): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const user = users[userIndex];
    const existingSubIndex = user.submissions.findIndex(s => s.quizId === submission.quizId);

    if (existingSubIndex >= 0) {
      // Update existing submission
      user.submissions[existingSubIndex] = submission;
    } else {
      user.submissions.push(submission);
      user.quizzesSolved += 1;
      user.currentStreak += 1;
      user.totalPoints += submission.score;
    }

    this.saveUsers(users);
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

  // --- Reset to seed or Export / Import ---
  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.QUIZZES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.POINT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.getQuizzes();
    this.getUsers();
    this.getPointLogs();
    dispatchChange();
  },

  exportJSON(): string {
    return JSON.stringify({
      quizzes: this.getQuizzes(),
      users: this.getUsers(),
      logs: this.getPointLogs(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  },

  importJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.quizzes) && Array.isArray(data.users)) {
        this.saveQuizzes(data.quizzes);
        this.saveUsers(data.users);
        if (Array.isArray(data.logs)) {
          this.savePointLogs(data.logs);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};
