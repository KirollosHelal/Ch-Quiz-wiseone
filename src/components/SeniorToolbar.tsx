import React from 'react';
import { Type, Eye, Shield, Sparkles, User as UserIcon, LogIn } from 'lucide-react';
import { SeniorSettings } from '../services/storage';
import { User } from '../types';

interface SeniorToolbarProps {
  settings: SeniorSettings;
  onUpdateSettings: (newSettings: SeniorSettings) => void;
  currentUser: User;
  onOpenAuth: () => void;
}

export const SeniorToolbar: React.FC<SeniorToolbarProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onOpenAuth,
}) => {
  const fontSizes = [
    { level: 0, label: 'عادي (أ)', class: 'text-base' },
    { level: 1, label: 'كبير (أ+)', class: 'text-lg' },
    { level: 2, label: 'كبير جداً (أ++)', class: 'text-xl' },
    { level: 3, label: 'أكبر حجم (أ+++)', class: 'text-2xl' },
  ];

  const handleNextFontSize = () => {
    const nextLevel = (settings.fontSizeLevel + 1) % fontSizes.length;
    onUpdateSettings({ ...settings, fontSizeLevel: nextLevel });
  };

  const handleToggleContrast = () => {
    onUpdateSettings({ ...settings, highContrast: !settings.highContrast });
  };

  return (
    <div className="bg-amber-950 text-amber-100 border-b border-amber-900/60 px-4 py-2 text-sm shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Accessibility Controls for Ejtimaa Al-Hokamaa */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-amber-300 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            تسهيلات القراءة لاجتماع الحكماء:
          </span>

          {/* Font Size button */}
          <button
            onClick={handleNextFontSize}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded-md border border-amber-700/50 transition-colors text-xs font-medium cursor-pointer"
            title="انقر لتكبير أو تصغير حجم الخط"
            aria-label="تغيير حجم الخط"
          >
            <Type className="w-3.5 h-3.5 text-amber-300" />
            <span>حجم الخط:</span>
            <span className="text-amber-300 font-bold">{fontSizes[settings.fontSizeLevel].label}</span>
          </button>

          {/* High Contrast */}
          <button
            onClick={handleToggleContrast}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              settings.highContrast
                ? 'bg-amber-400 text-amber-950 border-amber-300 font-bold'
                : 'bg-amber-900/80 hover:bg-amber-800 text-amber-100 border-amber-700/50'
            }`}
            title="تبديل وضع التباين العالي لقراءة أوضح"
            aria-label="تبديل التباين العالي"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{settings.highContrast ? 'التباين العالي: مُفعل' : 'التباين العالي'}</span>
          </button>
        </div>

        {/* Right: Authenticated User Display (No free dropdown switcher) */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-amber-900/80 px-2.5 py-1 rounded-lg border border-amber-800/80">
            <UserIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-300 text-[11px]">المستخدم الحالي:</span>
            <span className="font-bold text-amber-100 text-xs">{currentUser.fullName}</span>
            <span className="font-mono text-amber-300 font-bold">({currentUser.totalPoints}ن)</span>
          </div>

          {currentUser.role === 'admin' && (
            <span className="bg-amber-400 text-amber-950 text-[10px] px-2 py-0.5 rounded font-black whitespace-nowrap flex items-center gap-1">
              <Shield className="w-3 h-3" />
              المشرف العام
            </span>
          )}

          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 text-amber-300 hover:text-white underline text-[11px] font-medium pr-1 cursor-pointer"
          >
            <LogIn className="w-3 h-3" />
            <span>تبديل / تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
