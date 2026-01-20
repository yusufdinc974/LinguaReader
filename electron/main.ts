import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

const isDev = !app.isPackaged;

function getDbPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'linguareader.db');
}

function initDatabase(): void {
    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Create tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS word_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      translation TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      sentence_context TEXT,
      pdf_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mastery_level INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS word_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_list_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_list_id) REFERENCES word_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(word_list_id, word_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_list_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      quiz_type TEXT NOT NULL,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_list_id) REFERENCES word_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_pdfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      last_opened TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS word_familiarity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_lower TEXT NOT NULL UNIQUE,
      familiarity_level INTEGER DEFAULT 1,
      translation TEXT,
      easiness_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_date TEXT,
      last_review_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Migration: Add SRS columns if they don't exist
    const tableInfo = db.prepare("PRAGMA table_info(word_familiarity)").all() as { name: string }[];
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('easiness_factor')) {
        db.prepare("ALTER TABLE word_familiarity ADD COLUMN easiness_factor REAL DEFAULT 2.5").run();
    }
    if (!columns.includes('interval')) {
        db.prepare("ALTER TABLE word_familiarity ADD COLUMN interval INTEGER DEFAULT 0").run();
    }
    if (!columns.includes('repetitions')) {
        db.prepare("ALTER TABLE word_familiarity ADD COLUMN repetitions INTEGER DEFAULT 0").run();
    }
    if (!columns.includes('next_review_date')) {
        db.prepare("ALTER TABLE word_familiarity ADD COLUMN next_review_date TEXT").run();
    }
    if (!columns.includes('last_review_date')) {
        db.prepare("ALTER TABLE word_familiarity ADD COLUMN last_review_date TEXT").run();
    }

    // Migration: Add color column to word_lists
    const listTableInfo = db.prepare("PRAGMA table_info(word_lists)").all() as { name: string }[];
    const listColumns = listTableInfo.map(c => c.name);

    if (!listColumns.includes('color')) {
        db?.prepare("ALTER TABLE word_lists ADD COLUMN color TEXT").run();

        // Assign colors to existing lists - preset palette
        const listColors = [
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
            '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
        ];
        const existingLists = db?.prepare('SELECT id FROM word_lists ORDER BY id').all() as { id: number }[] || [];
        existingLists.forEach((list, index) => {
            const color = listColors[index % listColors.length];
            db?.prepare('UPDATE word_lists SET color = ? WHERE id = ?').run(color, list.id);
        });
        console.log(`Assigned colors to ${existingLists.length} existing lists`);
    }

    // Fix any existing NULL next_review_date values - set to today so they appear as due
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
        UPDATE word_familiarity 
        SET next_review_date = ? 
        WHERE next_review_date IS NULL
    `).run(today);

    // CLEANUP: Remove orphaned word_familiarity entries that don't have words in any list
    const cleanupResult = db.prepare(`
        DELETE FROM word_familiarity 
        WHERE word_lower NOT IN (
            SELECT LOWER(REPLACE(w.word, '[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ ]', ''))
            FROM words w
            JOIN word_list_items wli ON w.id = wli.word_id
        )
    `).run();
    console.log(`Cleanup: Removed ${cleanupResult.changes} orphaned word_familiarity entries`);

    // Insert default settings if not exist
    const insertSetting = db.prepare('INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)');
    insertSetting.run('target_language', 'en');
    insertSetting.run('theme', 'dark');
}

// Explicitly set App Name for Linux WMClass
app.setName('LinguaReader');

// Explicitly set App User Model ID for Linux/Windows taskbar
if (process.platform === 'linux' || process.platform === 'win32') {
    app.setAppUserModelId('com.linguareader.app');
}

// Explicitly set Desktop Name for Wayland
if (process.platform === 'linux') {
    (app as any).setDesktopName('LinguaReader.desktop');
}

function createWindow(): void {
    // Get icon path - use resources path for packaged app
    const iconPath = isDev
        ? path.join(__dirname, '../icon.png')
        : path.join(process.resourcesPath, 'icon.png');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a',
        show: false,
        autoHideMenuBar: true,
    });

    // Hide menu bar in production
    if (!isDev) {
        Menu.setApplicationMenu(null);
    }

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers
function setupIpcHandlers(): void {
    // File dialog for PDF
    ipcMain.handle('open-pdf-dialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const fileBuffer = fs.readFileSync(filePath);
            return {
                name: path.basename(filePath),
                path: filePath,
                data: fileBuffer.toString('base64'),
            };
        }
        return null;
    });

    // Word Lists
    ipcMain.handle('get-word-lists', () => {
        return db?.prepare('SELECT * FROM word_lists ORDER BY created_at DESC').all() || [];
    });

    ipcMain.handle('create-word-list', (_, name: string, description: string) => {
        // Assign a random color from the palette
        const listColors = [
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
            '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
        ];
        const color = listColors[Math.floor(Math.random() * listColors.length)];

        const result = db?.prepare('INSERT INTO word_lists (name, description, color) VALUES (?, ?, ?)').run(name, description, color);
        return result?.lastInsertRowid;
    });

    ipcMain.handle('delete-word-list', (_, id: number) => {
        // Get all words in this list first
        const words = db?.prepare(`
            SELECT w.word FROM words w
            JOIN word_list_items wli ON w.id = wli.word_id
            WHERE wli.word_list_id = ?
        `).all(id) as Array<{ word: string }> || [];

        // Delete each word's familiarity entry
        for (const word of words) {
            const wordLower = word.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase();
            db?.prepare('DELETE FROM word_familiarity WHERE word_lower = ?').run(wordLower);
        }

        // Delete word_list_items for this list
        db?.prepare('DELETE FROM word_list_items WHERE word_list_id = ?').run(id);

        // Delete words that belonged only to this list
        db?.prepare(`
            DELETE FROM words WHERE id IN (
                SELECT w.id FROM words w
                LEFT JOIN word_list_items wli ON w.id = wli.word_id
                WHERE wli.word_id IS NULL
            )
        `).run();

        // Delete the list itself
        db?.prepare('DELETE FROM word_lists WHERE id = ?').run(id);
        return true;
    });

    ipcMain.handle('update-word-list', (_, id: number, name: string, description: string) => {
        db?.prepare('UPDATE word_lists SET name = ?, description = ? WHERE id = ?').run(name, description, id);
        return true;
    });

    // Words
    ipcMain.handle('get-words-in-list', (_, listId: number) => {
        return db?.prepare(`
      SELECT w.*, wf.familiarity_level, wf.easiness_factor, wf.next_review_date
      FROM words w
      JOIN word_list_items wli ON w.id = wli.word_id
      LEFT JOIN word_familiarity wf ON LOWER(w.word) = wf.word_lower
      WHERE wli.word_list_id = ?
      ORDER BY wli.added_at DESC
    `).all(listId) || [];
    });

    ipcMain.handle('get-all-words', () => {
        return db?.prepare(`
            SELECT w.*, wf.familiarity_level, wf.easiness_factor, wf.next_review_date
            FROM words w
            LEFT JOIN word_familiarity wf ON LOWER(w.word) = wf.word_lower
            ORDER BY w.created_at DESC
        `).all() || [];
    });

    ipcMain.handle('add-word', (_, word: string, translation: string, sourceLang: string, targetLang: string, context: string, pdfName: string) => {
        const result = db?.prepare(`
      INSERT INTO words (word, translation, source_language, target_language, sentence_context, pdf_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(word, translation, sourceLang, targetLang, context, pdfName);
        return result?.lastInsertRowid;
    });

    ipcMain.handle('add-word-to-list', (_, wordId: number, listId: number) => {
        try {
            db?.prepare('INSERT INTO word_list_items (word_id, word_list_id) VALUES (?, ?)').run(wordId, listId);
            return true;
        } catch {
            return false; // Duplicate entry
        }
    });

    ipcMain.handle('remove-word-from-list', (_, wordId: number, listId: number) => {
        // Get the word text first
        const word = db?.prepare('SELECT word FROM words WHERE id = ?').get(wordId) as { word: string } | undefined;
        if (word) {
            const wordLower = word.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase();
            // Delete from familiarity table
            db?.prepare('DELETE FROM word_familiarity WHERE word_lower = ?').run(wordLower);
        }
        // Remove from list
        db?.prepare('DELETE FROM word_list_items WHERE word_id = ? AND word_list_id = ?').run(wordId, listId);
        return true;
    });

    ipcMain.handle('update-word-mastery', (_, wordId: number, masteryLevel: number) => {
        db?.prepare('UPDATE words SET mastery_level = ? WHERE id = ?').run(masteryLevel, wordId);
        return true;
    });

    ipcMain.handle('delete-word', (_, id: number) => {
        // First get the word to find its normalized form
        const word = db?.prepare('SELECT word FROM words WHERE id = ?').get(id) as { word: string } | undefined;
        if (word) {
            const wordLower = word.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase();
            // Delete from familiarity table
            db?.prepare('DELETE FROM word_familiarity WHERE word_lower = ?').run(wordLower);
        }
        // Delete from words table
        db?.prepare('DELETE FROM words WHERE id = ?').run(id);
        return true;
    });

    // Quiz Results
    ipcMain.handle('save-quiz-result', (_, listId: number, score: number, total: number, quizType: string) => {
        const result = db?.prepare(`
      INSERT INTO quiz_results (word_list_id, score, total_questions, quiz_type)
      VALUES (?, ?, ?, ?)
    `).run(listId, score, total, quizType);
        return result?.lastInsertRowid;
    });

    ipcMain.handle('get-quiz-results', (_, listId?: number) => {
        if (listId) {
            return db?.prepare('SELECT * FROM quiz_results WHERE word_list_id = ? ORDER BY completed_at DESC').all(listId) || [];
        }
        return db?.prepare('SELECT * FROM quiz_results ORDER BY completed_at DESC').all() || [];
    });

    // Stats
    ipcMain.handle('get-stats', () => {
        const totalWords = db?.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
        const totalLists = db?.prepare('SELECT COUNT(*) as count FROM word_lists').get() as { count: number };
        const totalQuizzes = db?.prepare('SELECT COUNT(*) as count FROM quiz_results').get() as { count: number };
        const avgScore = db?.prepare('SELECT AVG(CAST(score AS FLOAT) / total_questions * 100) as avg FROM quiz_results').get() as { avg: number };
        const masteryDistribution = db?.prepare('SELECT mastery_level, COUNT(*) as count FROM words GROUP BY mastery_level').all() as { mastery_level: number; count: number }[];
        const recentQuizzes = db?.prepare(`
      SELECT qr.*, wl.name as list_name 
      FROM quiz_results qr 
      JOIN word_lists wl ON qr.word_list_id = wl.id 
      ORDER BY completed_at DESC LIMIT 10
    `).all();

        return {
            totalWords: totalWords?.count || 0,
            totalLists: totalLists?.count || 0,
            totalQuizzes: totalQuizzes?.count || 0,
            averageScore: avgScore?.avg || 0,
            masteryDistribution: masteryDistribution || [],
            recentQuizzes: recentQuizzes || [],
        };
    });

    // Settings
    ipcMain.handle('get-setting', (_, key: string) => {
        const result = db?.prepare('SELECT value FROM user_settings WHERE key = ?').get(key) as { value: string } | undefined;
        return result?.value;
    });

    ipcMain.handle('set-setting', (_, key: string, value: string) => {
        db?.prepare('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)').run(key, value);
        return true;
    });

    // Recent PDFs
    ipcMain.handle('get-recent-pdfs', () => {
        return db?.prepare('SELECT * FROM recent_pdfs ORDER BY last_opened DESC LIMIT 10').all() || [];
    });

    ipcMain.handle('add-recent-pdf', (_, name: string, pdfPath: string) => {
        db?.prepare(`
            INSERT INTO recent_pdfs (name, path, last_opened) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(path) DO UPDATE SET last_opened = CURRENT_TIMESTAMP, name = excluded.name
        `).run(name, pdfPath);
        return true;
    });

    ipcMain.handle('open-pdf-by-path', (_, pdfPath: string) => {
        try {
            if (!fs.existsSync(pdfPath)) {
                return null;
            }
            const fileBuffer = fs.readFileSync(pdfPath);
            return {
                name: path.basename(pdfPath),
                path: pdfPath,
                data: fileBuffer.toString('base64'),
            };
        } catch {
            return null;
        }
    });

    ipcMain.handle('get-last-pdf-path', () => {
        const result = db?.prepare('SELECT path FROM recent_pdfs ORDER BY last_opened DESC LIMIT 1').get() as { path: string } | undefined;
        return result?.path;
    });

    // Word Familiarity with SRS
    ipcMain.handle('get-word-familiarity', (_, wordLower: string) => {
        const result = db?.prepare('SELECT * FROM word_familiarity WHERE word_lower = ?').get(wordLower);
        return result || null;
    });

    ipcMain.handle('set-word-familiarity', (_, wordLower: string, level: number, translation: string, ef: number = 2.5) => {
        // Set initial SRS parameters based on familiarity level
        // Higher levels = user already knows the word = longer initial intervals
        let initialEF = ef;
        let initialInterval = 0;
        let initialRepetitions = 0;

        switch (level) {
            case 1: // Unknown - needs immediate review
                initialEF = 2.5;
                initialInterval = 0;
                initialRepetitions = 0;
                break;
            case 2: // Seen - review tomorrow
                initialEF = 2.5;
                initialInterval = 1;
                initialRepetitions = 1;
                break;
            case 3: // Learning - review in 3 days
                initialEF = 2.5;
                initialInterval = 3;
                initialRepetitions = 2;
                break;
            case 4: // Familiar - review in 7 days
                initialEF = 2.6;
                initialInterval = 7;
                initialRepetitions = 3;
                break;
            case 5: // Mastered - review in 14 days
                initialEF = 2.7;
                initialInterval = 14;
                initialRepetitions = 4;
                break;
        }

        // Calculate next review date based on interval
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + initialInterval);
        const nextReviewDate = nextReview.toISOString().split('T')[0];

        db?.prepare(`
            INSERT INTO word_familiarity (word_lower, familiarity_level, translation, easiness_factor, interval, repetitions, next_review_date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(word_lower) DO UPDATE SET 
                familiarity_level = excluded.familiarity_level,
                translation = excluded.translation,
                easiness_factor = excluded.easiness_factor,
                interval = excluded.interval,
                repetitions = excluded.repetitions,
                next_review_date = excluded.next_review_date,
                updated_at = CURRENT_TIMESTAMP
        `).run(wordLower, level, translation, initialEF, initialInterval, initialRepetitions, nextReviewDate);
        return true;
    });

    ipcMain.handle('update-word-srs', (_, wordLower: string, ef: number, interval: number, repetitions: number, nextReviewDate: string, familiarityLevel: number) => {
        db?.prepare(`
            UPDATE word_familiarity SET 
                easiness_factor = ?,
                interval = ?,
                repetitions = ?,
                next_review_date = ?,
                last_review_date = CURRENT_TIMESTAMP,
                familiarity_level = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE word_lower = ?
        `).run(ef, interval, repetitions, nextReviewDate, familiarityLevel, wordLower);
        return true;
    });
    ipcMain.handle('get-all-word-familiarity', () => {
        return db?.prepare('SELECT * FROM word_familiarity').all() || [];
    });

    // Get colors for words based on their lists (optionally filtered by list IDs)
    ipcMain.handle('get-word-colors', (_, listIds?: number[]) => {
        // Join words -> word_list_items -> word_lists to get colors
        // If word is in multiple lists, pick the color from the most recently created list
        let query = `
            SELECT lower(replace(replace(replace(w.word, '’', ''), '''', ''), ' ', '')) as word_lower, l.color 
            FROM words w
            JOIN word_list_items wli ON w.id = wli.word_id
            JOIN word_lists l ON wli.word_list_id = l.id
        `;

        if (listIds && listIds.length > 0) {
            query += ` WHERE l.id IN (${listIds.map(() => '?').join(', ')})`;
            query += ` ORDER BY l.created_at DESC`;
            return db?.prepare(query).all(...listIds) || [];
        }

        query += ` ORDER BY l.created_at DESC`;
        return db?.prepare(query).all() || [];
    });

    ipcMain.handle('get-words-due-for-review', () => {
        // Use date-only string (YYYY-MM-DD) for comparison to avoid timestamp issues
        const today = new Date().toISOString().split('T')[0];
        return db?.prepare(`
            SELECT * FROM word_familiarity 
            WHERE next_review_date IS NULL OR DATE(next_review_date) <= DATE(?)
            ORDER BY next_review_date ASC
        `).all(today) || [];
    });

    // Get review schedule for stats page
    ipcMain.handle('get-review-schedule', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get all words with familiarity
        const allWords = db?.prepare('SELECT * FROM word_familiarity').all() || [];

        // Categorize by urgency
        let overdue = 0;
        let dueToday = 0;
        let dueSoon = 0; // 1-3 days
        let good = 0; // 4-7 days
        let mastered = 0; // 7+ days

        const upcomingDays: { [date: string]: number } = {};

        for (const word of allWords as Array<{ next_review_date: string | null }>) {
            if (!word.next_review_date) {
                dueToday++;
                continue;
            }

            const reviewDate = new Date(word.next_review_date);
            reviewDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                overdue++;
            } else if (daysDiff === 0) {
                dueToday++;
            } else if (daysDiff <= 3) {
                dueSoon++;
            } else if (daysDiff <= 7) {
                good++;
            } else {
                mastered++;
            }

            // Track upcoming days for next 14 days
            if (daysDiff >= 0 && daysDiff <= 14) {
                const dateKey = word.next_review_date.split('T')[0];
                upcomingDays[dateKey] = (upcomingDays[dateKey] || 0) + 1;
            }
        }

        return {
            overdue,
            dueToday,
            dueSoon,
            good,
            mastered,
            totalWords: allWords.length,
            upcomingDays,
        };
    });

    // Export all data to JSON file
    ipcMain.handle('export-data', async () => {
        try {
            const result = await dialog.showSaveDialog({
                title: 'Export LinguaReader Data',
                defaultPath: `linguareader-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Export cancelled' };
            }

            // Collect all data
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                wordLists: db?.prepare('SELECT * FROM word_lists').all() || [],
                words: db?.prepare('SELECT * FROM words').all() || [],
                wordListItems: db?.prepare('SELECT * FROM word_list_items').all() || [],
                quizResults: db?.prepare('SELECT * FROM quiz_results').all() || [],
                userSettings: db?.prepare('SELECT * FROM user_settings').all() || [],
                wordFamiliarity: db?.prepare('SELECT * FROM word_familiarity').all() || [],
            };

            fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
            return { success: true, path: result.filePath };
        } catch (error) {
            console.error('Export error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Import data from JSON file
    ipcMain.handle('import-data', async () => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Import LinguaReader Data',
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile'],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: 'Import cancelled' };
            }

            const fileContent = fs.readFileSync(result.filePaths[0], 'utf-8');
            const importData = JSON.parse(fileContent);

            // Validate structure
            if (!importData.version || !importData.wordLists || !importData.words) {
                return { success: false, error: 'Invalid backup file format' };
            }

            const stats = { lists: 0, words: 0, familiarity: 0 };

            // Use transaction for data integrity
            const transaction = db?.transaction(() => {
                // Map old list IDs to new list IDs
                const listIdMap = new Map<number, number>();

                // Import word lists - skip if name already exists
                for (const list of importData.wordLists as Array<{ id: number; name: string; description: string; color?: string; created_at: string }>) {
                    const existing = db?.prepare('SELECT id FROM word_lists WHERE name = ?').get(list.name) as { id: number } | undefined;
                    if (existing) {
                        listIdMap.set(list.id, existing.id);
                    } else {
                        const res = db?.prepare('INSERT INTO word_lists (name, description, color, created_at) VALUES (?, ?, ?, ?)').run(
                            list.name, list.description, list.color || null, list.created_at
                        );
                        listIdMap.set(list.id, res?.lastInsertRowid as number);
                        stats.lists++;
                    }
                }

                // Map old word IDs to new word IDs
                const wordIdMap = new Map<number, number>();

                // Import words - skip if same word+translation already exists
                for (const word of importData.words as Array<{ id: number; word: string; translation: string; source_language: string; target_language: string; sentence_context: string; pdf_name: string; created_at: string; mastery_level: number }>) {
                    const existing = db?.prepare('SELECT id FROM words WHERE word = ? AND translation = ?').get(word.word, word.translation) as { id: number } | undefined;
                    if (existing) {
                        wordIdMap.set(word.id, existing.id);
                    } else {
                        const res = db?.prepare('INSERT INTO words (word, translation, source_language, target_language, sentence_context, pdf_name, created_at, mastery_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
                            word.word, word.translation, word.source_language, word.target_language, word.sentence_context, word.pdf_name, word.created_at, word.mastery_level
                        );
                        wordIdMap.set(word.id, res?.lastInsertRowid as number);
                        stats.words++;
                    }
                }

                // Import word-list relationships
                for (const item of importData.wordListItems as Array<{ word_list_id: number; word_id: number }>) {
                    const newListId = listIdMap.get(item.word_list_id);
                    const newWordId = wordIdMap.get(item.word_id);
                    if (newListId && newWordId) {
                        try {
                            db?.prepare('INSERT OR IGNORE INTO word_list_items (word_list_id, word_id) VALUES (?, ?)').run(newListId, newWordId);
                        } catch {
                            // Ignore duplicates
                        }
                    }
                }

                // Import word familiarity - update if exists, insert if not
                for (const fam of importData.wordFamiliarity as Array<{ word_lower: string; familiarity_level: number; translation: string | null; easiness_factor: number; interval: number; repetitions: number; next_review_date: string | null; last_review_date: string | null }>) {
                    const existing = db?.prepare('SELECT id FROM word_familiarity WHERE word_lower = ?').get(fam.word_lower);
                    if (!existing) {
                        db?.prepare('INSERT INTO word_familiarity (word_lower, familiarity_level, translation, easiness_factor, interval, repetitions, next_review_date, last_review_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
                            fam.word_lower, fam.familiarity_level, fam.translation, fam.easiness_factor, fam.interval, fam.repetitions, fam.next_review_date, fam.last_review_date
                        );
                        stats.familiarity++;
                    }
                }

                // Import user settings - only if not already set
                for (const setting of (importData.userSettings || []) as Array<{ key: string; value: string }>) {
                    db?.prepare('INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)').run(setting.key, setting.value);
                }
            });

            transaction?.();

            return { success: true, imported: stats };
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Parse import file and return data for UI to handle
    ipcMain.handle('parse-import-file', async () => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Import Words',
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile'],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, cancelled: true };
            }

            const fileContent = fs.readFileSync(result.filePaths[0], 'utf-8');
            const importData = JSON.parse(fileContent);

            // Check if it's a full backup (has version and wordLists)
            if (importData.version && importData.wordLists && importData.words) {
                return { success: true, type: 'full-backup', data: importData };
            }

            // Check if it's a words-only format
            if (importData.words && Array.isArray(importData.words)) {
                return {
                    success: true,
                    type: 'words-only',
                    listName: importData.listName || null,
                    listDescription: importData.listDescription || '',
                    words: importData.words,
                };
            }

            return { success: false, error: 'Unknown file format' };
        } catch (error) {
            console.error('Parse import error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Import words to a specific list (for words-only imports)
    ipcMain.handle('import-words-to-list', async (_, listId: number, words: Array<{ word: string; translation: string; source_language?: string; target_language?: string }>) => {
        try {
            const stats = { words: 0, familiarity: 0 };

            const transaction = db?.transaction(() => {
                for (const wordData of words) {
                    // Check if word+translation already exists
                    const existing = db?.prepare('SELECT id FROM words WHERE word = ? AND translation = ?').get(wordData.word, wordData.translation) as { id: number } | undefined;

                    let wordId: number;
                    if (existing) {
                        wordId = existing.id;
                    } else {
                        const res = db?.prepare('INSERT INTO words (word, translation, source_language, target_language, sentence_context, pdf_name, created_at, mastery_level) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)').run(
                            wordData.word,
                            wordData.translation,
                            wordData.source_language || 'auto',
                            wordData.target_language || 'en',
                            '',
                            'imported'
                        );
                        wordId = res?.lastInsertRowid as number;
                        stats.words++;
                    }

                    // Add to list (ignore duplicates)
                    try {
                        db?.prepare('INSERT OR IGNORE INTO word_list_items (word_list_id, word_id) VALUES (?, ?)').run(listId, wordId);
                    } catch {
                        // Ignore
                    }

                    // Set initial familiarity (level 1 = unknown)
                    const wordLower = wordData.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '');
                    const existingFam = db?.prepare('SELECT id FROM word_familiarity WHERE word_lower = ?').get(wordLower);
                    if (!existingFam) {
                        const today = new Date().toISOString().split('T')[0];
                        db?.prepare('INSERT INTO word_familiarity (word_lower, familiarity_level, translation, easiness_factor, interval, repetitions, next_review_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
                            wordLower, 1, wordData.translation, 2.5, 0, 0, today
                        );
                        stats.familiarity++;
                    }
                }
            });

            transaction?.();

            return { success: true, imported: stats };
        } catch (error) {
            console.error('Import words error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Export a single word list
    ipcMain.handle('export-list', async (_, listId: number, includeProgress: boolean) => {
        try {
            // Get list info
            const list = db?.prepare('SELECT * FROM word_lists WHERE id = ?').get(listId) as { name: string; description: string; color: string } | undefined;
            if (!list) {
                return { success: false, error: 'List not found' };
            }

            // Get words in this list
            const words = db?.prepare(`
                SELECT w.word, w.translation, w.source_language, w.target_language
                FROM words w
                JOIN word_list_items wli ON w.id = wli.word_id
                WHERE wli.word_list_id = ?
            `).all(listId) as Array<{ word: string; translation: string; source_language: string; target_language: string }> || [];

            let exportData: {
                listName: string;
                listDescription?: string;
                exportedAt?: string;
                words: Array<{
                    word: string;
                    translation: string;
                    source_language?: string;
                    target_language?: string;
                    familiarity_level?: number;
                    easiness_factor?: number;
                    interval?: number;
                    repetitions?: number;
                    next_review_date?: string | null;
                }>;
            };

            if (includeProgress) {
                // Include SRS data for each word
                const wordsWithProgress = words.map(w => {
                    const wordLower = w.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '');
                    const familiarity = db?.prepare('SELECT * FROM word_familiarity WHERE word_lower = ?').get(wordLower) as {
                        familiarity_level: number;
                        easiness_factor: number;
                        interval: number;
                        repetitions: number;
                        next_review_date: string | null;
                    } | undefined;

                    return {
                        word: w.word,
                        translation: w.translation,
                        source_language: w.source_language,
                        target_language: w.target_language,
                        familiarity_level: familiarity?.familiarity_level || 1,
                        easiness_factor: familiarity?.easiness_factor || 2.5,
                        interval: familiarity?.interval || 0,
                        repetitions: familiarity?.repetitions || 0,
                        next_review_date: familiarity?.next_review_date || null,
                    };
                });

                exportData = {
                    listName: list.name,
                    listDescription: list.description,
                    exportedAt: new Date().toISOString(),
                    words: wordsWithProgress,
                };
            } else {
                // Raw words only (for sharing)
                exportData = {
                    listName: list.name,
                    words: words.map(w => ({
                        word: w.word,
                        translation: w.translation,
                    })),
                };
            }

            // Show save dialog
            const fileName = includeProgress
                ? `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}-with-progress.json`
                : `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;

            const result = await dialog.showSaveDialog({
                title: `Export "${list.name}"`,
                defaultPath: fileName,
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Export cancelled' };
            }

            fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
            return { success: true, path: result.filePath, wordCount: words.length };
        } catch (error) {
            console.error('Export list error:', error);
            return { success: false, error: String(error) };
        }
    });
}

app.whenReady().then(() => {
    initDatabase();
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db?.close();
        app.quit();
    }
});
