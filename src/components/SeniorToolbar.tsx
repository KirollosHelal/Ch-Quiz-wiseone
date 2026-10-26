import React from 'react';
import { Type, Eye, Volume2, UserCheck, Shield, Sparkles } from 'lucide-react';
import { SeniorSettings, StorageService } from '../services/storage';
import { User } from '../types';

interface SeniorToolbarProps {
  settings: SeniorSettings;
  onUpdateSettings: (newSettings: SeniorSettings) => void;
  currentUser: User;
  onSelectUser: (user: User) => void;
  allUsers: User[];
}

export const SeniorToolbar: React.FC<SeniorToolbarProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onSelectUser,
  allUsers,
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
        {/* Left: Elderly Accessibility Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-amber-300 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            تسهيلات القراءة لكبار السن:
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

        {/* Right: Quick Switcher between Parishioner and Servant */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-amber-300/80 whitespace-nowrap">المستخدم الحالي:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = allUsers.find(u => u.id === e.target.value);
              if (selected) {
                StorageService.setCurrentUser(selected.id);
                onSelectUser(selected);
              }
            }}
            className="bg-amber-900/90 text-amber-100 border border-amber-700 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none font-medium cursor-pointer"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                {u.role === 'admin' ? '👑 [الخادم المسؤول] ' : u.ageGroup === 'senior' ? '👴 [كبار السن] ' : '👤 '}
                {u.fullName} ({u.totalPoints} نقطة)
              </option>
            ))}
          </select>

          {currentUser.role === 'admin' && (
            <span className="bg-amber-400 text-amber-950 text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1">
              <Shield className="w-3 h-3" />
              حساب الخادم
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
