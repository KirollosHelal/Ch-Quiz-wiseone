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
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser());
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
  const currentSubmission = currentUser.submissions.find(s => s.quizId === selectedQuiz?.id);
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
          if (tab === 'admin' && currentUser.role !== 'admin') {
            setCurrentTab('today');
            return;
          }
          if (tab === 'today') {
            setSelectedQuiz(mainTodayQuiz);
          }
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          StorageService.logout();
          setIsAuthModalOpen(true);
        }}
      />

      {/* 3. Day Indicator Banner when in 'today' or 'quiz' */}
      {(currentTab === 'today' || currentTab === 'quiz') && selectedQuiz && (
        <div className="bg-amber-900/10 border-b border-amber-900/15 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-amber-700 text-amber-50 font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                <span>{selectedQuiz.dayLabel || `مسابقة اليوم ${selectedQuiz.dayNumber}`}</span>
              </span>
              <span className="font-bold text-stone-800">
                {selectedQuiz.bookName} - الأصحاح {selectedQuiz.chapterNumber}
              </span>
              <span className="text-stone-500 font-mono hidden sm:inline">
                ({selectedQuiz.date})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('previous')}
                className="text-amber-900 hover:text-amber-700 font-bold underline cursor-pointer"
              >
                تصفح الأيام السابقة ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Body Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* TAB 1: MAIN TODAY (اليوم الحالي) */}
        {currentTab === 'today' && selectedQuiz && (
          <div className="space-y-6">
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  ★
                </div>
                <div>
                  <h3 className="font-extrabold text-amber-950 text-sm sm:text-base">
                    اليوم الرئيسي الحالي: {selectedQuiz.dayLabel || `اليوم ${selectedQuiz.dayNumber}`}
                  </h3>
                  <p className="text-xs text-amber-800">
                    اقرأ أو استمع لأصحاح اليوم ثم اضغط على زر حل الأسئلة لتسجيل نقاطك في لوحة الشرف
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentTab('quiz')}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                {isCurrentQuizSolved ? 'مراجعة حل الأسئلة ✓' : 'الانتقال لحل مسابقة اليوم ➔'}
              </button>
            </div>

            <ChapterReader
              quiz={selectedQuiz}
              settings={seniorSettings}
              onGoToQuiz={() => setCurrentTab('quiz')}
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
              setCurrentTab('quiz');
            }}
            onSetMainDay={handleSetMainDay}
          />
        )}

        {/* TAB 3: QUIZ ENGINE (حل الأسئلة) */}
        {currentTab === 'quiz' && selectedQuiz && (
          <QuizEngine
            key={selectedQuiz.id + currentUser.id}
            quiz={selectedQuiz}
            currentUser={currentUser}
            settings={seniorSettings}
            onBackToReading={() => setCurrentTab('today')}
            onGoToLeaderboard={() => setCurrentTab('leaderboard')}
          />
        )}

        {/* TAB 4: LEADERBOARD (لوحة الشرف) */}
        {currentTab === 'leaderboard' && (
          <Leaderboard
            users={users}
            currentUser={currentUser}
            onOpenAdjustPoints={(u) => setAdjustPointsUser(u)}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {/* TAB 5: ADMIN DASHBOARD (لوحة الخادم ومسؤول الموقع - للمشرف فقط) */}
        {currentTab === 'admin' && currentUser.role === 'admin' && (
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
        }}
      />

      {adjustPointsUser && (
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

      {isProfileModalOpen && (
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
