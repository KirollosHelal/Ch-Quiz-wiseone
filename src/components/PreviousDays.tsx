import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, BookOpen, Search, ArrowLeft, Star, Volume2 } from 'lucide-react';
import { DailyQuiz, User } from '../types';

interface PreviousDaysProps {
  quizzes: DailyQuiz[];
  currentUser: User;
  onSelectDayForReading: (quiz: DailyQuiz) => void;
  onSelectDayForQuiz: (quiz: DailyQuiz) => void;
  onSetMainDay?: (quizId: string) => void;
}

export const PreviousDays: React.FC<PreviousDaysProps> = ({
  quizzes,
  currentUser,
  onSelectDayForReading,
  onSelectDayForQuiz,
  onSetMainDay,
}) => {
  const [search, setSearch] = useState('');

  // Sort quizzes by dayNumber descending
  const sorted = [...quizzes].sort((a, b) => (b.dayNumber || 0) - (a.dayNumber || 0));

  const filtered = sorted.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.bookName.toLowerCase().includes(search.toLowerCase()) ||
    `اليوم ${q.dayNumber}`.includes(search)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-900/60 px-3 py-1 rounded-full border border-amber-700/50 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>أرشيف مسابقات الأيام السابقة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-50">
            اختر أي يوم سابق للقراءة وحل المسابقة
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm mt-1">
            لا تفوت أي يوم! يمكنك دائماً الرجوع للأيام الماضية وحل أسئلتها لكسب النقاط لاسمك
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث برقم اليوم أو السفر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-stone-800 text-stone-100 border border-stone-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((quiz) => {
          const submission = currentUser.submissions.find(s => s.quizId === quiz.id);
          const isSolved = !!submission;
          const isMain = quiz.isMainToday;

          return (
            <div
              key={quiz.id}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                isMain ? 'border-2 border-amber-500 ring-4 ring-amber-400/20' : 'border-stone-200'
              }`}
            >
              <div>
                {/* Top Row: Day Tag & Solved Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-black">
                      اليوم {quiz.dayNumber}
                    </span>
                    {isMain && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-stone-950 text-[11px] font-extrabold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        اليوم الرئيسي الحالي
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-stone-500 font-mono">
                    {quiz.date}
                  </span>
                </div>

                {/* Scripture & Title */}
                <h3 className="text-xl font-extrabold text-stone-900 mb-1">
                  {quiz.bookName} - الأصحاح {quiz.chapterNumber}
                </h3>
                <p className="text-stone-600 text-xs line-clamp-2 mb-4 font-medium">
                  {quiz.title}
                </p>

                {/* Key Verse Excerpt */}
                {quiz.keyVerse && (
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 mb-4 text-xs font-scripture text-amber-950 font-bold leading-relaxed">
                    «{quiz.keyVerse.substring(0, 95)}...»
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  {isSolved ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم الحل ({submission?.score} / {quiz.totalPoints} نقطة)</span>
                    </span>
                  ) : (
                    <span className="text-amber-800 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>متاح للحل ({quiz.totalPoints} نقطة)</span>
                    </span>
                  )}

                  <span className="text-stone-400 text-[11px] flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>صوت: {quiz.audioDuration || '5:00'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectDayForReading(quiz)}
                    className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>قراءة وسماع</span>
                  </button>

                  <button
                    onClick={() => onSelectDayForQuiz(quiz)}
                    className={`flex-1 py-2.5 px-3 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSolved
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <span>{isSolved ? 'مراجعة الحل' : 'حل مسابقة اليوم'}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Admin Quick Action: Set as Main Today */}
                {currentUser.role === 'admin' && !isMain && onSetMainDay && (
                  <button
                    onClick={() => onSetMainDay(quiz.id)}
                    className="w-full text-center text-[11px] text-amber-800 hover:text-amber-950 font-bold underline py-1 cursor-pointer"
                  >
                    ⭐ تعيين هذا اليوم كـ «اليوم الرئيسي الحالي» للمتسابقين
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-stone-500 bg-white rounded-3xl border border-stone-200">
          لم يتم العثور على أيام مطابقة لبحثك.
        </div>
      )}
    </div>
  );
};
