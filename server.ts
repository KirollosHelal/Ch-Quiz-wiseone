import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG_FILE = path.resolve(__dirname, 'data', 'db-config.json');

function getSavedDbConfig(): any {
  try {
    if (fs.existsSync(DB_CONFIG_FILE)) {
      const raw = fs.readFileSync(DB_CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading saved db config:', e);
  }
  return null;
}

function saveDbConfigFile(config: any): void {
  try {
    const dir = path.dirname(DB_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing saved db config:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper for MySQL connection with strict timeout (prevents Cloud Run 502/504 HTML gateway timeouts)
  const connectMysqlWithTimeout = async (config: mysql.ConnectionOptions, timeoutMs = 3500): Promise<mysql.Connection> => {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err: any = new Error('ETIMEDOUT');
        err.code = 'ETIMEDOUT';
        reject(err);
      }, timeoutMs);
    });

    try {
      const conn = await Promise.race([mysql.createConnection(config), timeoutPromise]);
      clearTimeout(timer!);
      return conn;
    } catch (error) {
      clearTimeout(timer!);
      throw error;
    }
  };

  const cleanHostString = (rawHost: string) => {
    let clean = (rawHost || '').trim();
    clean = clean.replace(/^https?:\/\//i, '');
    if (clean.includes(':')) {
      clean = clean.split(':')[0];
    }
    return clean;
  };

  const getFriendlyErrorMessage = (err: any, database: string, host: string) => {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      return `تم رفض الوصول (Access Denied). اسم المستخدم أو كلمة المرور غير صحيحة، أو لم يتم إعطاء الصلاحيات الكاملة للمستخدم على قاعدة «${database}» في لوحة Hostinger.`;
    }
    if (err.code === 'ER_BAD_DB_ERROR') {
      return `قاعدة البيانات «${database}» غير موجودة في سيرفر Hostinger. يرجى التأكد من الاسم بالكامل كما يظهر في لوحة التحكم (مثل: u123456789_dbname).`;
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      return `انتهت مهلة استجابة السيرفر «${host}» (ETIMEDOUT).
الأسباب الأكيدة في Hostinger:
1) جدار الحماية (Firewall) في Hostinger يحجب الاتصال المباشر من خارج السيرفر: أضف IP السيرفر إلى Remote MySQL.
2) تأكد أن عنوان السيرفر هو MySQL Hostname المخصص في Hostinger (وليس localhost).
★ الحل الأسهل والأسرع 100%: استخدم «جسر PHP المباشر (Hostinger Bridge)» المتاح في التبويب الثاني في الموقع، فهو يتصل محلياً داخل Hostinger بدون قيود جدار الحماية!`;
    }
    return `فشل الاتصال: ${err.message || 'خطأ غير معروف'}`;
  };

  // --- API: Get Saved Database Configuration ---
  app.get('/api/db/config', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const config = getSavedDbConfig();
    return res.json({ success: true, config });
  });

  // --- API: Save Database Configuration on Server ---
  app.post('/api/db/config', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const config = req.body;
    if (config) {
      saveDbConfigFile(config);
    }
    return res.json({ success: true, message: 'تم حفظ إعدادات قاعدة البيانات في السيرفر بنجاح.' });
  });

  app.post('/api/db/save-config', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const config = req.body;
    if (config) {
      saveDbConfigFile(config);
    }
    return res.json({ success: true, message: 'تم حفظ إعدادات قاعدة البيانات في السيرفر بنجاح.' });
  });

  // --- API: Server Info (Outbound IP for Hostinger Remote MySQL) ---
  app.get('/api/db/server-info', async (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      ip: '34.96.62.46',
      port: 3000,
    });
  });

  // --- Core Function: Pull all Quizzes, Users, Submissions, PointLogs from DB ---
  const pullAllDataFromDb = async (overrideConfig?: any) => {
    const activeConfig = overrideConfig || getSavedDbConfig();
    if (!activeConfig) {
      return { success: false, configured: false, message: 'قاعدة البيانات غير مهيأة بعد في السيرفر.' };
    }

    // 1. If Bridge Mode
    if (activeConfig.syncMode === 'bridge' && activeConfig.bridgeUrl) {
      try {
        const cleanUrl = activeConfig.bridgeUrl.trim();
        const targetUrl = new URL(cleanUrl);
        targetUrl.searchParams.set('action', 'pull');
        targetUrl.searchParams.set('secret', activeConfig.bridgeSecret || '');

        const response = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            'X-Bridge-Secret': activeConfig.bridgeSecret || '',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(9000),
        });

        const text = await response.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          return { success: false, configured: true, message: `استجابة غير صحيحة من ملف الجسر: ${text.substring(0, 100)}` };
        }

        return { ...data, fromDb: true, configured: true };
      } catch (err: any) {
        return { success: false, configured: true, message: `تعذر جلب البيانات عبر جسر PHP: ${err.message}` };
      }
    }

    // 2. Direct MySQL Mode
    const cleanedHost = cleanHostString(activeConfig.host);
    if (!cleanedHost || !activeConfig.database || !activeConfig.user) {
      return { success: false, configured: false, message: 'بيانات الاتصال بقاعدة البيانات غير مكتملة.' };
    }

    const tablePrefix = activeConfig.tablePrefix || 'cbq_';
    const parsedPort = activeConfig.port ? parseInt(activeConfig.port) : 3306;

    try {
      const connection = await connectMysqlWithTimeout({
        host: cleanedHost,
        port: isNaN(parsedPort) ? 3306 : parsedPort,
        user: (activeConfig.user || '').trim(),
        password: activeConfig.password || '',
        database: (activeConfig.database || '').trim(),
        connectTimeout: 4500,
        ssl: activeConfig.ssl ? { rejectUnauthorized: false } : undefined,
      }, 5000);

      const [tableRows] = await connection.query('SHOW TABLES');
      const tableNames: string[] = (tableRows as any[]).map(r => Object.values(r)[0] as string);

      let quizzes: any[] = [];
      let users: any[] = [];
      let pointLogs: any[] = [];
      let submissions: any[] = [];

      const quizzesTable = `${tablePrefix}daily_quizzes`;
      const usersTable = `${tablePrefix}users`;
      const logsTable = `${tablePrefix}point_logs`;
      const submissionsTable = `${tablePrefix}submissions`;

      if (tableNames.includes(quizzesTable)) {
        const [qRows] = await connection.query(`SELECT * FROM \`${quizzesTable}\` ORDER BY dayNumber ASC`);
        quizzes = (qRows as any[]).map(q => ({
          ...q,
          isMainToday: Boolean(q.isMainToday),
          published: Boolean(q.published),
          verses: typeof q.versesJson === 'string' ? JSON.parse(q.versesJson) : (q.versesJson || []),
          questions: typeof q.questionsJson === 'string' ? JSON.parse(q.questionsJson) : (q.questionsJson || []),
          date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
        }));
      }

      if (tableNames.includes(submissionsTable)) {
        const [sRows] = await connection.query(`SELECT * FROM \`${submissionsTable}\` ORDER BY submittedAt DESC`);
        submissions = (sRows as any[]).map(s => ({
          quizId: s.quizId,
          score: Number(s.score) || 0,
          maxScore: Number(s.maxScore) || 20,
          date: s.submittedAt instanceof Date ? s.submittedAt.toISOString().split('T')[0] : String(s.submittedAt).substring(0, 10),
          submittedAt: s.submittedAt instanceof Date ? s.submittedAt.toISOString() : String(s.submittedAt),
          answers: typeof s.answersJson === 'string' ? JSON.parse(s.answersJson) : (s.answersJson || {}),
          status: s.status || 'graded',
          userId: s.userId,
        }));
      }

      if (tableNames.includes(usersTable)) {
        const [uRows] = await connection.query(`SELECT * FROM \`${usersTable}\``);
        users = (uRows as any[]).map(u => ({
          ...u,
          submissions: submissions.filter(s => s.userId === u.id),
        }));
      }

      if (tableNames.includes(logsTable)) {
        const [lRows] = await connection.query(`SELECT * FROM \`${logsTable}\` ORDER BY createdAt DESC`);
        pointLogs = (lRows as any[]).map(l => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          change: Number(l.pointsChange) || 0,
          reason: l.reason,
          adminName: l.adminName,
          date: l.createdAt instanceof Date ? l.createdAt.toISOString().split('T')[0] : String(l.createdAt),
        }));
      }

      await connection.end();

      return {
        success: true,
        configured: true,
        fromDb: true,
        message: `تم جلب البيانات بنجاح من قاعدة بيانات Hostinger! (${quizzes.length} مسابقة، ${users.length} متسابق).`,
        quizzes,
        users,
        pointLogs,
      };
    } catch (err: any) {
      console.error('MySQL pull error:', err);
      return {
        success: false,
        configured: true,
        message: getFriendlyErrorMessage(err, activeConfig.database, cleanedHost),
      };
    }
  };

  // --- Core Function: Execute Individual CRUD Operation on Hostinger DB ---
  const executeCrud = async (action: string, payload: any, overrideConfig?: any) => {
    const activeConfig = overrideConfig || getSavedDbConfig();
    if (!activeConfig) {
      return { success: false, message: 'قاعدة البيانات غير مهيأة بعد.' };
    }

    // 1. If Bridge Mode
    if (activeConfig.syncMode === 'bridge' && activeConfig.bridgeUrl) {
      try {
        const cleanUrl = activeConfig.bridgeUrl.trim();
        const targetUrl = new URL(cleanUrl);
        targetUrl.searchParams.set('action', 'crud');
        targetUrl.searchParams.set('secret', activeConfig.bridgeSecret || '');

        const response = await fetch(targetUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bridge-Secret': activeConfig.bridgeSecret || '',
          },
          body: JSON.stringify({
            action: 'crud',
            crud_action: action,
            secret: activeConfig.bridgeSecret,
            ...payload,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const text = await response.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          return { success: false, message: `رد غير صالح من جسر Hostinger: ${text.substring(0, 100)}` };
        }
        return data;
      } catch (err: any) {
        return { success: false, message: `تعذر تنفيذ العملية عبر جسر Hostinger: ${err.message}` };
      }
    }

    // 2. Direct MySQL Mode
    const cleanedHost = cleanHostString(activeConfig.host);
    if (!cleanedHost || !activeConfig.database || !activeConfig.user) {
      return { success: false, message: 'بيانات الاتصال بقاعدة البيانات غير مكتملة.' };
    }

    const tablePrefix = activeConfig.tablePrefix || 'cbq_';
    const parsedPort = activeConfig.port ? parseInt(activeConfig.port) : 3306;

    try {
      const connection = await connectMysqlWithTimeout({
        host: cleanedHost,
        port: isNaN(parsedPort) ? 3306 : parsedPort,
        user: (activeConfig.user || '').trim(),
        password: activeConfig.password || '',
        database: (activeConfig.database || '').trim(),
        connectTimeout: 4000,
        ssl: activeConfig.ssl ? { rejectUnauthorized: false } : undefined,
      }, 4500);

      if (action === 'save_quiz') {
        const q = payload.quiz;
        if (!q || !q.id) {
          await connection.end();
          return { success: false, message: 'بيانات المسابقة غير صحيحة.' };
        }
        await connection.query(`
          INSERT INTO \`${tablePrefix}daily_quizzes\` 
            (\`id\`, \`dayNumber\`, \`dayLabel\`, \`date\`, \`isMainToday\`, \`testament\`, \`bookName\`, \`chapterNumber\`, \`title\`, \`keyVerse\`, \`reflection\`, \`audioUrl\`, \`audioDuration\`, \`versesJson\`, \`questionsJson\`, \`totalPoints\`, \`published\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            \`title\`=VALUES(\`title\`),
            \`dayLabel\`=VALUES(\`dayLabel\`),
            \`isMainToday\`=VALUES(\`isMainToday\`),
            \`keyVerse\`=VALUES(\`keyVerse\`),
            \`reflection\`=VALUES(\`reflection\`),
            \`versesJson\`=VALUES(\`versesJson\`),
            \`questionsJson\`=VALUES(\`questionsJson\`),
            \`totalPoints\`=VALUES(\`totalPoints\`)
        `, [
          q.id, q.dayNumber || 1, q.dayLabel || null, q.date, q.isMainToday ? 1 : 0,
          q.testament || 'new', q.bookName, q.chapterNumber, q.title,
          q.keyVerse || null, q.reflection || null, q.audioUrl,
          q.audioDuration || '5:00', JSON.stringify(q.verses || []),
          JSON.stringify(q.questions || []), q.totalPoints || 20,
          q.published !== false ? 1 : 0
        ]);
      } else if (action === 'delete_quiz') {
        const quizId = payload.quizId;
        await connection.query(`DELETE FROM \`${tablePrefix}daily_quizzes\` WHERE \`id\` = ?`, [quizId]);
      } else if (action === 'set_main_day') {
        const quizId = payload.quizId;
        await connection.query(`UPDATE \`${tablePrefix}daily_quizzes\` SET \`isMainToday\` = 0`);
        await connection.query(`UPDATE \`${tablePrefix}daily_quizzes\` SET \`isMainToday\` = 1 WHERE \`id\` = ?`, [quizId]);
      } else if (action === 'save_user') {
        const u = payload.user;
        if (!u || !u.id) {
          await connection.end();
          return { success: false, message: 'بيانات المتسابق غير صحيحة.' };
        }
        await connection.query(`
          INSERT INTO \`${tablePrefix}users\` 
            (\`id\`, \`fullName\`, \`email\`, \`password\`, \`phone\`, \`ageGroup\`, \`role\`, \`totalPoints\`, \`quizzesSolved\`, \`currentStreak\`, \`registeredBy\`, \`servantNotes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            \`fullName\`=VALUES(\`fullName\`),
            \`email\`=VALUES(\`email\`),
            \`phone\`=VALUES(\`phone\`),
            \`ageGroup\`=VALUES(\`ageGroup\`),
            \`role\`=VALUES(\`role\`),
            \`totalPoints\`=VALUES(\`totalPoints\`),
            \`quizzesSolved\`=VALUES(\`quizzesSolved\`),
            \`currentStreak\`=VALUES(\`currentStreak\`),
            \`password\`=COALESCE(VALUES(\`password\`), \`password\`),
            \`servantNotes\`=VALUES(\`servantNotes\`)
        `, [
          u.id, u.fullName, u.email || null, u.password || null, u.phone || '',
          u.ageGroup || 'senior', u.role || 'user', u.totalPoints || 0,
          u.quizzesSolved || 0, u.currentStreak || 0, u.registeredBy || 'self',
          u.servantNotes || null
        ]);
      } else if (action === 'delete_user') {
        const userId = payload.userId;
        await connection.query(`DELETE FROM \`${tablePrefix}users\` WHERE \`id\` = ?`, [userId]);
        await connection.query(`DELETE FROM \`${tablePrefix}submissions\` WHERE \`userId\` = ?`, [userId]);
        await connection.query(`DELETE FROM \`${tablePrefix}point_logs\` WHERE \`userId\` = ?`, [userId]);
      } else if (action === 'submit_quiz') {
        const userId = payload.userId;
        const sub = payload.submission;
        if (userId && sub && sub.quizId) {
          // Check if already submitted
          const [existing] = await connection.query(`SELECT id FROM \`${tablePrefix}submissions\` WHERE \`userId\` = ? AND \`quizId\` = ?`, [userId, sub.quizId]);
          if (Array.isArray(existing) && existing.length > 0) {
            await connection.end();
            return { success: false, message: 'تم حل المسابقة مسبقاً.' };
          }
          await connection.query(`
            INSERT INTO \`${tablePrefix}submissions\`
              (\`userId\`, \`quizId\`, \`score\`, \`maxScore\`, \`answersJson\`, \`status\`, \`submittedAt\`)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `, [
            userId, sub.quizId, sub.score || 0, sub.maxScore || 20,
            JSON.stringify(sub.answers || {}), sub.status || 'graded'
          ]);
          await connection.query(`
            UPDATE \`${tablePrefix}users\`
            SET \`totalPoints\` = \`totalPoints\` + ?,
                \`quizzesSolved\` = \`quizzesSolved\` + 1,
                \`currentStreak\` = \`currentStreak\` + 1
            WHERE \`id\` = ?
          `, [sub.score || 0, userId]);
        }
      } else if (action === 'adjust_points') {
        const { userId, pointsDelta, reason, adminName, logId, userName } = payload;
        if (userId) {
          await connection.query(`
            INSERT INTO \`${tablePrefix}point_logs\`
              (\`id\`, \`userId\`, \`userName\`, \`pointsChange\`, \`reason\`, \`adminName\`, \`createdAt\`)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `, [logId || ('log-' + Date.now()), userId, userName || '', pointsDelta || 0, reason || '', adminName || 'الخادم']);
          await connection.query(`
            UPDATE \`${tablePrefix}users\`
            SET \`totalPoints\` = \`totalPoints\` + ?
            WHERE \`id\` = ?
          `, [pointsDelta || 0, userId]);
        }
      }

      await connection.end();
      return { success: true, message: 'تم تنفيذ العملية وتحديث قاعدة بيانات Hostinger بنجاح!' };
    } catch (err: any) {
      console.error('MySQL CRUD execution error:', err);
      return { success: false, message: `خطأ في العملية: ${err.message}` };
    }
  };

  // --- API: Unified Sync (Pull all data) ---
  app.get('/api/db/sync', async (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const result = await pullAllDataFromDb();
    return res.json(result);
  });

  // --- API: Real-time CRUD on Hostinger DB ---
  app.post('/api/db/crud', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { action, payload, config } = req.body;
    const result = await executeCrud(action, payload, config);
    return res.json(result);
  });

  // --- API: Test MySQL Connection (Hostinger phpMyAdmin) ---
  app.post('/api/db/test-connection', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { host, port, database, user, password, ssl } = req.body;
    const cleanedHost = cleanHostString(host);

    if (!cleanedHost || !database || !user) {
      return res.json({
        success: false,
        message: 'يرجى إدخال عنوان السيرفر (Host) واسم قاعدة البيانات (Database) واسم المستخدم (User).',
      });
    }

    if (cleanedHost.toLowerCase() === 'localhost' || cleanedHost === '127.0.0.1') {
      return res.json({
        success: false,
        message: 'تنبيه: "localhost" تشير للسيرفر الداخلي الحالي وليس لسيرفر Hostinger. يرجى استخدام MySQL Hostname المخصص في Hostinger أو استخدام جسر PHP المباشر.',
      });
    }

    try {
      const parsedPort = port ? parseInt(port) : (host.includes(':') ? parseInt(host.split(':')[1]) : 3306);
      const connection = await connectMysqlWithTimeout({
        host: cleanedHost,
        port: isNaN(parsedPort) ? 3306 : parsedPort,
        user: (user || '').trim(),
        password: password || '',
        database: (database || '').trim(),
        connectTimeout: 2500,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
      }, 2800);

      const [rows] = await connection.query('SELECT 1 + 1 AS solution, NOW() as server_time');
      const [tableRows] = await connection.query('SHOW TABLES');
      await connection.end();

      const tableNames = (tableRows as any[]).map(r => Object.values(r)[0]);

      // Save to server config
      saveDbConfigFile({ ...req.body, host: cleanedHost, isConnected: true });

      return res.json({
        success: true,
        message: `تم الاتصال بنجاح بقاعدة بيانات Hostinger (${database})! عدد الجداول الموجودة: ${tableNames.length}.`,
        serverTime: (rows as any)[0]?.server_time,
        tables: tableNames,
      });
    } catch (err: any) {
      console.error('MySQL connection error:', err);
      const friendlyMsg = getFriendlyErrorMessage(err, database, cleanedHost);

      return res.json({
        success: false,
        message: friendlyMsg,
        code: err.code || 'CONNECTION_ERROR',
      });
    }
  });

  // --- API: Test Hostinger PHP Bridge ---
  app.post('/api/db/bridge-test', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { bridgeUrl, bridgeSecret } = req.body;
    if (!bridgeUrl) {
      return res.json({
        success: false,
        message: 'يرجى إدخال رابط ملف الجسر (مثل: https://yourdomain.com/bible_sync.php).',
      });
    }

    try {
      const cleanUrl = bridgeUrl.trim();
      const targetUrl = new URL(cleanUrl);
      targetUrl.searchParams.set('action', 'test');
      targetUrl.searchParams.set('secret', bridgeSecret || '');

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Bridge-Secret': bridgeSecret || '',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return res.json({
          success: false,
          message: `رد السيرفر لم يكن بتنسيق JSON صحيح. تأكد من رفع ملف bible_sync.php داخل مجلد public_html في Hostinger.\n(نص الرد: ${text.substring(0, 150)}...)`,
        });
      }

      if (data.success) {
        saveDbConfigFile({ syncMode: 'bridge', bridgeUrl: cleanUrl, bridgeSecret, isConnected: true });
      }

      return res.json(data);
    } catch (err: any) {
      return res.json({
        success: false,
        message: `تعذر الوصول إلى رابط ملف الجسر: ${err.message || 'تأكد من صحة الرابط وعمل الموقع على Hostinger'}.`,
      });
    }
  });

  // --- API: Sync Tables via PHP Bridge ---
  app.post('/api/db/bridge-sync-tables', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { bridgeUrl, bridgeSecret } = req.body;
    if (!bridgeUrl) {
      return res.json({ success: false, message: 'يرجى إدخال رابط ملف الجسر أولاً.' });
    }

    try {
      const cleanUrl = bridgeUrl.trim();
      const targetUrl = new URL(cleanUrl);
      targetUrl.searchParams.set('action', 'sync_tables');
      targetUrl.searchParams.set('secret', bridgeSecret || '');

      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bridge-Secret': bridgeSecret || '',
        },
        body: JSON.stringify({ action: 'sync_tables', secret: bridgeSecret }),
        signal: AbortSignal.timeout(8000),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return res.json({
          success: false,
          message: `خطأ في الرد من ملف الجسر: ${text.substring(0, 120)}`,
        });
      }
      return res.json(data);
    } catch (err: any) {
      return res.json({
        success: false,
        message: `تعذر إنشاء الجداول عبر الجسر: ${err.message}`,
      });
    }
  });

  // --- API: Pull Data via PHP Bridge ---
  app.post('/api/db/bridge-pull', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { bridgeUrl, bridgeSecret } = req.body;
    const result = await pullAllDataFromDb({ syncMode: 'bridge', bridgeUrl, bridgeSecret });
    return res.json(result);
  });

  // --- API: Push Data via PHP Bridge ---
  app.post('/api/db/bridge-push', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { bridgeUrl, bridgeSecret, quizzes, users } = req.body;
    if (!bridgeUrl) {
      return res.json({ success: false, message: 'يرجى إدخال رابط ملف الجسر أولاً.' });
    }

    try {
      const cleanUrl = bridgeUrl.trim();
      const targetUrl = new URL(cleanUrl);
      targetUrl.searchParams.set('action', 'push');
      targetUrl.searchParams.set('secret', bridgeSecret || '');

      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bridge-Secret': bridgeSecret || '',
        },
        body: JSON.stringify({
          action: 'push',
          secret: bridgeSecret,
          quizzes,
          users,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return res.json({
          success: false,
          message: `خطأ في استجابة رفع البيانات: ${text.substring(0, 120)}`,
        });
      }
      return res.json(data);
    } catch (err: any) {
      return res.json({
        success: false,
        message: `تعذر رفع البيانات عبر الجسر: ${err.message}`,
      });
    }
  });

  // --- API: Auto-create tables on Direct MySQL DB ---
  app.post('/api/db/sync-tables', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { host, port, database, user, password, ssl, tablePrefix = 'cbq_' } = req.body;

    if (!host || !database || !user) {
      return res.json({
        success: false,
        message: 'يرجى إدخال بيانات السيرفر واسم قاعدة البيانات أولاً.',
      });
    }

    try {
      const connection = await connectMysqlWithTimeout({
        host,
        port: port ? parseInt(port) : 3306,
        user,
        password: password || '',
        database,
        connectTimeout: 3000,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true,
      }, 4000);

      const ddl = `
        CREATE TABLE IF NOT EXISTS \`${tablePrefix}users\` (
          \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
          \`fullName\` VARCHAR(191) NOT NULL,
          \`email\` VARCHAR(191) DEFAULT NULL,
          \`password\` VARCHAR(191) DEFAULT NULL,
          \`phone\` VARCHAR(32) NOT NULL,
          \`ageGroup\` ENUM('senior', 'youth', 'family', 'servant') DEFAULT 'senior',
          \`role\` ENUM('admin', 'user') DEFAULT 'user',
          \`totalPoints\` INT NOT NULL DEFAULT 0,
          \`quizzesSolved\` INT NOT NULL DEFAULT 0,
          \`currentStreak\` INT NOT NULL DEFAULT 0,
          \`registeredBy\` ENUM('self', 'admin') DEFAULT 'self',
          \`servantNotes\` TEXT DEFAULT NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          KEY \`idx_email\` (\`email\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS \`${tablePrefix}daily_quizzes\` (
          \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
          \`dayNumber\` INT NOT NULL,
          \`dayLabel\` VARCHAR(100) DEFAULT NULL,
          \`date\` DATE NOT NULL,
          \`isMainToday\` TINYINT(1) DEFAULT 0,
          \`testament\` ENUM('old', 'new') DEFAULT 'new',
          \`bookName\` VARCHAR(100) NOT NULL,
          \`chapterNumber\` INT NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`keyVerse\` TEXT DEFAULT NULL,
          \`reflection\` TEXT DEFAULT NULL,
          \`audioUrl\` TEXT NOT NULL,
          \`audioDuration\` VARCHAR(20) DEFAULT '5:00',
          \`versesJson\` LONGTEXT NOT NULL,
          \`questionsJson\` LONGTEXT NOT NULL,
          \`totalPoints\` INT NOT NULL DEFAULT 20,
          \`published\` TINYINT(1) DEFAULT 1,
          UNIQUE KEY \`idx_day_number\` (\`dayNumber\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS \`${tablePrefix}submissions\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`userId\` VARCHAR(64) NOT NULL,
          \`quizId\` VARCHAR(64) NOT NULL,
          \`dayNumber\` INT DEFAULT NULL,
          \`score\` INT NOT NULL DEFAULT 0,
          \`maxScore\` INT NOT NULL DEFAULT 0,
          \`answersJson\` LONGTEXT NOT NULL,
          \`status\` ENUM('graded', 'needs_review') DEFAULT 'graded',
          \`submittedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          KEY \`idx_user_quiz\` (\`userId\`, \`quizId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS \`${tablePrefix}point_logs\` (
          \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
          \`userId\` VARCHAR(64) NOT NULL,
          \`userName\` VARCHAR(191) NOT NULL,
          \`pointsChange\` INT NOT NULL,
          \`reason\` TEXT NOT NULL,
          \`adminName\` VARCHAR(191) NOT NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        INSERT INTO \`${tablePrefix}users\` 
          (\`id\`, \`fullName\`, \`email\`, \`password\`, \`phone\`, \`ageGroup\`, \`role\`, \`totalPoints\`, \`quizzesSolved\`, \`currentStreak\`, \`registeredBy\`)
        VALUES 
          ('user-admin-kirillos', 'كيرلس هلال (الخادم المسؤول)', 'kirilloshelal@gmail.com', '123456789', '01220001111', 'servant', 'admin', 200, 12, 12, 'self')
        ON DUPLICATE KEY UPDATE \`password\`='123456789', \`role\`='admin';
      `;

      await connection.query(ddl);
      await connection.end();

      saveDbConfigFile({ ...req.body, isConnected: true });

      return res.json({
        success: true,
        message: 'تم إنشاء الجداول بنجاح في قاعدة بيانات Hostinger وتثبيت حساب أدمن كيرلس هلال!',
      });
    } catch (err: any) {
      console.error('Error creating tables:', err);
      const friendlyMsg = getFriendlyErrorMessage(err, database, host);
      return res.json({
        success: false,
        message: `تعذر إنشاء الجداول: ${friendlyMsg}`,
      });
    }
  });

  // --- API: Pull / Sync Data from Direct MySQL into Website ---
  app.post('/api/db/pull-data', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const result = await pullAllDataFromDb(req.body);
    return res.json(result);
  });

  // --- API: Push / Upload Local Website Data into Hostinger MySQL ---
  app.post('/api/db/push-data', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { config, quizzes, users } = req.body;
    const activeConfig = config || getSavedDbConfig();
    const { host, port, database, user, password, ssl, tablePrefix = 'cbq_' } = activeConfig || {};
    const cleanedHost = cleanHostString(host);

    if (!cleanedHost || !database || !user) {
      return res.json({
        success: false,
        message: 'بيانات الاتصال بقاعدة البيانات غير مكتملة.',
      });
    }

    try {
      const parsedPort = port ? parseInt(port) : (host.includes(':') ? parseInt(host.split(':')[1]) : 3306);
      const connection = await connectMysqlWithTimeout({
        host: cleanedHost,
        port: isNaN(parsedPort) ? 3306 : parsedPort,
        user: (user || '').trim(),
        password: password || '',
        database: (database || '').trim(),
        connectTimeout: 5000,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
      }, 6000);

      // Insert or update users
      if (Array.isArray(users)) {
        for (const u of users) {
          await connection.query(`
            INSERT INTO \`${tablePrefix}users\` 
              (\`id\`, \`fullName\`, \`email\`, \`password\`, \`phone\`, \`ageGroup\`, \`role\`, \`totalPoints\`, \`quizzesSolved\`, \`currentStreak\`, \`registeredBy\`, \`servantNotes\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              \`fullName\`=VALUES(\`fullName\`),
              \`totalPoints\`=VALUES(\`totalPoints\`),
              \`quizzesSolved\`=VALUES(\`quizzesSolved\`),
              \`currentStreak\`=VALUES(\`currentStreak\`),
              \`role\`=VALUES(\`role\`),
              \`password\`=COALESCE(VALUES(\`password\`), \`password\`)
          `, [
            u.id, u.fullName, u.email || null, u.password || null, u.phone || '',
            u.ageGroup || 'senior', u.role || 'user', u.totalPoints || 0,
            u.quizzesSolved || 0, u.currentStreak || 0, u.registeredBy || 'self',
            u.servantNotes || null
          ]);
        }
      }

      // Insert or update quizzes
      if (Array.isArray(quizzes)) {
        for (const q of quizzes) {
          await connection.query(`
            INSERT INTO \`${tablePrefix}daily_quizzes\` 
              (\`id\`, \`dayNumber\`, \`dayLabel\`, \`date\`, \`isMainToday\`, \`testament\`, \`bookName\`, \`chapterNumber\`, \`title\`, \`keyVerse\`, \`reflection\`, \`audioUrl\`, \`audioDuration\`, \`versesJson\`, \`questionsJson\`, \`totalPoints\`, \`published\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              \`title\`=VALUES(\`title\`),
              \`dayLabel\`=VALUES(\`dayLabel\`),
              \`isMainToday\`=VALUES(\`isMainToday\`),
              \`keyVerse\`=VALUES(\`keyVerse\`),
              \`reflection\`=VALUES(\`reflection\`),
              \`versesJson\`=VALUES(\`versesJson\`),
              \`questionsJson\`=VALUES(\`questionsJson\`),
              \`totalPoints\`=VALUES(\`totalPoints\`)
          `, [
            q.id, q.dayNumber, q.dayLabel || null, q.date, q.isMainToday ? 1 : 0,
            q.testament || 'new', q.bookName, q.chapterNumber, q.title,
            q.keyVerse || null, q.reflection || null, q.audioUrl,
            q.audioDuration || '5:00', JSON.stringify(q.verses || []),
            JSON.stringify(q.questions || []), q.totalPoints || 20,
            q.published !== false ? 1 : 0
          ]);
        }
      }

      await connection.end();

      return res.json({
        success: true,
        message: 'تمت مزامنة ورفع كافة المسابقات والمتسابقين بنجاح إلى قاعدة بيانات Hostinger MySQL!',
      });
    } catch (err: any) {
      console.error('Error pushing data to MySQL:', err);
      const friendlyMsg = getFriendlyErrorMessage(err, database, cleanedHost);
      return res.json({
        success: false,
        message: friendlyMsg,
      });
    }
  });

  // Global API error handler returning JSON
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({
      success: false,
      message: err?.message || 'حدث خطأ في معالجة الطلب.',
    });
  });

  // --- Vite dev server / production static files ---
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
