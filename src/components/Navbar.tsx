import React from 'react';
import { User } from '../types';
import { LogIn, LogOut } from 'lucide-react';

export type NavTab = 'today' | 'previous' | 'quiz' | 'leaderboard' | 'admin';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 text-stone-100 sticky top-0 z-40 backdrop-blur-md bg-stone-900/95">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand Wordmark (Single text element in display face, whitespace-nowrap shrink-0) */}
        <button
          onClick={() => onSelectTab('today')}
          className="flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <img
            src="/src/assets/images/coptic_cross_art_1792934497602.jpg"
            alt="صليب قبطي ذهبي"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-amber-400/60 shadow-xs"
          />
          <span>مسابقة الكتاب المقدس القبطية</span>
        </button>

        {/* Zone 2: Concise nav links, single-line (whitespace-nowrap shrink-0) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-stone-300">
          <button
            onClick={() => onSelectTab('today')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'today' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            اليوم الحالي
          </button>

          <button
            onClick={() => onSelectTab('previous')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'previous' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            الأيام السابقة
          </button>

          <button
            onClick={() => onSelectTab('quiz')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'quiz' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            حل الأسئلة
          </button>

          <button
            onClick={() => onSelectTab('leaderboard')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'leaderboard' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            لوحة الشرف
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                currentTab === 'admin' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
              }`}
            >
              لوحة الخادم
            </button>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action (User profile / Sign in button) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenProfile}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
            title="فتح الملف الشخصي وسجل الإجابات"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-700" />
            <span className="truncate max-w-[120px] sm:max-w-[150px]">{currentUser.fullName}</span>
            <span className="font-mono text-amber-950 bg-amber-300/80 px-1.5 py-0.2 rounded text-xs">
              {currentUser.totalPoints}ن
            </span>
          </button>

          <button
            onClick={onOpenAuth}
            className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer text-xs"
            title="تسجيل الدخول بحساب آخر أو إنشاء حساب"
          >
            <LogIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Row */}
      <div className="md:hidden flex items-center justify-around border-t border-stone-800 bg-stone-950 px-2 py-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => onSelectTab('today')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'today' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          اليوم الحالي
        </button>
        <button
          onClick={() => onSelectTab('previous')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'previous' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          الأيام السابقة
        </button>
        <button
          onClick={() => onSelectTab('quiz')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'quiz' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          الأسئلة
        </button>
        <button
          onClick={() => onSelectTab('leaderboard')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'leaderboard' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          المتصدرون
        </button>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => onSelectTab('admin')}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'admin' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
          >
            الخادم
          </button>
        )}
      </div>
    </header>
  );
};
