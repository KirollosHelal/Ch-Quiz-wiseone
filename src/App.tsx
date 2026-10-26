/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StorageService, SeniorSettings, STORAGE_CHANGE_EVENT } from './services/storage';
import { DailyQuiz, User } from './types';
import { Navbar } from './components/Navbar';
import { SeniorToolbar } from './components/SeniorToolbar';
import { ChapterReader } from './components/ChapterReader';
import { QuizEngine } from './components/QuizEngine';
import { Leaderboard } from './components/Leaderboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAdjustPointsModal } from './components/AdminAdjustPointsModal';
import { AdminRegisterUserModal } from './components/AdminRegisterUserModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Calendar, ChevronLeft, ChevronRight, BookMarked, Sparkles } from 'lucide-react';

export default function App() {
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>(() => StorageService.getQuizzes());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser());
  const [selectedQuiz, setSelectedQuiz] = useState<DailyQuiz>(() => StorageService.getTodayQuiz());
  const [currentTab, setCurrentTab] = useState<'read' | 'quiz' | 'leaderboard' | 'admin'>('read');
  const [seniorSettings, setSeniorSettings] = useState<SeniorSettings>(() => StorageService.getSeniorSettings());

  // Modal states
  const [adjustPointsUser, setAdjustPointsUser] = useState<User | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Sync state on storage event
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

      // Refresh current quiz if it was updated
      setSelectedQuiz(prev => {
        const found = updatedQuizzes.find(q => q.id === prev.id);
        return found || updatedQuizzes[0] || prev;
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

  // Check if current user has solved the active quiz
  const currentSubmission = currentUser.submissions.find(s => s.quizId === selectedQuiz?.id);
  const isCurrentQuizSolved = !!currentSubmission;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-ui text-stone-900 transition-colors duration-200">
      {/* 1. Senior Accessibility & User Switcher Bar */}
      <SeniorToolbar
        settings={seniorSettings}
        onUpdateSettings={handleUpdateSettings}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        allUsers={users}
      />

      {/* 2. Top Navigation Bar (Top Bar Contract) */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
      />

      {/* 3. Daily Chapter Picker Strip (When on Read or Quiz tabs) */}
      {(currentTab === 'read' || currentTab === 'quiz') && (
        <div className="bg-amber-900/10 border-b border-amber-900/20 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 shrink-0">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>اختر الأصحاح:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {quizzes.map((q) => {
                const isSelected = selectedQuiz?.id === q.id;
                const userSolvedThis = currentUser.submissions.some(s => s.quizId === q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuiz(q)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      isSelected
                        ? 'bg-amber-800 text-amber-50 shadow-sm'
                        : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <span>{q.bookName} {q.chapterNumber}</span>
                    {userSolvedThis && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="تم الحل بنجاح" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Body Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {currentTab === 'read' && selectedQuiz && (
          <ChapterReader
            quiz={selectedQuiz}
            settings={seniorSettings}
            onGoToQuiz={() => setCurrentTab('quiz')}
            isSolved={isCurrentQuizSolved}
            score={currentSubmission?.score}
          />
        )}

        {currentTab === 'quiz' && selectedQuiz && (
          <QuizEngine
            key={selectedQuiz.id + currentUser.id}
            quiz={selectedQuiz}
            currentUser={currentUser}
            settings={seniorSettings}
            onBackToReading={() => setCurrentTab('read')}
            onGoToLeaderboard={() => setCurrentTab('leaderboard')}
          />
        )}

        {currentTab === 'leaderboard' && (
          <Leaderboard
            users={users}
            currentUser={currentUser}
            onOpenAdjustPoints={(u) => setAdjustPointsUser(u)}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            quizzes={quizzes}
            users={users}
            currentUser={currentUser}
            onOpenAdjustPoints={(u) => setAdjustPointsUser(u)}
            onOpenRegisterUser={() => setIsRegisterModalOpen(true)}
            onSelectQuizToRead={(q) => {
              setSelectedQuiz(q);
              setCurrentTab('read');
            }}
          />
        )}
      </main>

      {/* 5. Modals */}
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
            setCurrentTab('read');
          }}
        />
      )}

      {/* 6. Respectful Coptic Church Footer */}
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
            بركة صلوات قداسة البابا تواضروس الثاني وآباء الكنيسة
          </div>
        </div>
      </footer>
    </div>
  );
}
