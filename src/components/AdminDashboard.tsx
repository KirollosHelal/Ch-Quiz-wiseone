import React, { useState } from 'react';
import { 
  PlusCircle, BookOpen, Users, Award, Trash2, Edit3, 
  CheckCircle, FileText, Download, Upload, RefreshCw, 
  Plus, Check, X, SlidersHorizontal, UserPlus, Sparkles,
  Database, Server, Copy, ExternalLink, ShieldCheck, AlertCircle, Calendar, Star
} from 'lucide-react';
import { DailyQuiz, Question, QuestionType, User, ScriptureVerse, DatabaseConfig } from '../types';
import { StorageService } from '../services/storage';

interface AdminDashboardProps {
  quizzes: DailyQuiz[];
  users: User[];
  currentUser: User;
  onOpenAdjustPoints: (user: User) => void;
  onOpenRegisterUser: () => void;
  onSelectQuizToRead: (quiz: DailyQuiz) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  quizzes,
  users,
  currentUser,
  onOpenAdjustPoints,
  onOpenRegisterUser,
  onSelectQuizToRead,
}) => {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'users' | 'add_quiz' | 'point_logs' | 'database'>('quizzes');

  // New Chapter Form State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [dayNumber, setDayNumber] = useState<number>(quizzes.length + 1);
  const [dayLabel, setDayLabel] = useState<string>(`اليوم ${quizzes.length + 1}`);
  const [isMainToday, setIsMainToday] = useState<boolean>(true);
  const [bookName, setBookName] = useState<string>('إنجيل متى');
  const [chapterNumber, setChapterNumber] = useState<number>(5);
  const [testament, setTestament] = useState<'old' | 'new'>('new');
  const [chapterTitle, setChapterTitle] = useState<string>('الموعظة على الجبل - التطويبات ونور العالم');
  const [keyVerse, setKeyVerse] = useState<string>('طُوبَى لِلأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ. (مت 5: 8)');
  const [reflection, setReflection] = useState<string>('دستور الحياة المسيحية ونقاء القلب لنكون نوراً وملحاً للعالم.');
  const [audioUrl, setAudioUrl] = useState<string>('https://media.blubrry.com/coptic_audio/archive.org/download/StTakla.Org-Arabic-Bible-Audio-01-Matthew/40_Matthew_05.mp3');
  const [audioDuration, setAudioDuration] = useState<string>('6:15');
  const [quizDate, setQuizDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [versesText, setVersesText] = useState<string>(
    '1 وَلَمَّا رَأَى الْجُمُوعَ صَعِدَ إِلَى الْجَبَلِ، فَلَمَّا جَلَسَ تَقَدَّمَ إِلَيْهِ تَلاَمِيذُهُ.\n2 فَفَتَحَ فَاهُ وَعَلَّمَهُمْ قَائِلاً:\n3 «طُوبَى لِلْمَسَاكِينِ بِالرُّوحِ، لأَنَّ لَهُمْ مَلَكُوتَ السَّمَاوَاتِ.\n4 طُوبَى لِلْحَزَانَى، لأَنَّهُمْ يُعَزَّوْنَ.\n5 طُوبَى لِلْوُدَعَاءِ، لأَنَّهُمْ يَرِثُونَ الأَرْضَ.\n8 طُوبَى لِلأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ.\n14 أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَلٍ.'
  );

  // Questions for the new/edited quiz
  const [questionsList, setQuestionsList] = useState<Question[]>([
    {
      id: 'q-demo-1',
      type: 'multiple_choice',
      title: 'ما هي مكافأة أنقياء القلب حسب الموعظة على الجبل في الآية 8؟',
      options: ['يعاينون الله', 'يرثون الأرض', 'يملكون الذهب', 'يعلمون الأمم'],
      correctAnswerIndex: 0,
      points: 5,
      verseReference: 'متى 5: 8',
      explanation: 'الآية 8: «طُوبَى لِلأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ».'
    }
  ]);

  // Current question builder state
  const [isAddingQuestion, setIsAddingQuestion] = useState<boolean>(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple_choice');
  const [qTitle, setQTitle] = useState<string>('');
  const [qPoints, setQPoints] = useState<number>(5);
  const [qExplanation, setQExplanation] = useState<string>('');
  const [qVerseRef, setQVerseRef] = useState<string>('');

  // Fields for multiple choice
  const [mcOptions, setMcOptions] = useState<string[]>(['', '', '', '']);
  const [mcCorrectIdx, setMcCorrectIdx] = useState<number>(0);

  // Fields for complete verse
  const [completeVerseWithBlank, setCompleteVerseWithBlank] = useState<string>('طُوبَى لِلْحَزَانَى، لأَنَّهُمْ [...]');
  const [completeBlankAnswer, setCompleteBlankAnswer] = useState<string>('يُعَزَّوْنَ');
  const [completeWordBank, setCompleteWordBank] = useState<string>('يُعَزَّوْنَ، يَفْرَحُونَ، يَمْلِكُونَ');

  // Fields for true/false
  const [tfStatement, setTfStatement] = useState<string>('قال السيد المسيح: أنتم نور العالم ولا يمكن أن تخفى مدينة على جبل');
  const [tfIsCorrect, setTfIsCorrect] = useState<boolean>(true);

  // Fields for short answer
  const [saPrompt, setSaPrompt] = useState<string>('كيف نكون نوراً للعالم في سلوكنا اليومي حسب تعاليم المسيح؟');
  const [saModelAnswer, setSaModelAnswer] = useState<string>('بأعمالنا الصالحة ومحبتنا ليمجدوا أبانا الذي في السماوات');
  const [saKeywords, setSaKeywords] = useState<string>('أعمال صالحة, محبة, سلام, نور, تمجيد الله');

  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Database Tab States (Hostinger MySQL / phpMyAdmin)
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(() => StorageService.getDatabaseConfig());
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingTables, setIsSyncingTables] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const resetQuestionForm = () => {
    setIsAddingQuestion(false);
    setQTitle('');
    setQPoints(5);
    setQExplanation('');
    setQVerseRef('');
    setMcOptions(['', '', '', '']);
    setMcCorrectIdx(0);
    setCompleteVerseWithBlank('');
    setCompleteBlankAnswer('');
    setCompleteWordBank('');
    setTfStatement('');
    setTfIsCorrect(true);
    setSaPrompt('');
    setSaModelAnswer('');
    setSaKeywords('');
  };

  const handleSaveQuestion = () => {
    if (!qTitle.trim() && selectedQuestionType !== 'complete' && selectedQuestionType !== 'true_false' && selectedQuestionType !== 'short_answer') {
      alert('يرجى كتابة نص السؤال');
      return;
    }

    let newQ: Question;

    if (selectedQuestionType === 'multiple_choice') {
      const validOptions = mcOptions.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        alert('يرجى إدخال خيارين على الأقل');
        return;
      }
      newQ = {
        id: 'q-' + Date.now(),
        type: 'multiple_choice',
        title: qTitle.trim(),
        options: validOptions,
        correctAnswerIndex: Math.min(mcCorrectIdx, validOptions.length - 1),
        points: qPoints,
        explanation: qExplanation.trim(),
        verseReference: qVerseRef.trim(),
      };
    } else if (selectedQuestionType === 'complete') {
      newQ = {
        id: 'q-' + Date.now(),
        type: 'complete',
        title: qTitle.trim() || 'أكمل الآية المباركة:',
        verseWithBlank: completeVerseWithBlank.trim(),
        blankAnswer: completeBlankAnswer.trim(),
        wordBank: completeWordBank.split(/[,،]+/).map(w => w.trim()).filter(Boolean),
        points: qPoints,
        explanation: qExplanation.trim(),
        verseReference: qVerseRef.trim(),
      };
    } else if (selectedQuestionType === 'true_false') {
      newQ = {
        id: 'q-' + Date.now(),
        type: 'true_false',
        title: qTitle.trim() || 'صح أم خطأ:',
        statement: tfStatement.trim(),
        isCorrect: tfIsCorrect,
        points: qPoints,
        explanation: qExplanation.trim(),
        verseReference: qVerseRef.trim(),
      };
    } else {
      newQ = {
        id: 'q-' + Date.now(),
        type: 'short_answer',
        title: qTitle.trim() || 'سؤال مقالي أو تأملي:',
        questionPrompt: saPrompt.trim(),
        modelAnswer: saModelAnswer.trim(),
        keywords: saKeywords.split(/[,،]+/).map(k => k.trim()).filter(Boolean),
        maxPoints: qPoints,
        points: qPoints,
        explanation: qExplanation.trim(),
        verseReference: qVerseRef.trim(),
      };
    }

    setQuestionsList(prev => [...prev, newQ]);
    resetQuestionForm();
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestionsList(prev => prev.filter(q => q.id !== qId));
  };

  const parseVersesFromText = (raw: string): ScriptureVerse[] => {
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    return lines.map((line, idx) => {
      const match = line.match(/^(\d+)[\s.:-]+(.*)/);
      if (match) {
        return { verse: parseInt(match[1]), text: match[2].trim() };
      }
      return { verse: idx + 1, text: line.trim() };
    });
  };

  const handleSaveWholeQuiz = (e: React.FormEvent) => {
    e.preventDefault();

    if (questionsList.length === 0) {
      alert('يرجى إضافة سؤال واحد على الأقل قبل حفظ الأصحاح');
      return;
    }

    const parsedVerses = parseVersesFromText(versesText);
    const totalPts = questionsList.reduce((sum, q) => sum + q.points, 0);

    const newQuiz: DailyQuiz = {
      id: editingQuizId || 'quiz-day-' + dayNumber + '-' + Date.now(),
      dayNumber: Number(dayNumber),
      dayLabel: dayLabel.trim() || `اليوم ${dayNumber}`,
      isMainToday: isMainToday,
      date: quizDate,
      testament,
      bookName: bookName.trim(),
      chapterNumber: Number(chapterNumber),
      title: chapterTitle.trim(),
      keyVerse: keyVerse.trim(),
      reflection: reflection.trim(),
      audioUrl: audioUrl.trim(),
      audioDuration: audioDuration.trim() || '5:00',
      verses: parsedVerses,
      questions: questionsList,
      totalPoints: totalPts,
      published: true,
    };

    StorageService.saveOrUpdateQuiz(newQuiz);
    setSaveSuccessNotice(`تم حفظ مسابقة «${newQuiz.dayLabel}» بنجاح!`);
    setTimeout(() => {
      setSaveSuccessNotice(null);
      setActiveTab('quizzes');
      setEditingQuizId(null);
    }, 1500);
  };

  const handleEditQuiz = (q: DailyQuiz) => {
    setEditingQuizId(q.id);
    setDayNumber(q.dayNumber || 1);
    setDayLabel(q.dayLabel || `اليوم ${q.dayNumber || 1}`);
    setIsMainToday(!!q.isMainToday);
    setBookName(q.bookName);
    setChapterNumber(q.chapterNumber);
    setTestament(q.testament);
    setChapterTitle(q.title);
    setKeyVerse(q.keyVerse);
    setReflection(q.reflection);
    setAudioUrl(q.audioUrl);
    setAudioDuration(q.audioDuration || '5:00');
    setQuizDate(q.date);
    setVersesText(q.verses.map(v => `${v.verse} ${v.text}`).join('\n'));
    setQuestionsList(q.questions);
    setActiveTab('add_quiz');
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا اليوم ومسابقته؟')) {
      StorageService.deleteQuiz(quizId);
    }
  };

  // Test Hostinger MySQL DB connection via backend
  const handleTestDatabaseConnection = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);

    StorageService.saveDatabaseConfig(dbConfig);

    try {
      const res = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      const data = await res.json();
      setDbTestResult({
        success: data.success,
        message: data.message,
      });
      if (data.success) {
        setDbConfig(prev => ({ ...prev, isConnected: true, lastChecked: new Date().toLocaleTimeString('ar-EG') }));
        StorageService.saveDatabaseConfig({ ...dbConfig, isConnected: true });
      }
    } catch (err: any) {
      setDbTestResult({
        success: false,
        message: `تعذر الاتصال بالخادم: ${err.message || 'خطأ غير متوقع'}`,
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  // Auto-sync / create tables in MySQL
  const handleSyncTables = async () => {
    setIsSyncingTables(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/db/sync-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      const data = await res.json();
      setSyncResult({
        success: data.success,
        message: data.message,
      });
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: `تعذر تنفيذ سكربت الجداول: ${err.message}`,
      });
    } finally {
      setIsSyncingTables(false);
    }
  };

  // Download SQL for phpMyAdmin
  const handleDownloadSql = () => {
    const sql = StorageService.generatePhpMyAdminSql();
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `coptic_bible_quiz_${dbConfig.database || 'db'}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy SQL script to clipboard
  const handleCopySql = () => {
    const sql = StorageService.generatePhpMyAdminSql();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const logs = StorageService.getPointLogs();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            لوحة تحكم المشرف العام (كيرلس هلال)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            إدارة مسابقة الأيام وقاعدة البيانات
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            إضافة أيام جديدة، تسجيل وتعديل نقاط المخدومين، وربط قاعدة بيانات Hostinger عبر phpMyAdmin
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingQuizId(null);
              setDayNumber(quizzes.length + 1);
              setDayLabel(`اليوم ${quizzes.length + 1}`);
              setActiveTab('add_quiz');
            }}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة يوم ومسابقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: 'quizzes', label: '📅 أيام المسابقة والأرشيف', count: quizzes.length },
          { id: 'users', label: '👥 المتسابقون والمخدومون', count: users.length },
          { id: 'add_quiz', label: editingQuizId ? '✏️ تعديل اليوم' : '➕ إضافة يوم جديد' },
          { id: 'point_logs', label: '📜 سجل النقاط', count: logs.length },
          { id: 'database', label: '🗄️ قاعدة بيانات Hostinger (SQL)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-amber-800 text-amber-100' : 'bg-stone-200 text-stone-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Quizzes / Days List */}
      {activeTab === 'quizzes' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-md divide-y divide-stone-100 overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">الأيام المنشورة بالمسابقة</h3>
            <span className="text-xs text-stone-500">{quizzes.length} يوم متاح للمتسابقين</span>
          </div>

          {[...quizzes].sort((a, b) => (b.dayNumber || 0) - (a.dayNumber || 0)).map((q) => (
            <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-xl">
                    اليوم {q.dayNumber}
                  </span>
                  {q.isMainToday && (
                    <span className="text-xs font-bold bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      اليوم الرئيسي الحالي
                    </span>
                  )}
                  <span className="text-xs text-stone-500 font-mono">
                    {q.date}
                  </span>
                </div>
                <h4 className="font-extrabold text-stone-900 text-lg">
                  {q.bookName} - الأصحاح {q.chapterNumber}
                </h4>
                <p className="text-xs text-stone-600">{q.title}</p>
                <div className="flex items-center gap-3 text-xs text-stone-500 pt-1">
                  <span>{q.verses.length} آية</span>
                  <span>·</span>
                  <span className="font-bold text-amber-700">{q.questions.length} أسئلة ({q.totalPoints} نقطة)</span>
                  <span>·</span>
                  <span>مدة الصوت: {q.audioDuration || '5:00'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {!q.isMainToday && (
                  <button
                    onClick={() => StorageService.setMainDay(q.id)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="جعله اليوم الرئيسي الحالي"
                  >
                    تعيين كـ رئيسي
                  </button>
                )}
                <button
                  onClick={() => onSelectQuizToRead(q)}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  معاينة
                </button>
                <button
                  onClick={() => handleEditQuiz(q)}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>
                <button
                  onClick={() => handleDeleteQuiz(q.id)}
                  className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  title="حذف هذا اليوم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Users Management & Points Adjust */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-md overflow-hidden space-y-4">
          <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">قائمة المتسابقين والمخدومين</h3>
              <p className="text-xs text-stone-500">تسجيل مخدومين جدد أو تعديل رصيد النقاط لأي متسابق</p>
            </div>
            <button
              onClick={onOpenRegisterUser}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل مخدوم جديد</span>
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900 text-base">{u.fullName}</h4>
                    {u.role === 'admin' && (
                      <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded">
                        👑 مسؤول
                      </span>
                    )}
                    {u.ageGroup === 'senior' && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                        👴 اجتماع الحكماء
                      </span>
                    )}
                    {u.registeredBy === 'admin' && (
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                        سجله الخادم
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                    {u.email && <span>البريد: {u.email}</span>}
                    <span>الهاتف: {u.phone}</span>
                    <span>·</span>
                    <span>حل {u.quizzesSolved} مسابقة</span>
                    <span>·</span>
                    <span>تتابع: {u.currentStreak} أيام</span>
                  </div>
                  {u.servantNotes && (
                    <p className="text-xs text-amber-800 bg-amber-50/70 p-1.5 rounded-lg mt-2 inline-block">
                      ملاحظة الخادم: {u.servantNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-left font-mono">
                    <span className="text-xl font-black text-amber-900">{u.totalPoints}</span>
                    <span className="text-xs text-stone-500 mr-1">نقطة</span>
                  </div>
                  <button
                    onClick={() => onOpenAdjustPoints(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تعديل النقاط</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Add / Edit Chapter Form by Day */}
      {activeTab === 'add_quiz' && (
        <form onSubmit={handleSaveWholeQuiz} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-xl font-bold text-stone-900">
                {editingQuizId ? 'تعديل مسابقة اليوم' : 'إضافة يوم ومسابقة جديدة'}
              </h3>
              <p className="text-xs text-stone-500">
                حدد رقم اليوم، وتاريخه، وبيانات السفر والأصحاح والتسجيل الصوتي والأسئلة
              </p>
            </div>
            {editingQuizId && (
              <button
                type="button"
                onClick={() => {
                  setEditingQuizId(null);
                  setActiveTab('quizzes');
                }}
                className="text-xs text-rose-600 font-bold underline"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          {saveSuccessNotice && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-center font-bold flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              <span>{saveSuccessNotice}</span>
            </div>
          )}

          {/* Day configuration Row */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">
                رقم اليوم (بالترتيب): *
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={dayNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setDayNumber(val);
                  setDayLabel(`اليوم ${val}`);
                }}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono text-base font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">
                تسمية اليوم في الواجهة:
              </label>
              <input
                type="text"
                value={dayLabel}
                onChange={(e) => setDayLabel(e.target.value)}
                placeholder="مثال: اليوم الأول، اليوم الثاني..."
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={isMainToday}
                  onChange={(e) => setIsMainToday(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>تعيين كـ «اليوم الرئيسي الحالي» في الصفحة الأولى</span>
              </label>
            </div>
          </div>

          {/* Grid row: Date, Testament, Book, Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">تاريخ المسابقة:</label>
              <input
                type="date"
                value={quizDate}
                onChange={(e) => setQuizDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">العهد:</label>
              <select
                value={testament}
                onChange={(e) => setTestament(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="new">العهد الجديد</option>
                <option value="old">العهد القديم</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">اسم السفر:</label>
              <input
                type="text"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="مثال: إنجيل يوحنا"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">رقم الأصحاح:</label>
              <input
                type="number"
                min={1}
                max={150}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Chapter Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">عنوان الأصحاح أو موضوع اليوم:</label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="مثال: الموعظة على الجبل - التطويبات"
              className="w-full p-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Audio Link & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                رابط الملف الصوتي للأصحاح (MP3):
              </label>
              <input
                type="url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/audio/chapter.mp3"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">مدة المقطع التقريبية:</label>
              <input
                type="text"
                value={audioDuration}
                onChange={(e) => setAudioDuration(e.target.value)}
                placeholder="مثال: 5:30"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Key Verse & Reflection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">آية اليوم للحفظ:</label>
              <input
                type="text"
                value={keyVerse}
                onChange={(e) => setKeyVerse(e.target.value)}
                placeholder="«طوبى لأنقياء القلب...»"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">تأمل روحي في الأصحاح:</label>
              <input
                type="text"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="تأمل مقتضب ومفيد..."
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Scripture Verses Text */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              نص آيات الأصحاح للقراءة (ضع رقم الآية أول السطر):
            </label>
            <textarea
              rows={6}
              value={versesText}
              onChange={(e) => setVersesText(e.target.value)}
              placeholder="1 في البدء كان الكلمة...\n2 هذا كان في البدء عند الله..."
              className="w-full p-3 rounded-xl border border-stone-300 font-scripture text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Questions section */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base">أسئلة اليوم ({questionsList.length} سؤال)</h4>
                <p className="text-xs text-stone-500">اختر نوع السؤال قبل كتابته: اختيار من متعدد، أكمل، صح أم خطأ، أو مقالي</p>
              </div>

              {!isAddingQuestion && (
                <button
                  type="button"
                  onClick={() => setIsAddingQuestion(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال جديد</span>
                </button>
              )}
            </div>

            {/* List of currently created questions */}
            <div className="space-y-3">
              {questionsList.map((q, idx) => (
                <div key={q.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-stone-500">
                        {q.type === 'multiple_choice' && 'اختيار من متعدد'}
                        {q.type === 'complete' && 'أكمل الآية'}
                        {q.type === 'true_false' && 'صح أم خطأ'}
                        {q.type === 'short_answer' && 'سؤال مقالي'}
                      </span>
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        {q.points} نقاط
                      </span>
                    </div>
                    <h5 className="font-bold text-stone-900 text-sm">{q.title}</h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-stone-400 hover:text-rose-600 p-1 rounded"
                    title="حذف هذا السؤال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Interactive Question Creator Form */}
            {isAddingQuestion && (
              <div className="p-6 bg-amber-50/60 rounded-3xl border-2 border-amber-300 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                  <h5 className="font-bold text-amber-950 text-sm">
                    الخطوة 1: اختر نوع السؤال أولاً
                  </h5>
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="text-stone-500 hover:text-stone-800 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                </div>

                {/* Question Type Chooser */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'multiple_choice', label: 'اختيار من متعدد' },
                    { type: 'complete', label: 'أكمل الآية' },
                    { type: 'true_false', label: 'صح أم خطأ' },
                    { type: 'short_answer', label: 'إجابة قصيرة / مقالي' },
                  ].map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setSelectedQuestionType(t.type as QuestionType)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedQuestionType === t.type
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Common fields */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      نص السؤال أو التوجيه:
                    </label>
                    <input
                      type="text"
                      value={qTitle}
                      onChange={(e) => setQTitle(e.target.value)}
                      placeholder="اكتب السؤال بوضوح..."
                      className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">النقاط:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={qPoints}
                      onChange={(e) => setQPoints(parseInt(e.target.value) || 5)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dynamic Type-specific fields */}
                {selectedQuestionType === 'multiple_choice' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block">
                      خيارات الإجابة (حدد الخيار الصحيح بزر الاختيار):
                    </span>
                    {mcOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="mcCorrect"
                          checked={mcCorrectIdx === oIdx}
                          onChange={() => setMcCorrectIdx(oIdx)}
                          className="w-4 h-4 text-amber-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const copy = [...mcOptions];
                            copy[oIdx] = e.target.value;
                            setMcOptions(copy);
                          }}
                          placeholder={`الخيار ${oIdx + 1}...`}
                          className="w-full p-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {selectedQuestionType === 'complete' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        نص الآية مع علامة الفراغ [...] :
                      </label>
                      <input
                        type="text"
                        value={completeVerseWithBlank}
                        onChange={(e) => setCompleteVerseWithBlank(e.target.value)}
                        placeholder="«وَالْكَلِمَةُ صَارَ [...] وَحَلَّ بَيْنَنَا»"
                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-scripture text-base focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">الكلمة المفقودة الصحيحة:</label>
                        <input
                          type="text"
                          value={completeBlankAnswer}
                          onChange={(e) => setCompleteBlankAnswer(e.target.value)}
                          placeholder="مثال: جسداً"
                          className="w-full p-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">بنك كلمات مساعدة (مفصولة بفاصلة):</label>
                        <input
                          type="text"
                          value={completeWordBank}
                          onChange={(e) => setCompleteWordBank(e.target.value)}
                          placeholder="جسداً، نوراً، صوتاً، ملكاً"
                          className="w-full p-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedQuestionType === 'true_false' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">نص العبارة:</label>
                      <input
                        type="text"
                        value={tfStatement}
                        onChange={(e) => setTfStatement(e.target.value)}
                        placeholder="اكتب العبارة ليحدد المتسابق صحتها..."
                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">الجواب الصحيح:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={tfIsCorrect === true}
                            onChange={() => setTfIsCorrect(true)}
                          />
                          <span>صـح (صواب)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-rose-800 cursor-pointer">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={tfIsCorrect === false}
                            onChange={() => setTfIsCorrect(false)}
                          />
                          <span>خـطـأ</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {selectedQuestionType === 'short_answer' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">سؤال المقال / التأمل:</label>
                      <input
                        type="text"
                        value={saPrompt}
                        onChange={(e) => setSaPrompt(e.target.value)}
                        placeholder="ماذا نتعلم من..."
                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">الإجابة النموذجية للخادم:</label>
                      <textarea
                        rows={2}
                        value={saModelAnswer}
                        onChange={(e) => setSaModelAnswer(e.target.value)}
                        placeholder="الإجابة الصحيحة أو النقاط الجوهرية..."
                        className="w-full p-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuestion}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    تأكيد وإضافة السؤال
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-stone-200">
            <span className="text-xs text-stone-500">
              إجمالي نقاط مسابقة اليوم: <strong className="text-stone-800">{questionsList.reduce((s, q) => s + q.points, 0)} نقطة</strong>
            </span>
            <button
              type="submit"
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-sm"
            >
              حفظ مسابقة اليوم ونشرها للمتسابقين 🚀
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Point Logs Audit */}
      {activeTab === 'point_logs' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-md divide-y divide-stone-100 overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">سجل تعديلات النقاط والمكافآت</h3>
            <span className="text-xs text-stone-500">{logs.length} عملية مسجلة</span>
          </div>

          {logs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-stone-50">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-stone-900 text-sm">{log.userName}</h4>
                  <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
                    log.change > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {log.change > 0 ? `+${log.change}` : log.change} نقطة
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1">السبب: {log.reason}</p>
                <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                  <span>بواسطة: {log.adminName}</span>
                  <span>·</span>
                  <span>{log.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: Database Configuration (Hostinger MySQL & phpMyAdmin) */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-900/60 px-3 py-1 rounded-full border border-amber-700/50">
                <Database className="w-3.5 h-3.5" />
                <span>ربط قاعدة بيانات Hostinger MySQL & phpMyAdmin</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-50">
                إعدادات قاعدة البيانات والنسخ الاحتياطي SQL
              </h2>
              <p className="text-stone-300 text-xs sm:text-sm">
                يمكنك توصيل قاعدة بيانات MySQL الخاصة بك على استضافة Hostinger أو تنزيل ملف SQL الجاهز للاستيراد المباشر في phpMyAdmin بنقرة واحدة!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSql}
                className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف bible_quiz.sql</span>
              </button>
            </div>
          </div>

          {/* Connection Test Results */}
          {dbTestResult && (
            <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${
              dbTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {dbTestResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{dbTestResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${
              syncResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {syncResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{syncResult.message}</span>
            </div>
          )}

          {/* DB Credentials Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">بيانات الاتصال بـ Hostinger MySQL</h3>
                <p className="text-xs text-stone-500">
                  تجد هذه البيانات في لوحة تحكم Hostinger cPanel / hPanel &gt; Databases &gt; MySQL Databases
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                dbConfig.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
              }`}>
                {dbConfig.isConnected ? 'متصل بقاعدة البيانات ✓' : 'غير متصل بعد'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  عنوان السيرفر (MySQL Host):
                </label>
                <input
                  type="text"
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                  placeholder="مثال: localhost أو srv123.main-hosting.eu"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  المنفذ (Port):
                </label>
                <input
                  type="number"
                  value={dbConfig.port}
                  onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) || 3306 })}
                  placeholder="3306"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم قاعدة البيانات (Database Name):
                </label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  placeholder="مثال: u123456789_bible_quiz"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم المستخدم (Database User):
                </label>
                <input
                  type="text"
                  value={dbConfig.user}
                  onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  placeholder="مثال: u123456789_kirillos"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  كلمة مرور قاعدة البيانات (Password):
                </label>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={handleTestDatabaseConnection}
                disabled={isTestingDb}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Server className="w-4 h-4 text-amber-400" />
                <span>{isTestingDb ? 'جاري الفحص...' : 'اختبار الاتصال بقاعدة بيانات Hostinger'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncTables}
                disabled={isSyncingTables}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSyncingTables ? 'جاري الإنشاء...' : 'إنشاء الجداول في سيرفر Hostinger تلقائياً'}</span>
              </button>
            </div>
          </div>

          {/* phpMyAdmin Instructions & SQL Export */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-extrabold text-stone-900 text-lg">
                  استيراد الجداول مباشرة في phpMyAdmin على Hostinger
                </h3>
                <p className="text-xs text-stone-500">
                  إذا كنت تفضل إدارة الجداول عبر واجهة phpMyAdmin، اتبع الخطوات البسيطة التالية:
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                  <span>{copiedSql ? 'تم النسخ بنجاح! ✓' : 'نسخ كود SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل ملف .sql</span>
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h5 className="font-bold text-stone-900">فتح phpMyAdmin</h5>
                <p className="text-stone-600">
                  سجل الدخول إلى لوحة تحكم Hostinger، توجه إلى Databases ثم انقر على زر <strong>Enter phpMyAdmin</strong>.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <h5 className="font-bold text-stone-900">اختيار قاعدة البيانات</h5>
                <p className="text-stone-600">
                  انقر على اسم قاعدة بياناتك من القائمة اليسرى في phpMyAdmin لتحديدها.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <h5 className="font-bold text-stone-900">استيراد (Import)</h5>
                <p className="text-stone-600">
                  اضغط على تبويب <strong>Import (استيراد)</strong> في الشريط العلوي، واختر ملف <code>bible_quiz.sql</code> الذي قمت بتنزيله.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <h5 className="font-bold text-stone-900">تنفيذ وحفظ</h5>
                <p className="text-stone-600">
                  اضغط على زر <strong>Go / تنفيذ</strong> بالأسفل. سيتم إنشاء الجداول وحساب أدمن كيرلس هلال فوراً!
                </p>
              </div>
            </div>

            {/* Code Preview snippet */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700 block">معاينة جزء من سكربت SQL التلقائي:</span>
              <pre className="bg-stone-950 text-amber-200 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-48 border border-stone-800" dir="ltr">
{StorageService.generatePhpMyAdminSql().substring(0, 1100)}
...
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
