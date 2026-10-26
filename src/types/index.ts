export type QuestionType = 'multiple_choice' | 'complete' | 'true_false' | 'short_answer';

export type AgeGroup = 'senior' | 'youth' | 'family' | 'servant';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  points: number;
  explanation: string;
  verseReference?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correctAnswerIndex: number;
}

export interface CompleteVerseQuestion extends BaseQuestion {
  type: 'complete';
  verseWithBlank: string; // e.g. "وَالْكَلِمَةُ صَارَ [...] وَحَلَّ بَيْنَنَا"
  blankAnswer: string;   // e.g. "جَسَدًا"
  wordBank?: string[];   // Words to pick from for elderly ease
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  statement: string;
  isCorrect: boolean; // true = صح, false = خطأ
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  questionPrompt: string;
  modelAnswer: string;
  keywords: string[];
  maxPoints: number;
}

export type Question = 
  | MultipleChoiceQuestion 
  | CompleteVerseQuestion 
  | TrueFalseQuestion 
  | ShortAnswerQuestion;

export interface ScriptureVerse {
  verse: number;
  text: string;
}

export interface DailyQuiz {
  id: string;
  date: string; // YYYY-MM-DD
  testament: 'old' | 'new';
  bookName: string;
  chapterNumber: number;
  title: string;
  keyVerse: string;
  reflection: string;
  audioUrl: string;
  audioDuration?: string;
  verses: ScriptureVerse[];
  questions: Question[];
  totalPoints: number;
  published: boolean;
}

export interface UserQuizSubmission {
  quizId: string;
  date: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  answers: Record<string, any>;
  status: 'graded' | 'needs_review';
  adminNotes?: string;
}

export interface User {
  id: string;
  fullName: string;
  phone: string;
  ageGroup: AgeGroup;
  role: 'admin' | 'user';
  totalPoints: number;
  quizzesSolved: number;
  currentStreak: number;
  registeredBy: 'self' | 'admin';
  servantNotes?: string;
  createdAt: string;
  submissions: UserQuizSubmission[];
}

export interface PointLog {
  id: string;
  userId: string;
  userName: string;
  change: number; // positive or negative
  reason: string;
  date: string;
  adminName: string;
}
