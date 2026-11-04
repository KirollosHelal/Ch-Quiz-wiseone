/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StorageService, SeniorSettings, STORAGE_CHANGE_EVENT } from './services/storage';
import { DailyQuiz, User } from './types';
import { Navbar, NavTab } from './components/Navbar';
import { SeniorToolbar } from './components/SeniorToolbar';
import { ChapterReader } from './components/ChapterReader';
import { QuizEngine } from './components/QuizEngine';
import { PreviousDays } from './components/PreviousDays';
import { Leaderboard } from './components/Leaderboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAdjustPointsModal } from './components/AdminAdjustPointsModal';
import { AdminRegisterUserModal } from './components/AdminRegisterUserModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { Calendar, Star, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>(() => StorageService.getQuizzes());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [selectedQuiz, setSelectedQuiz] = useState<DailyQuiz>(() => StorageService.getMainTodayQuiz());
  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [seniorSettings, setSeniorSettings] = useState<SeniorSettings>(() => StorageService.getSeniorSettings());

  // Modal states
  const [adjustPointsUser, setAdjustPointsUser] = useState<User | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync state on storage change
  useEffect(() => {
    const handleStorageUpdate = () => {
      const updatedQuizzes = StorageService.getQuizzes();
      const updatedUsers = StorageService.getUsers();
      const updatedUser = StorageService.getCurrentUser();
      const updatedSettings = StorageService.getSeniorSettings();

      setQuizzes(updatedQuizzes);
      setUsers(updatedUsers);
      setCurrentUser(updatedUser);
      setSeniorSettings(updatedSettings);

      // Keep selectedQuiz in sync
      setSelectedQuiz(prev => {
        const found = updatedQuizzes.find(q => q.id === prev.id);
        return found || StorageService.getMainTodayQuiz();
      });
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageUpdate);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageUpdate);
  }, []);

  // Update body class for high contrast mode
  useEffect(() => {
    if (seniorSettings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [seniorSettings.highContrast]);

  const handleUpdateSettings = (newSettings: SeniorSettings) => {
    setSeniorSettings(newSettings);
    StorageService.saveSeniorSettings(newSettings);
  };

  const handleSelectQuiz = (quiz: DailyQuiz) => {
    setSelectedQuiz(quiz);
  };

  const handleSetMainDay = (quizId: string) => {
    StorageService.setMainDay(quizId);
    const updated = StorageService.getMainTodayQuiz();
    setSelectedQuiz(updated);
  };

  // Check if current user has solved the active quiz
  const currentSubmission = currentUser?.submissions?.find(s => s.quizId === selectedQuiz?.id);
  const isCurrentQuizSolved = !!currentSubmission;

  const mainTodayQuiz = StorageService.getMainTodayQuiz();

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-ui text-stone-900 transition-colors duration-200">
      {/* 1. Senior Accessibility Toolbar */}
      <SeniorToolbar
        settings={seniorSettings}
        onUpdateSettings={handleUpdateSettings}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Top Navigation Bar (Top Bar Contract) */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'admin') {
            if (currentUser?.role !== 'admin') {
              setIsAuthModalOpen(true);
              return;
            }
          }
          if (tab === 'today') {
            setSelectedQuiz(mainTodayQuiz);
          }
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        onOpenProfile={() => {
          if (currentUser) {
            setIsProfileModalOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          StorageService.logout();
          setCurrentUser(null);
        }}
      />

      {/* 3. Day Indicator Banner when in 'today' or 'quiz' */}
      {(currentTab === 'today' || currentTab === 'quiz') && selectedQuiz && (
        <div className="w-full bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-b border-amber-500/30 px-3 sm:px-6 py-2.5 sm:py-3 shadow-inner">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-stone-950 font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm text-xs">
                <Star className="w-3.5 h-3.5 fill-current text-amber-900" />
                <span>{selectedQuiz.dayLabel || `مسابقة اليوم ${selectedQuiz.dayNumber}`}</span>
              </span>
              <span className="font-extrabold text-amber-100 text-xs sm:text-sm">
                {selectedQuiz.bookName} - الأصحاح {selectedQuiz.chapterNumber}
              </span>
              <span className="text-amber-300/80 font-mono text-[11px] sm:text-xs">
                ({selectedQuiz.date})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('previous')}
                className="text-amber-400 hover:text-amber-300 font-extrabold underline cursor-pointer text-xs flex items-center gap-1 transition-colors"
              >
                <span>تصفح الأيام السابقة</span>
                <span dir="ltr">➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Body Content (With safe padding for mobile bottom bar) */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 md:pb-12 overflow-x-hidden">
        {/* TAB 1: MAIN TODAY (اليوم الحالي) */}
        {currentTab === 'today' && selectedQuiz && (
          <div className="space-y-5 sm:space-y-6 w-full">
            {/* Main Day Header Card with High Contrast, Sharp Readable Typography */}
            <div className="w-full bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 border-2 border-amber-500/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-white relative overflow-hidden">
              {/* Subtle decorative background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3.5 w-full sm:w-auto relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 flex items-center justify-center font-black text-xl shrink-0 shadow-md ring-2 ring-amber-300/60">
                  ★
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      اليوم الرئيسي الحصري
                    </span>
                    <h3 className="font-black text-white text-base sm:text-lg tracking-tight">
                      {selectedQuiz.dayLabel || `اليوم ${selectedQuiz.dayNumber}`}: {selectedQuiz.bookName} (الأصحاح {selectedQuiz.chapterNumber})
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 font-medium leading-relaxed">
                    اقرأ أو استمع لأصحاح اليوم بوضوح، ثم اضغط على زر حل الأسئلة لتسجيل درجاتك في لوحة الشرف اليومية.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!currentUser) {
                    setIsAuthModalOpen(true);
                  } else {
                    setCurrentTab('quiz');
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-lg transition-all transform active:scale-95 cursor-pointer whitespace-nowrap text-center relative z-10 shrink-0"
              >
                {isCurrentQuizSolved ? 'مراجعة حل الأسئلة ✓' : (currentUser ? 'الانتقال لحل مسابقة اليوم ➔' : 'تسجيل الدخول وبدء المسابقة ➔')}
              </button>
            </div>

            <ChapterReader
              quiz={selectedQuiz}
              settings={seniorSettings}
              onGoToQuiz={() => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                } else {
                  setCurrentTab('quiz');
                }
              }}
              isSolved={isCurrentQuizSolved}
              score={currentSubmission?.score}
            />
          </div>
        )}

        {/* TAB 2: PREVIOUS DAYS (الأيام السابقة) */}
        {currentTab === 'previous' && (
          <PreviousDays
            quizzes={quizzes}
            currentUser={currentUser}
            onSelectDayForReading={(quiz) => {
              setSelectedQuiz(quiz);
              setCurrentTab('today');
            }}
            onSelectDayForQuiz={(quiz) => {
              setSelectedQuiz(quiz);
              if (!currentUser) {
                setIsAuthModalOpen(true);
              } else {
                setCurrentTab('quiz');
              }
            }}
            onSetMainDay={handleSetMainDay}
          />
        )}

        {/* TAB 3: QUIZ ENGINE (حل الأسئلة) */}
        {currentTab === 'quiz' && selectedQuiz && (
          <QuizEngine
            key={selectedQuiz.id + (currentUser?.id || 'guest')}
            quiz={selectedQuiz}
            currentUser={currentUser}
            settings={seniorSettings}
            onBackToReading={() => setCurrentTab('today')}
            onGoToLeaderboard={() => setCurrentTab('leaderboard')}
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* TAB 4: LEADERBOARD (لوحة الشرف) */}
        {currentTab === 'leaderboard' && (
          <Leaderboard
            users={users}
            currentUser={currentUser}
            onOpenAdjustPoints={(u) => setAdjustPointsUser(u)}
            onOpenRegisterModal={() => {
              if (currentUser?.role === 'admin') {
                setIsRegisterModalOpen(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }}
          />
        )}

        {/* TAB 5: ADMIN DASHBOARD (لوحة الخادم ومسؤول الموقع - للمشرف فقط) */}
        {currentTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminDashboard
            quizzes={quizzes}
            users={users}
            currentUser={currentUser}
            onOpenAdjustPoints={(u) => setAdjustPointsUser(u)}
            onOpenRegisterUser={() => setIsRegisterModalOpen(true)}
            onSelectQuizToRead={(q) => {
              setSelectedQuiz(q);
              setCurrentTab('today');
            }}
          />
        )}
      </main>

      {/* 5. Modals */}
      {/* Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(authenticatedUser) => {
          setCurrentUser(authenticatedUser);
          setUsers(StorageService.getUsers());
          if (currentTab === 'today') {
            setCurrentTab('quiz');
          }
        }}
      />

      {adjustPointsUser && currentUser && (
        <AdminAdjustPointsModal
          user={adjustPointsUser}
          adminUser={currentUser}
          onClose={() => setAdjustPointsUser(null)}
          onPointsAdjusted={() => {
            setUsers(StorageService.getUsers());
            setCurrentUser(StorageService.getCurrentUser());
          }}
        />
      )}

      {isRegisterModalOpen && (
        <AdminRegisterUserModal
          currentUser={currentUser}
          onClose={() => setIsRegisterModalOpen(false)}
          onUserRegistered={(newU) => {
            setUsers(StorageService.getUsers());
          }}
        />
      )}

      {isProfileModalOpen && currentUser && (
        <UserProfileModal
          user={currentUser}
          quizzes={quizzes}
          onClose={() => setIsProfileModalOpen(false)}
          onSelectQuiz={(q) => {
            setSelectedQuiz(q);
            setCurrentTab('today');
          }}
        />
      )}

      {/* 6. Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 text-stone-400 py-8 px-4 text-xs text-center space-y-2 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-300 font-bold">
            <span className="text-amber-400 text-base">☦</span>
            <span>مسابقة الكتاب المقدس اليومية - الكنيسة القبطية الأرثوذكسية</span>
          </div>

          <div className="text-stone-400">
            «سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي» (مزمور 119: 105)
          </div>

          <div className="text-stone-500">
            المشرف العام: كيرلس هلال
          </div>
        </div>
      </footer>
    </div>
  );
}
