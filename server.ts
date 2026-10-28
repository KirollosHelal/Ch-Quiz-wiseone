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

  const getFriendlyErrorMessage = (err: any, database: string, host: string) => {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      return 'تم رفض الوصول (Access Denied). يرجى التأكد من اسم المستخدم وكلمة المرور وصلاحيات المستخدم في لوحة تحكم Hostinger.';
    }
    if (err.code === 'ER_BAD_DB_ERROR') {
      return `قاعدة البيانات «${database}» غير موجودة في سيرفر Hostinger. يرجى إنشاؤها أولاً من phpMyAdmin أو cPanel.`;
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      return `تعذر الاتصال بسيرفر Hostinger على «${host}». استضافة Hostinger المشتركة تمنع افتراضياً الاتصال الخارجي المباشر إلا بعد تفعيل (Remote MySQL). يمكنك بدلاً من ذلك استخدام الخيار الموصى به: اضغط زر «تنزيل ملف bible_quiz.sql» واستورده مباشرة داخل phpMyAdmin بنقرة واحدة!`;
    }
    return `فشل الاتصال: ${err.message || 'خطأ غير معروف'}`;
  };

  // --- API: Test MySQL Connection (Hostinger phpMyAdmin) ---
  app.post('/api/db/test-connection', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { host, port, database, user, password, ssl } = req.body;

    if (!host || !database || !user) {
      return res.json({
        success: false,
        message: 'يرجى إدخال عنوان الخادم (Host)، واسم قاعدة البيانات (Database)، واسم المستخدم (User).',
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
      }, 3500);

      const [rows] = await connection.query('SELECT 1 + 1 AS solution, NOW() as server_time');
      await connection.end();

      return res.json({
        success: true,
        message: `تم الاتصال بنجاح بقاعدة بيانات Hostinger (${database})!`,
        serverTime: (rows as any)[0]?.server_time,
      });
    } catch (err: any) {
      console.error('MySQL connection error:', err);
      const friendlyMsg = getFriendlyErrorMessage(err, database, host);

      // Return 200 with success: false so intermediate proxies never transform to 502/504 HTML
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
