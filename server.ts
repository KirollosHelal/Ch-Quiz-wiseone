import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

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
    // If user entered srv123.main-hosting.eu:3306 or https://..., strip protocol and port
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
      return `تعذر الوصول إلى سيرفر MySQL «${host}». يرجى التأكد من خطوتين في Hostinger:
1) لا تستخدم "localhost" كعنوان للسيرفر لأن الموقع هنا يعمل على استضافة سحابية مستقلة؛ استخدم عنوان IP السيرفر أو Hostname الخاص بقاعدة البيانات (تجدها في قسم MySQL Databases في Hostinger).
2) تفعيل (Remote MySQL) في Hostinger وإضافة الرمز % أو عنوان IP للسماح بالاتصال الخارجي بقاعدة البيانات.`;
    }
    return `فشل الاتصال: ${err.message || 'خطأ غير معروف'}`;
  };

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
        message: 'تنبيه: "localhost" تشير للسيرفر المحلي الداخلي للموقع وليس لسيرفر Hostinger. يرجى نسخ عنوان السيرفر الخارجي (MySQL Hostname / IP) من لوحة تحكم Hostinger > MySQL Databases (مثل: srv123.main-hosting.eu أو IP السيرفر).',
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
      }, 5500);

      const [rows] = await connection.query('SELECT 1 + 1 AS solution, NOW() as server_time');
      
      // Also check tables exist
      const [tableRows] = await connection.query('SHOW TABLES');
      await connection.end();

      const tableNames = (tableRows as any[]).map(r => Object.values(r)[0]);

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

  // --- API: Auto-create tables on MySQL DB ---
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
          \`submittedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // --- API: Pull / Sync Data from Hostinger MySQL into Website ---
  app.post('/api/db/pull-data', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { host, port, database, user, password, ssl, tablePrefix = 'cbq_' } = req.body;
    const cleanedHost = cleanHostString(host);

    if (!cleanedHost || !database || !user) {
      return res.json({
        success: false,
        message: 'يرجى إدخال بيانات السيرفر واسم قاعدة البيانات أولاً.',
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
      }, 5500);

      // Check which tables exist
      const [tableRows] = await connection.query('SHOW TABLES');
      const tableNames: string[] = (tableRows as any[]).map(r => Object.values(r)[0] as string);

      let quizzes: any[] = [];
      let users: any[] = [];
      let pointLogs: any[] = [];

      const quizzesTable = `${tablePrefix}daily_quizzes`;
      const usersTable = `${tablePrefix}users`;
      const logsTable = `${tablePrefix}point_logs`;

      if (tableNames.includes(quizzesTable)) {
        const [qRows] = await connection.query(`SELECT * FROM \`${quizzesTable}\` ORDER BY dayNumber ASC`);
        quizzes = (qRows as any[]).map(q => ({
          ...q,
          isMainToday: Boolean(q.isMainToday),
          published: Boolean(q.published),
          verses: typeof q.versesJson === 'string' ? JSON.parse(q.versesJson) : q.versesJson || [],
          questions: typeof q.questionsJson === 'string' ? JSON.parse(q.questionsJson) : q.questionsJson || [],
          date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
        }));
      }

      if (tableNames.includes(usersTable)) {
        const [uRows] = await connection.query(`SELECT * FROM \`${usersTable}\``);
        users = (uRows as any[]).map(u => ({
          ...u,
          submissions: [],
        }));
      }

      if (tableNames.includes(logsTable)) {
        const [lRows] = await connection.query(`SELECT * FROM \`${logsTable}\` ORDER BY createdAt DESC`);
        pointLogs = (lRows as any[]).map(l => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          change: l.pointsChange,
          reason: l.reason,
          adminName: l.adminName,
          date: l.createdAt instanceof Date ? l.createdAt.toISOString().split('T')[0] : String(l.createdAt),
        }));
      }

      await connection.end();

      return res.json({
        success: true,
        message: `تم جلب البيانات بنجاح من Hostinger! (تم العثور على ${quizzes.length} مسابقة و ${users.length} متسابق).`,
        quizzes,
        users,
        pointLogs,
      });
    } catch (err: any) {
      console.error('Error pulling data from MySQL:', err);
      const friendlyMsg = getFriendlyErrorMessage(err, database, cleanedHost);
      return res.json({
        success: false,
        message: friendlyMsg,
      });
    }
  });

  // --- API: Push / Upload Local Website Data into Hostinger MySQL ---
  app.post('/api/db/push-data', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { config, quizzes, users } = req.body;
    const { host, port, database, user, password, ssl, tablePrefix = 'cbq_' } = config || {};
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
