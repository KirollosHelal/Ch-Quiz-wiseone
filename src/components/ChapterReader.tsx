import React from 'react';
import { BookOpen, Sparkles, Heart, CheckCircle2, ChevronDown, Bookmark } from 'lucide-react';
import { DailyQuiz } from '../types';
import { SeniorSettings } from '../services/storage';
import { AudioPlayer } from './AudioPlayer';
import headerBgImage from '../assets/images/coptic_bible_header_1792934497575.jpg';

interface ChapterReaderProps {
  quiz: DailyQuiz;
  settings: SeniorSettings;
  onGoToQuiz: () => void;
  isSolved: boolean;
  score?: number;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  quiz,
  settings,
  onGoToQuiz,
  isSolved,
  score,
}) => {
  // Map font scale level to CSS classes
  const fontClassByLevel = [
    'text-lg sm:text-xl leading-relaxed sm:leading-loose',
    'text-xl sm:text-2xl leading-loose',
    'text-2xl sm:text-3xl leading-loose',
    'text-3xl sm:text-4xl leading-loose tracking-wide',
  ][settings.fontSizeLevel] || 'text-xl leading-loose';

  const testamentLabel = quiz.testament === 'new' ? 'العهد الجديد' : 'العهد القديم';

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Chapter Banner & Meta with guaranteed dark background and crisp, high-contrast readable text */}
      <div className="isolate relative text-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-2xl border-2 border-amber-600/50 overflow-hidden min-h-[240px] flex flex-col justify-end w-full bg-stone-950">
        {/* Background photo with high-fidelity scrim */}
        <img
          src={headerBgImage}
          alt="الكتاب المقدس المفتوح في الكنيسة القبطية"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center z-0 opacity-40 mix-blend-luminosity"
        />
        {/* Dual dark scrims ensuring 100% dark background regardless of image rendering or network */}
        <div className="absolute inset-0 bg-stone-950/85 z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-900/90 z-0" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-2.5 flex-wrap">
            <span className="bg-amber-400 text-stone-950 font-black px-2.5 py-1 rounded-lg text-xs shadow-md">
              {quiz.dayLabel || `اليوم ${quiz.dayNumber}`}
            </span>
            <span className="text-stone-400">·</span>
            <span className="font-mono text-amber-200 font-bold bg-stone-900/80 px-2 py-0.5 rounded-md border border-stone-800">{quiz.date}</span>
            <span className="text-stone-400">·</span>
            <span className="bg-stone-900/90 px-2.5 py-0.5 rounded-md text-amber-200 text-xs font-bold border border-amber-500/30">{testamentLabel}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-amber-50 mb-3 tracking-tight drop-shadow-md">
            {quiz.bookName} - الأصحاح {quiz.chapterNumber}
          </h1>

          <p className="text-stone-200 text-sm sm:text-base font-medium mb-5 leading-relaxed drop-shadow-sm max-w-2xl">
            {quiz.title}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onGoToQuiz}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl font-bold text-sm sm:text-base shadow-md transition-all cursor-pointer"
            >
              {isSolved ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                  <span>حللت المسابقة ({score} / {quiz.totalPoints} نقطة) - مراجعة</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5 text-stone-950" />
                  <span>ابدأ حل مسابقة الأصحاح ({quiz.totalPoints} نقطة)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Audio Player for Elders & Parishioners */}
      <AudioPlayer
        audioUrl={quiz.audioUrl}
        chapterTitle={`${quiz.bookName} ${quiz.chapterNumber}`}
        durationHint={quiz.audioDuration}
        autoPlay={settings.autoPlayAudio}
      />

      {/* Key Verse Box with Rich Gold & Dark Contrast */}
      {quiz.keyVerse && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs w-full">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs sm:text-sm mb-2">
            <Bookmark className="w-4 h-4 text-amber-700 shrink-0" />
            <span>آية اليوم للحفظ والبركة:</span>
          </div>
          <p className="text-stone-950 font-scripture text-lg sm:text-2xl font-bold leading-relaxed text-amber-950">
            «{quiz.keyVerse}»
          </p>
        </div>
      )}

      {/* Scripture Reading Section */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-10 shadow-md border border-stone-200 w-full">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              ☦
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">نص الأصحاح المقدس للقراءة</h2>
              <p className="text-xs text-stone-500">اقرأ بتمهل وتأمل قبل الإجابة على الأسئلة</p>
            </div>
          </div>
        </div>

        {/* Verses Container */}
        <div className={`space-y-4 font-scripture ${fontClassByLevel} text-stone-800`}>
          {quiz.verses.map((v) => (
            <div
              key={v.verse}
              className="group hover:bg-amber-50/60 p-2.5 rounded-xl transition-colors flex items-start gap-3"
            >
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full bg-amber-100 text-amber-900 font-sans text-xs font-bold border border-amber-200/80 mt-1 shrink-0 select-none">
                {v.verse}
              </span>
              <p className="text-stone-900 font-scripture text-justify">
                {v.text}
              </p>
            </div>
          ))}
        </div>

        {/* Post-reading call to action */}
        <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50 p-6 rounded-2xl">
          <div>
            <h3 className="font-bold text-base text-stone-900">هل انتهيت من قراءة الأصحاح وسماعه؟</h3>
            <p className="text-xs text-stone-600">اختبر فهمك وشارك في مسابقة اليوم واجمع النقاط لاسمك في لوحة الشرف</p>
          </div>
          <button
            onClick={onGoToQuiz}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap text-base"
          >
            الانتقال للأسئلة الآن ➔
          </button>
        </div>
      </div>

      {/* Father's Spiritual Reflection */}
      {quiz.reflection && (
        <div className="bg-stone-100 border border-stone-300/80 rounded-2xl p-6 text-stone-800 shadow-sm">
          <div className="flex items-center gap-2 text-stone-700 font-bold text-sm mb-2">
            <Heart className="w-4 h-4 text-red-600 fill-current" />
            <span>تأمل روحي في الأصحاح:</span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-stone-700">
            {quiz.reflection}
          </p>
        </div>
      )}
    </div>
  );
};
