import React from 'react';
import { User } from '../types';
import { LogIn, LogOut, BookOpen, Calendar, HelpCircle, Trophy, Shield, UserPlus } from 'lucide-react';

export type NavTab = 'today' | 'previous' | 'quiz' | 'leaderboard' | 'admin';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User | null;
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
  const isAdmin = currentUser?.role === 'admin';

  return (
    <>
      {/* 1. Top Header Bar */}
      <header className="bg-stone-900 border-b border-stone-800 text-stone-100 sticky top-0 z-40 backdrop-blur-md bg-stone-900/95">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6 py-2.5 sm:py-3.5">
          {/* Brand Wordmark & Coptic Cross */}
          <button
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2 sm:gap-2.5 text-base sm:text-xl font-black tracking-tight text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src="/src/assets/images/coptic_cross_art_1792934497602.jpg"
              alt="صليب قبطي ذهبي"
              referrerPolicy="no-referrer"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-amber-400/60 shadow-xs"
            />
            <span className="truncate max-w-[170px] sm:max-w-none">مسابقة الكتاب المقدس القبطية</span>
          </button>

          {/* Desktop Navigation Links */}
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

            {isAdmin && (
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

          {/* Right Action: Auth or Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <>
                <button
                  onClick={onOpenProfile}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 sm:gap-2"
                  title="فتح الملف الشخصي وسجل الإجابات"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-700" />
                  <span className="truncate max-w-[85px] sm:max-w-[140px]">{currentUser.fullName}</span>
                  <span className="font-mono text-amber-950 bg-amber-300/80 px-1 py-0.2 rounded text-[11px] sm:text-xs">
                    {currentUser.totalPoints}ن
                  </span>
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer text-xs"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                title="تسجيل الدخول أو إنشاء حساب للمشاركة"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-900" />
                <span>دخول / حساب جديد</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Optimized for One-Hand Reach on Phones) */}
      <nav 
        aria-label="التنقل الرئيسي على الهاتف"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 shadow-2xl safe-area-pb"
      >
        <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
          {/* Tab 1: Today */}
          <button
            onClick={() => onSelectTab('today')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'today'
                ? 'text-amber-400 font-black'
                : 'text-stone-400 hover:text-stone-200 font-medium'
            }`}
          >
            <BookOpen className={`w-5 h-5 mb-0.5 ${currentTab === 'today' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-tight">اليوم الحالي</span>
          </button>

          {/* Tab 2: Previous */}
          <button
            onClick={() => onSelectTab('previous')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'previous'
                ? 'text-amber-400 font-black'
                : 'text-stone-400 hover:text-stone-200 font-medium'
            }`}
          >
            <Calendar className={`w-5 h-5 mb-0.5 ${currentTab === 'previous' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-tight">الأيام السابقة</span>
          </button>

          {/* Tab 3: Quiz */}
          <button
            onClick={() => onSelectTab('quiz')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors cursor-pointer relative ${
              currentTab === 'quiz'
                ? 'text-amber-400 font-black'
                : 'text-stone-400 hover:text-stone-200 font-medium'
            }`}
          >
            <HelpCircle className={`w-5 h-5 mb-0.5 ${currentTab === 'quiz' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-tight">حل الأسئلة</span>
          </button>

          {/* Tab 4: Leaderboard */}
          <button
            onClick={() => onSelectTab('leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'leaderboard'
                ? 'text-amber-400 font-black'
                : 'text-stone-400 hover:text-stone-200 font-medium'
            }`}
          >
            <Trophy className={`w-5 h-5 mb-0.5 ${currentTab === 'leaderboard' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-tight">لوحة الشرف</span>
          </button>

          {/* Tab 5: Admin (if admin) */}
          {isAdmin && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'admin'
                  ? 'text-amber-400 font-black'
                  : 'text-stone-400 hover:text-stone-200 font-medium'
              }`}
            >
              <Shield className={`w-5 h-5 mb-0.5 ${currentTab === 'admin' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] leading-tight">الخادم</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
