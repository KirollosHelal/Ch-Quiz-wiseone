import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentTab: 'read' | 'quiz' | 'leaderboard' | 'admin';
  onSelectTab: (tab: 'read' | 'quiz' | 'leaderboard' | 'admin') => void;
  currentUser: User;
  onOpenProfile: () => void;
  onOpenRegister: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 text-stone-100 sticky top-0 z-40 backdrop-blur-md bg-stone-900/95">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand Wordmark (Single text element in display face, whitespace-nowrap shrink-0) */}
        <button
          onClick={() => onSelectTab('read')}
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

        {/* Zone 2: 4 nav links, 1-2 word labels, single-line (whitespace-nowrap shrink-0) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300">
          <button
            onClick={() => onSelectTab('read')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'read' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            الأصحاح اليومي
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

          <button
            onClick={() => onSelectTab('admin')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              currentTab === 'admin' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : ''
            }`}
          >
            لوحة الخادم
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenProfile}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-700" />
            <span className="truncate max-w-[140px]">{currentUser.fullName}</span>
            <span className="font-mono text-amber-950 bg-amber-300/80 px-1.5 py-0.2 rounded text-xs">
              {currentUser.totalPoints}ن
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Row (clean single line) */}
      <div className="md:hidden flex items-center justify-around border-t border-stone-800 bg-stone-950 px-2 py-2 text-xs font-semibold">
        <button
          onClick={() => onSelectTab('read')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'read' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          الأصحاح
        </button>
        <button
          onClick={() => onSelectTab('quiz')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'quiz' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          الأسئلة
        </button>
        <button
          onClick={() => onSelectTab('leaderboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'leaderboard' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          المتصدرون
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${currentTab === 'admin' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300'}`}
        >
          الخادم
        </button>
      </div>
    </header>
  );
};
