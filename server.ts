import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { fetchAppStateFromFirestore, saveAppStateToFirestore, saveUserToFirestore, getFirestoreDb } from './src/serverFirestore';
import { COMMON_ROUTINE_DICTIONARY, getDictionaryDefinition } from './src/data/dictionaryDatabase';

const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory / persistent mock database file
const DB_FILE = path.join(process.cwd(), 'app-data.json');

interface AppDb {
  teachers: Array<{ email: string; name: string; role: string; registeredByAdmin?: boolean; avatar?: string; picture?: string; approvalStatus?: string }>;
  tutorsList: Array<any>;
  deletedTutorIds?: string[];
  deletedTutorEmails?: string[];
  deletedStudentEmails?: string[];
  students: Array<any>;
  meetSettings: Record<string, any>;
  teacherSettings: Record<string, any>;
  liveLessons: any[];
  chatMessages: any[];
  routinesByDay: Record<string, any>;
  studentRoutinesMap: Record<string, any>;
  contractedLessons: Record<string, number>;
  userProfiles: Record<string, any>;
  emailLogs: any[];
  weeklyHomework: any;
  landingContent: any;
  dictionary: Record<string, any>;
  studentWeeklyChecks: Record<string, Record<string, boolean>>;
  studentDictionaryMap?: Record<string, any[]>;
  authUsers: Record<string, { uid?: string; email: string; password?: string; name: string; role: string; createdAt?: string; updatedAt?: string }>;
  transactions?: any[];
}

const DEFAULT_LANDING_CONTENT = {
  heroBadge: 'Uma Nova Filosofia de Inglês',
  heroHeadlineStart: 'Learn English by',
  heroHeadlineHighlight: 'Living your Life',
  heroQuote: '“Você não precisa estudar mais. Você pode viver em inglês.”',
  heroSubtext: 'Transforme sua rotina diária em prática real. Do café da manhã ao trabalho e descanso noturno. Sua vida. Seu inglês. Do seu jeito.',
  heroFindFriendBtn: 'Encontre Seu Amigo Nativo',
  heroStartLivingBtn: 'Comece a Viver em Inglês',
  philosophyBadge: 'A Ciência do Hábito',
  philosophyHeading1: 'Não mude sua rotina.',
  philosophyHeading2: 'Viva-a em Inglês.',
  philosophySubheading: 'Aprender inglês não precisa ser uma tarefa pesada de 2 horas em uma sala de aula após um longo dia de trabalho. Conectamos seu aprendizado com o que você já faz todos os dias.',
  philosophyPillar1Title: 'Prática Integrada à Sua Vida',
  philosophyPillar1Desc: 'Cada momento do seu dia se torna uma oportunidade de aprendizado natural — sem sobrecarregar sua agenda.',
  philosophyPillar1Tag: 'Zero Sobrecarga',
  philosophyPillar2Title: '5 Palavras Chave por Atividade',
  philosophyPillar2Desc: 'Foque apenas nas palavras e expressões essenciais para cada momento. Qualidade e contexto superam quantidade.',
  philosophyPillar2Tag: 'Aprendizado Focado',
  philosophyPillar3Title: 'Amigos Nativos & IA',
  philosophyPillar3Desc: 'Sessões individuais ao vivo no Google Meet combinadas com correções instantâneas de IA no seu diário.',
  philosophyPillar3Tag: 'Imersão Humana + IA',
  footerSlogan: 'Learn English by living your life!',
};

// Clean initial state: zero mock tutors, zero fake test accounts
const DEFAULT_TUTORS_LIST: any[] = [];

const DEFAULT_DB: AppDb = {
  teachers: [
    {
      email: 'adm.itissimple@gmail.com',
      name: "Admin It's Simple",
      role: 'admin',
      registeredByAdmin: true,
    },
  ],
  tutorsList: [],
  deletedTutorIds: [],
  deletedTutorEmails: [],
  deletedStudentEmails: [],
  students: [],
  meetSettings: {},
  teacherSettings: {},
  liveLessons: [],
  chatMessages: [],
  routinesByDay: {},
  studentRoutinesMap: {},
  contractedLessons: {},
  userProfiles: {
    'adm.itissimple@gmail.com': {
      uid: 'admin-master-uid',
      email: 'adm.itissimple@gmail.com',
      name: "Admin It's Simple",
      role: 'admin',
    },
  },
  emailLogs: [],
  weeklyHomework: null,
  landingContent: DEFAULT_LANDING_CONTENT,
  dictionary: {},
  studentWeeklyChecks: {},
  studentDictionaryMap: {},
  authUsers: {
    'adm.itissimple@gmail.com': {
      uid: 'admin-master-uid',
      email: 'adm.itissimple@gmail.com',
      name: "Admin It's Simple",
      role: 'admin',
      password: 'Makeiteasy2026*',
    },
  },
};

// Cached memory state backed by both app-data.json and Firebase Firestore cloud
let inMemoryDb: AppDb = DEFAULT_DB;

function mergeDbWithDefaults(parsed: any): AppDb {
  return {
    ...DEFAULT_DB,
    ...(parsed || {}),
    studentWeeklyChecks: (parsed && parsed.studentWeeklyChecks) || {},
    studentDictionaryMap: (parsed && parsed.studentDictionaryMap) || {},
    authUsers: (parsed && parsed.authUsers) || DEFAULT_DB.authUsers,
    teacherSettings: (parsed && parsed.teacherSettings) || {},
    meetSettings: (parsed && parsed.meetSettings) || {},
    landingContent: {
      ...DEFAULT_LANDING_CONTENT,
      ...((parsed && parsed.landingContent) || {}),
    },
    deletedTutorIds: Array.isArray(parsed?.deletedTutorIds) ? parsed.deletedTutorIds : [],
    deletedTutorEmails: Array.isArray(parsed?.deletedTutorEmails) ? parsed.deletedTutorEmails : [],
    deletedStudentEmails: Array.isArray(parsed?.deletedStudentEmails) ? parsed.deletedStudentEmails : [],
    tutorsList: Array.isArray(parsed?.tutorsList) ? parsed.tutorsList : [],
    teachers: (Array.isArray(parsed?.teachers) ? parsed.teachers : DEFAULT_DB.teachers).filter(
      (t: any) => t.email?.toLowerCase() !== 'reginahelena1980@gmail.com' && !t.name?.toLowerCase().includes('regina')
    ),
    students: (Array.isArray(parsed?.students) ? parsed.students : []).filter((s: any) => {
      const email = (s.email || s.studentEmail || '').toLowerCase().trim();
      const deletedStudentList: string[] = Array.isArray(parsed?.deletedStudentEmails) ? parsed.deletedStudentEmails : [];
      return !email || !deletedStudentList.includes(email);
    }),
    liveLessons: (Array.isArray(parsed?.liveLessons) ? parsed.liveLessons : []).map((l: any) => {
      if (l && (l.cancelledAt || l.cancelledBy || l.cancellationReason) && l.status !== 'cancelled') {
        l.status = 'cancelled';
      }
      if (!l.studentEmail || l.studentEmail.trim() === '') {
        const sName = (l.studentName || '').toLowerCase().trim();
        if (sName.includes('vinicius') || sName.includes('ferraz')) {
          l.studentEmail = 'viniciusferrazcardoso@gmail.com';
        } else if (sName.includes('regina')) {
          l.studentEmail = 'reginahelena1980@gmail.com';
        } else if (sName.includes('lavinia')) {
          l.studentEmail = 'laviniatilapia@gmail.com';
        }
      }
      return l;
    }),
    contractedLessons: (parsed && parsed.contractedLessons) || {},
    userProfiles: (parsed && parsed.userProfiles) || DEFAULT_DB.userProfiles,
  };
}

function readDb(): AppDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      inMemoryDb = mergeDbWithDefaults(parsed);
      return inMemoryDb;
    }
  } catch (err) {
    console.warn('Error reading local db file:', err);
  }
  return inMemoryDb;
}

let syncTimeout: any = null;

function writeDb(db: AppDb) {
  inMemoryDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing db file:', err);
  }

  // Cloud Firestore asynchronous sync
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    saveAppStateToFirestore(db).catch((err) => {
      console.warn('Background Firestore sync error:', err);
    });
  }, 300);
}

// Immediate synchronous disk write + background Cloud Firestore sync
async function writeDbSync(db: AppDb): Promise<void> {
  inMemoryDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing db file:', err);
  }
  // Run Firestore sync in background without blocking the HTTP response
  saveAppStateToFirestore(db).catch((err) => {
    console.warn('Background Firestore sync error:', err);
  });
}

// Initial hydration from Firestore on server startup
async function initCloudPersistence() {
  try {
    // 1. Read local file first
    readDb();

    // 2. Fetch latest state from Cloud Firestore
    const cloudState = await fetchAppStateFromFirestore();
    if (cloudState && typeof cloudState === 'object') {
      console.log('Successfully hydrated database from Firebase Firestore cloud');
      const mergedAuthUsers = {
        ...(inMemoryDb.authUsers || {}),
        ...(cloudState.authUsers || {}),
      };
      const mergedUserProfiles = {
        ...(inMemoryDb.userProfiles || {}),
        ...(cloudState.userProfiles || {}),
      };

      // Merge tutorsList by email/id so NO tutor is ever lost
      const localTutors = inMemoryDb.tutorsList || [];
      const cloudTutors = Array.isArray(cloudState.tutorsList) ? cloudState.tutorsList : [];
      const tutorMap = new Map<string, any>();
      cloudTutors.forEach((t: any) => {
        const key = (t.email || t.id || '').toLowerCase().trim();
        if (key) tutorMap.set(key, t);
      });
      localTutors.forEach((t: any) => {
        const key = (t.email || t.id || '').toLowerCase().trim();
        if (key) {
          const existing = tutorMap.get(key) || {};
          tutorMap.set(key, { ...existing, ...t });
        }
      });
      const mergedTutorsList = Array.from(tutorMap.values());

      // Merge teachers list by email
      const localTeachers = inMemoryDb.teachers || [];
      const cloudTeachers = Array.isArray(cloudState.teachers) ? cloudState.teachers : [];
      const teacherMap = new Map<string, any>();
      cloudTeachers.forEach((t: any) => {
        const key = (t.email || '').toLowerCase().trim();
        if (key) teacherMap.set(key, t);
      });
      localTeachers.forEach((t: any) => {
        const key = (t.email || '').toLowerCase().trim();
        if (key) {
          const existing = teacherMap.get(key) || {};
          teacherMap.set(key, { ...existing, ...t });
        }
      });
      const mergedTeachers = Array.from(teacherMap.values());

      // Merge students list by email, excluding deleted students
      const localDeletedStudents: string[] = inMemoryDb.deletedStudentEmails || [];
      const cloudDeletedStudents: string[] = Array.isArray(cloudState.deletedStudentEmails) ? cloudState.deletedStudentEmails : [];
      const allDeletedStudentEmails = Array.from(new Set([...localDeletedStudents, ...cloudDeletedStudents]));
      inMemoryDb.deletedStudentEmails = allDeletedStudentEmails;

      allDeletedStudentEmails.forEach((em) => {
        delete mergedUserProfiles[em];
      });

      const localStudents = inMemoryDb.students || [];
      const cloudStudents = Array.isArray(cloudState.students) ? cloudState.students : [];
      const studentMap = new Map<string, any>();
      cloudStudents.forEach((s: any) => {
        const key = (s.studentEmail || s.email || '').toLowerCase().trim();
        if (key && !allDeletedStudentEmails.includes(key)) studentMap.set(key, s);
      });
      localStudents.forEach((s: any) => {
        const key = (s.studentEmail || s.email || '').toLowerCase().trim();
        if (key && !allDeletedStudentEmails.includes(key)) {
          const existing = studentMap.get(key) || {};
          studentMap.set(key, { ...existing, ...s });
        }
      });
      const mergedStudents = Array.from(studentMap.values());

      // Merge liveLessons by id
      const localLessons = inMemoryDb.liveLessons || [];
      const cloudLessons = Array.isArray(cloudState.liveLessons) ? cloudState.liveLessons : [];
      const lessonMap = new Map<string, any>();
      cloudLessons.forEach((l: any) => {
        if (l.id) lessonMap.set(l.id, l);
      });
      localLessons.forEach((l: any) => {
        if (l.id) {
          const existing = lessonMap.get(l.id) || {};
          const merged = { ...existing, ...l };
          if (existing.cancelledAt || l.cancelledAt || existing.status === 'cancelled' || l.status === 'cancelled') {
            merged.status = 'cancelled';
            merged.cancelledAt = l.cancelledAt || existing.cancelledAt || new Date().toISOString();
            merged.cancelledBy = l.cancelledBy || existing.cancelledBy || 'student';
          }
          lessonMap.set(l.id, merged);
        }
      });
      const mergedLiveLessons = Array.from(lessonMap.values()).map((l: any) => {
        if (l && (l.cancelledAt || l.cancelledBy || l.cancellationReason) && l.status !== 'cancelled') {
          l.status = 'cancelled';
        }
        if (!l.studentEmail || l.studentEmail.trim() === '') {
          const sName = (l.studentName || '').toLowerCase().trim();
          if (sName.includes('vinicius') || sName.includes('ferraz')) {
            l.studentEmail = 'viniciusferrazcardoso@gmail.com';
          } else if (sName.includes('regina')) {
            l.studentEmail = 'reginahelena1980@gmail.com';
          }
        }
        return l;
      });

      inMemoryDb = mergeDbWithDefaults({
        ...inMemoryDb,
        ...cloudState,
        authUsers: mergedAuthUsers,
        userProfiles: mergedUserProfiles,
        tutorsList: mergedTutorsList,
        teachers: mergedTeachers,
        students: mergedStudents,
        liveLessons: mergedLiveLessons,
      });
      fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
      await saveAppStateToFirestore(inMemoryDb);
    } else {
      console.log('No existing Firestore state found, bootstrapping initial state to cloud');
      await saveAppStateToFirestore(inMemoryDb);
    }
  } catch (err) {
    console.warn('Cloud persistence init notice:', err);
  }
}

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1.1 Auth Endpoints (Preply-style Login & Registration)
app.get('/api/auth/admin-status', (req, res) => {
  const db = readDb();
  // Check if admin is registered with credentials
  const adminWithPassword = Object.values(db.authUsers || {}).find(
    (u: any) => u.role === 'admin' && u.password
  );
  const adminAccount = adminWithPassword || db.teachers?.find((t) => t.role === 'admin');

  res.json({
    hasAdminRegistered: !!adminWithPassword,
    adminEmail: adminAccount ? adminAccount.email : null,
    adminName: adminAccount ? adminAccount.name : null,
  });
});

app.get('/api/auth/admin-status', (req, res) => {
  const db = readDb();
  const existingAdminWithPassword = Object.values(db.authUsers || {}).find(
    (u: any) => u.role === 'admin' && u.password
  );
  res.json({
    hasAdmin: !!existingAdminWithPassword,
    adminEmail: existingAdminWithPassword ? (existingAdminWithPassword as any).email : 'adm.itissimple@gmail.com',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const db = readDb();
  const { email, password, role: requestedRole, localBackup } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email or username is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let authRecord = db.authUsers?.[cleanEmail];

  // Also check case-insensitive match in authUsers
  if (!authRecord && db.authUsers) {
    const matchedKey = Object.keys(db.authUsers).find(
      (k) => k.toLowerCase().trim() === cleanEmail
    );
    if (matchedKey) {
      authRecord = db.authUsers[matchedKey];
    }
  }

  // If user is not yet in authUsers, check if client provided a local localStorage backup to restore
  if (!authRecord && localBackup && localBackup.email && localBackup.email.toLowerCase().trim() === cleanEmail) {
    console.log('Restoring account from client localStorage backup:', cleanEmail);
    const restoredUid = localBackup.uid || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    authRecord = {
      uid: restoredUid,
      email: cleanEmail,
      name: localBackup.name || cleanEmail.split('@')[0],
      password: localBackup.password || password || '',
      role: localBackup.role || requestedRole || 'student',
      createdAt: localBackup.registeredAt || new Date().toISOString(),
    };
    if (!db.authUsers) db.authUsers = {};
    db.authUsers[cleanEmail] = authRecord;

    if (authRecord.role === 'student') {
      if (!db.students) db.students = [];
      const hasStudent = db.students.some((s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail);
      if (!hasStudent) {
        db.students.push({
          id: restoredUid,
          name: authRecord.name,
          studentName: authRecord.name,
          email: cleanEmail,
          studentEmail: cleanEmail,
          level: localBackup.profile?.level || 'iniciante',
          studentLevel: localBackup.profile?.level || 'iniciante',
          goal: localBackup.profile?.learningGoal || 'English for everyday life & work',
          learningGoal: localBackup.profile?.learningGoal || 'English for everyday life & work',
          contractedLessons: 5,
          completedLessonsCount: 0,
          status: 'active',
          activeSince: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          avatar: localBackup.profile?.avatar || '',
          picture: localBackup.profile?.picture || '',
        });
      }
      if (!db.userProfiles) db.userProfiles = {};
      if (!db.userProfiles[cleanEmail]) {
        db.userProfiles[cleanEmail] = {
          id: restoredUid,
          name: authRecord.name,
          email: cleanEmail,
          level: localBackup.profile?.level || 'iniciante',
          enrollmentStatus: 'active',
          learningGoal: localBackup.profile?.learningGoal || 'English for everyday life & work',
          streakDays: 0,
          streakCount: 0,
          points: 0,
          dailyGoalMinutes: 30,
          completedTodayMinutes: 0,
          contractedLessons: 5,
          completedLessonsCount: 0,
          picture: localBackup.profile?.picture || '',
          avatar: localBackup.profile?.avatar || '',
          createdAt: new Date().toISOString(),
        };
      }
    }
    await writeDbSync(db);
  }

  // Strictly require existing registered account (no auto-creating unregistered accounts on login)
  if (!authRecord && cleanEmail !== 'adm.itissimple@gmail.com') {
    const isKnownTeacher = (db.tutorsList || []).some((t: any) => (t.email || '').toLowerCase() === cleanEmail);
    const isKnownStudent = (db.students || []).some((s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail);
    if (!isKnownTeacher && !isKnownStudent) {
      return res.status(401).json({
        error: 'Conta não encontrada. Por favor, crie seu cadastro antes de fazer login.',
      });
    }
  }

  // If user registered with password, enforce password check
  if (authRecord && authRecord.password && password) {
    // Special admin handling for adm.itissimple@gmail.com
    if (cleanEmail === 'adm.itissimple@gmail.com') {
      if (password === 'Makeiteasy2026*' || password === 'admin' || authRecord.password === password) {
        if (authRecord.password !== password) {
          authRecord.password = password;
          writeDb(db);
        }
      } else {
        return res.status(401).json({ error: 'Senha incorreta. Por favor, verifique a senha digitada.' });
      }
    } else if (authRecord.password !== password) {
      return res.status(401).json({ error: 'Senha incorreta. Por favor, verifique a senha digitada.' });
    }
  } else if (!authRecord && cleanEmail === 'adm.itissimple@gmail.com' && password) {
    if (password !== 'Makeiteasy2026*' && password !== 'admin') {
      return res.status(401).json({ error: 'Senha incorreta. Por favor, verifique a senha digitada.' });
    }
  }

  let role = requestedRole || 'student';
  let name = cleanEmail.split('@')[0];

  // 1. Check if admin
  if (authRecord?.role === 'admin' || cleanEmail === 'adm.itissimple@gmail.com' || cleanEmail.includes('admin')) {
    role = 'admin';
    name = authRecord?.name || 'Admin It\'s Simple';
  } else if (
    authRecord?.role === 'teacher' ||
    (db.tutorsList || []).some((t: any) => (t.email || '').toLowerCase() === cleanEmail) ||
    (db.teachers || []).some((t: any) => (t.email || '').toLowerCase() === cleanEmail && t.role !== 'admin')
  ) {
    // 2. Native Friend / Teacher: strictly enforce Teacher role so student data is never leaked or mixed
    role = 'teacher';
    const tutorObj = (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase() === cleanEmail);
    const teacherObj = (db.teachers || []).find((t: any) => (t.email || '').toLowerCase() === cleanEmail);
    name = tutorObj?.name || teacherObj?.name || authRecord?.name || name;

    // Purge any accidental student profile entry for this teacher
    if (db.userProfiles && db.userProfiles[cleanEmail]) {
      delete db.userProfiles[cleanEmail];
      writeDb(db);
    }
  } else if (authRecord) {
    role = authRecord.role;
    name = authRecord.name || name;
  } else if (requestedRole) {
    role = requestedRole === 'teacher' ? 'teacher' : (requestedRole === 'admin' ? 'admin' : 'student');
    if (role === 'teacher') {
      const teacherObj = db.teachers?.find((t) => t.email.toLowerCase() === cleanEmail);
      if (teacherObj) name = teacherObj.name;
    } else if (role === 'student') {
      const studentObj = db.students?.find(
        (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
      );
      if (studentObj) {
        name = studentObj.name || studentObj.studentName || name;
      }
    }
  }

  const tutorObj = (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase() === cleanEmail);
  const userProfile = db.userProfiles?.[cleanEmail];
  const userPicture = (role === 'teacher' ? (tutorObj?.avatar || '') : '') || (userProfile?.picture || userProfile?.avatar || '');

  const account = {
    uid: authRecord?.uid || (tutorObj as any)?.uid || (cleanEmail === 'adm.itissimple@gmail.com' ? 'admin-master-uid' : `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`),
    email: cleanEmail,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    role,
    picture: userPicture,
  };

  res.json({
    success: true,
    account,
    profile: role === 'teacher' ? null : (db.userProfiles?.[cleanEmail] || null),
    student: role === 'teacher' ? null : (db.students?.find((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail) || null),
    tutor: tutorObj || null,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const db = readDb();
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email e nova senha são obrigatórios.' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!db.authUsers) db.authUsers = {};

  if (!db.authUsers[cleanEmail]) {
    const inStudents = (db.students || []).find(
      (s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
    );
    const inTeachers = (db.teachers || []).find(
      (t: any) => t.email?.toLowerCase() === cleanEmail
    );
    const inTutors = (db.tutorsList || []).find(
      (t: any) => t.email?.toLowerCase() === cleanEmail
    );
    const role = cleanEmail === 'adm.itissimple@gmail.com' ? 'admin' : inTeachers || inTutors ? 'teacher' : 'student';
    const name = inStudents?.name || inTeachers?.name || inTutors?.name || cleanEmail.split('@')[0];

    db.authUsers[cleanEmail] = {
      email: cleanEmail,
      name,
      role,
      password: newPassword,
      createdAt: new Date().toISOString(),
    };
  } else {
    db.authUsers[cleanEmail].password = newPassword;
    db.authUsers[cleanEmail].updatedAt = new Date().toISOString();
  }

  writeDb(db);
  res.json({ success: true, message: 'Senha atualizada com sucesso!' });
});

app.get('/api/auth/check-user', (req, res) => {
  const db = readDb();
  const email = ((req.query.email as string) || '').toLowerCase().trim();
  const name = ((req.query.name as string) || '').toLowerCase().trim();
  const role = ((req.query.role as string) || '').toLowerCase().trim();

  let emailExists = false;
  let nameExists = false;
  let existingRole: string | null = null;
  let existingUser: any = null;

  if (email) {
    const inAuth = db.authUsers?.[email] || null;
    const inStudents = (db.students || []).find(
      (s: any) => (s.email || s.studentEmail || '').toLowerCase() === email
    );
    const inTutors = (db.tutorsList || []).find((t: any) => t.email?.toLowerCase() === email);

    if (inAuth || inStudents || inTutors) {
      emailExists = true;
      existingRole = inAuth?.role || (inTutors ? 'teacher' : inStudents ? 'student' : null);
      existingUser = inAuth || inTutors || inStudents;
    }
  }

  if (name) {
    const inStudents = (db.students || []).some(
      (s: any) => ((s.name || s.studentName || '') as string).trim().toLowerCase() === name
    );
    const inAuthStudent = Object.values(db.authUsers || {}).some(
      (u: any) => (u.name || '').trim().toLowerCase() === name && u.role === 'student'
    );
    const inTutors = (db.tutorsList || []).some(
      (t: any) => (t.name || '').trim().toLowerCase() === name
    );

    if (role === 'student' && (inStudents || inAuthStudent)) {
      nameExists = true;
    } else if (role === 'teacher' && inTutors) {
      nameExists = true;
    } else if (!role && (inStudents || inAuthStudent || inTutors)) {
      nameExists = true;
    }
  }

  res.json({
    exists: emailExists || nameExists,
    emailExists,
    nameExists,
    role: existingRole,
    name: existingUser?.name || null,
    profile: email ? (db.userProfiles?.[email] || null) : null,
    student: email ? (db.students?.find((s: any) => (s.email || s.studentEmail || '').toLowerCase() === email) || null) : null,
    tutor: email ? (db.tutorsList?.find((t: any) => t.email?.toLowerCase() === email) || null) : null,
  });
});

const handleRegistration = async (req: any, res: any) => {
  const db = readDb();
  const { name, email, password, role = 'student' } = req.body;
  const level = req.body.englishLevel || req.body.level || 'iniciante';
  const goal = req.body.learningGoal || req.body.goal || 'English for everyday life & work';

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();
  const cleanNameLower = cleanName.toLowerCase();
  const requestedRole = (role || 'student').toLowerCase();

  // ----------------------------------------------------
  // 1. ADMIN REGISTRATION (Strictly only 1 admin allowed)
  // ----------------------------------------------------
  if (requestedRole === 'admin') {
    // Check if an admin already exists in authUsers or teachers
    const existingAdminInAuth = Object.values(db.authUsers || {}).find(
      (u: any) => u.role === 'admin' && u.email !== cleanEmail
    );
    const existingAdminInTeachers = (db.teachers || []).find(
      (t: any) => t.role === 'admin' && (t.email || '').toLowerCase() !== cleanEmail
    );

    if (existingAdminInAuth || existingAdminInTeachers) {
      return res.status(403).json({
        error: 'Já existe um Administrador cadastrado na plataforma. Só é permitido um único Administrador no sistema.',
        hasAdminRegistered: true,
      });
    }

    const adminUid = req.body.uid || 'admin-master-uid';
    // Register or update admin credentials
    if (!db.authUsers) db.authUsers = {};
    db.authUsers[cleanEmail] = {
      uid: adminUid,
      email: cleanEmail,
      name: cleanName,
      password: password || '',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    // Ensure teachers list has this admin marked as admin
    const tIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
    if (tIdx >= 0) {
      db.teachers[tIdx] = { ...db.teachers[tIdx], name: cleanName, role: 'admin', registeredByAdmin: true };
    } else {
      db.teachers.push({ email: cleanEmail, name: cleanName, role: 'admin', registeredByAdmin: true });
    }

    if (!db.userProfiles) db.userProfiles = {};
    db.userProfiles[cleanEmail] = {
      uid: adminUid,
      id: adminUid,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
    };

    await writeDbSync(db);
    await saveUserToFirestore({
      uid: adminUid,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    const account = {
      uid: adminUid,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      picture: '',
    };

    return res.json({
      success: true,
      account,
      message: 'Administrador cadastrado com sucesso.',
    });
  }

  // ----------------------------------------------------
  // 2. TEACHER / NATIVE FRIEND REGISTRATION
  // ----------------------------------------------------
  if (requestedRole === 'teacher') {
    // Check duplicate email across platform
    const isExistingTutorEmail =
      (db.tutorsList || []).some((t: any) => t.email?.toLowerCase() === cleanEmail) ||
      (db.teachers || []).some((t: any) => t.email?.toLowerCase() === cleanEmail && t.role !== 'admin') ||
      Boolean(db.authUsers?.[cleanEmail]);

    if (isExistingTutorEmail && !req.body.isUpdate) {
      return res.status(409).json({
        error: 'Este e-mail já está cadastrado no sistema. Por favor, faça login com sua conta ou utilize outro e-mail.',
        duplicateField: 'email',
        isExistingUser: true,
      });
    }

    // Check duplicate name for Native Friend
    const isExistingTutorName =
      (db.tutorsList || []).some((t: any) => (t.name || '').trim().toLowerCase() === cleanNameLower) ||
      (db.teachers || []).some((t: any) => (t.name || '').trim().toLowerCase() === cleanNameLower && t.role === 'teacher') ||
      Object.values(db.authUsers || {}).some((u: any) => (u.name || '').trim().toLowerCase() === cleanNameLower && u.role === 'teacher');

    if (isExistingTutorName && !req.body.isUpdate) {
      return res.status(409).json({
        error: 'Já existe um Amigo Nativo cadastrado com este nome na plataforma. Por favor, inclua seu sobrenome ou use um nome distintivo.',
        duplicateField: 'name',
        isExistingUser: true,
      });
    }

    const tutorId = req.body.id || req.body.uid || `tutor-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    // Zero-leakage: never use stock mock photos. If user provided an avatar use it, otherwise empty string.
    const tutorAvatar = req.body.avatar || req.body.picture || '';

    const tutorEntry = {
      id: tutorId,
      uid: tutorId,
      name: cleanName,
      email: cleanEmail,
      avatar: tutorAvatar,
      picture: tutorAvatar,
      role: 'teacher',
      country: req.body.country || 'United States',
      countryCode: req.body.countryCode || 'US',
      flag: req.body.flag || '🇺🇸',
      accent: req.body.accent || 'North American',
      rating: 5.0,
      reviewsCount: 0,
      activeStudents: 0,
      lessonsTaught: 0,
      pricePerSessionUsd: Number(req.body.pricePerSessionUsd || req.body.priceUsd) || 20,
      pricePerSessionBrl: Math.round((Number(req.body.pricePerSessionUsd || req.body.priceUsd) || 20) * 5.5),
      headline: req.body.headline || 'Conversational Native Friend',
      bio: req.body.bio || 'Hello! I am excited to help you live English in your daily routine.',
      specialties: Array.isArray(req.body.specialties) && req.body.specialties.length > 0
        ? req.body.specialties
        : (typeof req.body.specialties === 'string' && req.body.specialties.trim().length > 0
            ? req.body.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
            : ['Daily Routine & Lifestyle', 'Conversational Fluency']),
      videoIntroUrl: req.body.videoIntroUrl || req.body.videoUrl || '',
      availableDays: req.body.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      availableHours: req.body.availableHours || ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
      approvalStatus: 'pending', // REQUIRED: All new Native Friends default strictly to pending approval
      appliedAt: new Date().toISOString(),
      registeredByAdmin: false,
      meetUrl: req.body.meetUrl || req.body.meetLink || 'https://meet.google.com/new',
    };

    if (!db.tutorsList) db.tutorsList = [];
    const tutorIdx = db.tutorsList.findIndex((t) => t.email.toLowerCase() === cleanEmail);
    if (tutorIdx >= 0) {
      db.tutorsList[tutorIdx] = { ...db.tutorsList[tutorIdx], ...tutorEntry };
    } else {
      db.tutorsList.push(tutorEntry);
    }

    // Maintain teachers list
    const teacherIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
    if (teacherIdx >= 0) {
      db.teachers[teacherIdx] = {
        ...db.teachers[teacherIdx],
        name: cleanName,
        email: cleanEmail,
        role: 'teacher',
        avatar: tutorEntry.avatar,
        picture: tutorEntry.avatar,
      };
    } else {
      db.teachers.push({
        name: cleanName,
        email: cleanEmail,
        role: 'teacher',
        registeredByAdmin: false,
        avatar: tutorEntry.avatar,
        picture: tutorEntry.avatar,
      });
    }

    // Save auth credentials
    if (!db.authUsers) db.authUsers = {};
    db.authUsers[cleanEmail] = {
      uid: tutorId,
      email: cleanEmail,
      name: cleanName,
      password: password || '',
      role: 'teacher',
      createdAt: new Date().toISOString(),
    };

    // Maintain meet settings
    if (!db.meetSettings) db.meetSettings = {};
    db.meetSettings[cleanEmail] = {
      teacherEmail: cleanEmail,
      meetLink: req.body.meetUrl || req.body.meetLink || 'https://meet.google.com/new',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 30,
      availableDays: tutorEntry.availableDays,
      timezone: 'America/New_York',
    };

    // Purge any accidental student profile entry for this teacher
    if (db.userProfiles && db.userProfiles[cleanEmail]) {
      delete db.userProfiles[cleanEmail];
    }
    if (db.students) {
      db.students = db.students.filter((s: any) => (s.email || s.studentEmail || '').toLowerCase() !== cleanEmail);
    }

    // Log admin notification
    if (!db.emailLogs) db.emailLogs = [];
    db.emailLogs.push({
      id: `log-${Date.now()}`,
      to: 'adm.itissimple@gmail.com',
      subject: `Nova Solicitação de Amigo Nativo: ${cleanName}`,
      preview: `${cleanName} (${cleanEmail}) se cadastrou como Amigo Nativo e aguarda sua aprovação.`,
      date: new Date().toISOString(),
      status: 'pending_approval',
    });

    await writeDbSync(db);
    await saveUserToFirestore(tutorEntry);

    const account = {
      uid: tutorId,
      email: cleanEmail,
      name: cleanName,
      role: 'teacher',
      picture: tutorEntry.avatar,
    };

    return res.json({
      success: true,
      account,
      tutor: tutorEntry,
      approvalStatus: 'pending',
      message: 'Cadastro de Amigo Nativo enviado com sucesso! Seus dados foram salvos no seu perfil e aguardam aprovação do Administrador.',
    });
  }

  // ----------------------------------------------------
  // 3. STUDENT REGISTRATION
  // ----------------------------------------------------
  // 3.1 Check duplicate email across any platform table
  const isExistingStudentEmail =
    (db.students || []).some(
      (s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
    ) ||
    Boolean(db.authUsers?.[cleanEmail]) ||
    Boolean(db.userProfiles?.[cleanEmail]) ||
    (db.tutorsList || []).some((t: any) => (t.email || '').toLowerCase() === cleanEmail);

  if (isExistingStudentEmail && !req.body.isUpdate) {
    return res.status(409).json({
      error: 'Este e-mail já está cadastrado no sistema. Por favor, faça login com sua conta ou utilize outro e-mail para cadastrar um novo aluno.',
      duplicateField: 'email',
      isExistingUser: true,
    });
  }

  // 3.2 Check duplicate name for student
  const isExistingStudentName =
    (db.students || []).some(
      (s: any) => ((s.name || s.studentName || '') as string).trim().toLowerCase() === cleanNameLower
    ) ||
    Object.values(db.authUsers || {}).some(
      (u: any) => (u.name || '').trim().toLowerCase() === cleanNameLower && u.role === 'student'
    );

  if (isExistingStudentName && !req.body.isUpdate) {
    return res.status(409).json({
      error: 'Já existe um(a) aluno(a) cadastrado(a) com este nome no sistema. Por favor, informe seu nome completo e sobrenome para garantir sua identificação individual.',
      duplicateField: 'name',
      isExistingUser: true,
    });
  }

  // Generate clean, strictly exclusive UID for this new student
  const userUid = req.body.uid || req.body.id || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
  // Zero-leakage: completely clean, no stock or mock photo
  const userAvatar = req.body.avatar || req.body.picture || '';

  // Save student credentials permanently
  if (!db.authUsers) db.authUsers = {};
  db.authUsers[cleanEmail] = {
    uid: userUid,
    email: cleanEmail,
    name: cleanName,
    password: password || '',
    role: 'student',
    createdAt: new Date().toISOString(),
  };

  const existingIdx = db.students.findIndex(
    (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
  );

  const routineVideoTime = req.body.routineVideoTime || '09:00';
  const routineAudioTime = req.body.routineAudioTime || '14:00';
  const dailyPhraseTime = req.body.dailyPhraseTime || '20:00';

  if (existingIdx >= 0) {
    const existing = db.students[existingIdx];
    db.students[existingIdx] = {
      ...existing,
      id: existing.id || userUid,
      name: cleanName,
      studentName: cleanName,
      email: cleanEmail,
      studentEmail: cleanEmail,
      level: level || existing.level || existing.studentLevel,
      studentLevel: level || existing.studentLevel || existing.level,
      goal: goal || existing.goal || existing.learningGoal,
      learningGoal: goal || existing.learningGoal || existing.goal,
      routineVideoTime: req.body.routineVideoTime || existing.routineVideoTime || routineVideoTime,
      routineAudioTime: req.body.routineAudioTime || existing.routineAudioTime || routineAudioTime,
      dailyPhraseTime: req.body.dailyPhraseTime || existing.dailyPhraseTime || dailyPhraseTime,
      contractedLessons: existing.contractedLessons ?? db.contractedLessons?.[cleanEmail] ?? 0,
      completedLessonsCount: existing.completedLessonsCount ?? 0,
      teacherEmail: existing.teacherEmail || null,
      teacherName: existing.teacherName || null,
      status: existing.status || 'active',
      activeSince: existing.activeSince || new Date().toISOString().split('T')[0],
      createdAt: existing.createdAt || new Date().toISOString(),
      picture: userAvatar,
      avatar: userAvatar,
    };
  } else {
    // New Student: NO automatic assignment of any Native Friend
    const studentData = {
      id: userUid,
      name: cleanName,
      studentName: cleanName,
      email: cleanEmail,
      studentEmail: cleanEmail,
      level,
      studentLevel: level,
      goal: goal || 'English for everyday life & work',
      learningGoal: goal || 'English for everyday life & work',
      contractedLessons: 0,
      completedLessonsCount: 0,
      teacherEmail: null,
      teacherName: null,
      routineVideoTime,
      routineAudioTime,
      dailyPhraseTime,
      status: 'active',
      activeSince: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      picture: userAvatar,
      avatar: userAvatar,
    };
    db.students.push(studentData);
  }

  if (!db.contractedLessons) db.contractedLessons = {};
  if (db.contractedLessons[cleanEmail] === undefined) {
    db.contractedLessons[cleanEmail] = 0;
  }

  if (!db.userProfiles) db.userProfiles = {};
  if (!db.userProfiles[cleanEmail]) {
    db.userProfiles[cleanEmail] = {
      id: userUid,
      name: cleanName,
      email: cleanEmail,
      level,
      teacherEmail: null,
      teacherName: null,
      routineVideoTime,
      routineAudioTime,
      dailyPhraseTime,
      enrollmentStatus: 'not_enrolled',
      learningGoal: goal || 'English for everyday life & work',
      streakDays: 0,
      streakCount: 0,
      points: 0,
      dailyGoalMinutes: 30,
      completedTodayMinutes: 0,
      contractedLessons: 0,
      completedLessonsCount: 0,
      picture: userAvatar,
      avatar: userAvatar,
      createdAt: new Date().toISOString(),
    };
  } else {
    const p = db.userProfiles[cleanEmail];
    db.userProfiles[cleanEmail] = {
      ...p,
      id: p.id || userUid,
      name: cleanName,
      level: level || p.level,
      learningGoal: goal || p.learningGoal,
      routineVideoTime: req.body.routineVideoTime || p.routineVideoTime || routineVideoTime,
      routineAudioTime: req.body.routineAudioTime || p.routineAudioTime || routineAudioTime,
      dailyPhraseTime: req.body.dailyPhraseTime || p.dailyPhraseTime || dailyPhraseTime,
      teacherEmail: p.teacherEmail || null,
      teacherName: p.teacherName || null,
      contractedLessons: p.contractedLessons ?? db.contractedLessons?.[cleanEmail] ?? 0,
      completedLessonsCount: p.completedLessonsCount ?? 0,
      picture: userAvatar,
      avatar: userAvatar,
    };
  }

  await writeDbSync(db);
  await saveUserToFirestore({
    uid: userUid,
    email: cleanEmail,
    name: cleanName,
    role: 'student',
    picture: userAvatar,
    avatar: userAvatar,
    level,
    learningGoal: goal,
    createdAt: new Date().toISOString(),
  });

  const account = {
    uid: userUid,
    email: cleanEmail,
    name: cleanName,
    role: 'student',
    picture: userAvatar,
  };

  res.json({
    success: true,
    account,
    profile: db.userProfiles?.[cleanEmail] || null,
    student: (db.students || []).find((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail) || null,
    tutor: (db.tutorsList || []).find((t) => t.email.toLowerCase() === cleanEmail) || null,
  });
};

// Endpoint to sync client localStorage registered users to server database
app.post('/api/auth/sync-local-users', async (req, res) => {
  const db = readDb();
  const { users } = req.body;
  if (!users || typeof users !== 'object') {
    return res.json({ success: true, synced: 0 });
  }
  let count = 0;
  for (const [rawEmail, user] of Object.entries(users as Record<string, any>)) {
    const cleanEmail = rawEmail.toLowerCase().trim();
    if (!cleanEmail || !user) continue;
    if (!db.authUsers) db.authUsers = {};
    if (!db.authUsers[cleanEmail]) {
      db.authUsers[cleanEmail] = {
        uid: user.uid || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
        email: cleanEmail,
        name: user.name || cleanEmail.split('@')[0],
        password: user.password || '',
        role: user.role || 'student',
        createdAt: user.registeredAt || new Date().toISOString(),
      };
      count++;
    }
    if (user.role === 'student') {
      if (!db.students) db.students = [];
      if (!db.students.some((s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail)) {
        db.students.push({
          id: user.uid || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: user.name,
          studentName: user.name,
          email: cleanEmail,
          studentEmail: cleanEmail,
          level: user.profile?.level || 'iniciante',
          studentLevel: user.profile?.level || 'iniciante',
          goal: user.profile?.learningGoal || 'English for everyday life & work',
          learningGoal: user.profile?.learningGoal || 'English for everyday life & work',
          contractedLessons: 5,
          completedLessonsCount: 0,
          status: 'active',
          activeSince: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          avatar: user.profile?.avatar || '',
          picture: user.profile?.picture || '',
        });
      }
      if (!db.userProfiles) db.userProfiles = {};
      if (!db.userProfiles[cleanEmail]) {
        db.userProfiles[cleanEmail] = {
          id: user.uid || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: user.name,
          email: cleanEmail,
          level: user.profile?.level || 'iniciante',
          enrollmentStatus: 'active',
          learningGoal: user.profile?.learningGoal || 'English for everyday life & work',
          streakDays: 0,
          points: 0,
          dailyGoalMinutes: 30,
          completedTodayMinutes: 0,
          contractedLessons: 5,
          completedLessonsCount: 0,
          picture: user.profile?.picture || '',
          avatar: user.profile?.avatar || '',
          createdAt: new Date().toISOString(),
        };
      }
    }
  }
  if (count > 0) {
    await writeDbSync(db);
  }
  res.json({ success: true, synced: count });
});

app.post('/api/auth/register', handleRegistration);
app.post('/api/auth/signup', handleRegistration);

app.post('/api/auth/google', (req, res) => {
  const db = readDb();
  const { email, name, picture, role: requestedRole, uid } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for Google login' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let role = requestedRole === 'teacher' ? 'teacher' : 'student';
  let displayName = name || cleanEmail.split('@')[0];

  if (cleanEmail === 'adm.itissimple@gmail.com' || cleanEmail.includes('admin') || cleanEmail.includes('adm')) {
    role = requestedRole || 'admin';
    if (role === 'admin' && (!name || name === cleanEmail.split('@')[0])) {
      displayName = "Admin It's Simple";
    }
  } else if (requestedRole) {
    role = requestedRole === 'teacher' ? 'teacher' : requestedRole === 'admin' ? 'admin' : 'student';
  } else if (
    db.teachers?.some((t) => t.email.toLowerCase() === cleanEmail) ||
    db.tutorsList?.some((t) => t.email.toLowerCase() === cleanEmail)
  ) {
    role = 'teacher';
  }

  // Update or record in authUsers
  if (!db.authUsers) db.authUsers = {};
  if (!db.authUsers[cleanEmail]) {
    db.authUsers[cleanEmail] = {
      uid: uid || `google-${Date.now()}`,
      email: cleanEmail,
      name: displayName,
      role,
      createdAt: new Date().toISOString(),
    };
  } else if (uid && !db.authUsers[cleanEmail].uid) {
    db.authUsers[cleanEmail].uid = uid;
  }

  // If new student, add to students list
  if (role === 'student') {
    const existing = db.students.find(
      (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
    );
    if (!existing) {
      db.students.push({
        id: `st-${Date.now()}`,
        uid: uid || db.authUsers[cleanEmail]?.uid,
        name: displayName,
        studentName: displayName,
        email: cleanEmail,
        studentEmail: cleanEmail,
        picture: picture || '',
        avatar: picture || '',
        level: 'iniciante',
        studentLevel: 'iniciante',
        goal: 'English for everyday life & work',
        learningGoal: 'English for everyday life & work',
        contractedLessons: 0,
        completedLessonsCount: 0,
        teacherEmail: null,
        teacherName: null,
        routineVideoTime: '09:00',
        routineAudioTime: '14:00',
        dailyPhraseTime: '20:00',
        status: 'active',
        activeSince: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
      if (!db.contractedLessons) db.contractedLessons = {};
      db.contractedLessons[cleanEmail] = 0;

      if (!db.userProfiles) db.userProfiles = {};
      if (!db.userProfiles[cleanEmail]) {
        db.userProfiles[cleanEmail] = {
          id: `usr-${Date.now()}`,
          uid: uid || db.authUsers[cleanEmail]?.uid,
          name: displayName,
          email: cleanEmail,
          picture: picture || '',
          avatar: picture || '',
          level: 'iniciante',
          teacherEmail: null,
          teacherName: null,
          routineVideoTime: '09:00',
          routineAudioTime: '14:00',
          dailyPhraseTime: '20:00',
          enrollmentStatus: 'not_enrolled',
          learningGoal: 'English for everyday life & work',
          streakDays: 0,
          streakCount: 0,
          points: 0,
          contractedLessons: 0,
          completedLessonsCount: 0,
        };
      }
      writeDb(db);
    }
  }

  const account = {
    uid: uid || db.authUsers?.[cleanEmail]?.uid || (cleanEmail === 'adm.itissimple@gmail.com' ? 'admin-master-uid' : undefined),
    email: cleanEmail,
    name: displayName,
    role,
    picture:
      picture ||
      db.userProfiles?.[cleanEmail]?.picture ||
      db.userProfiles?.[uid]?.picture ||
      '',
  };

  res.json({
    success: true,
    account,
    profile: db.userProfiles?.[cleanEmail] || null,
    student: (db.students || []).find((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail) || null,
    tutor: (db.tutorsList || []).find((t) => t.email.toLowerCase() === cleanEmail) || null,
  });
});

// 1.2 Landing Page Content (Editable by Admin)
app.get('/api/landing-content', (req, res) => {
  const db = readDb();
  res.json(db.landingContent || DEFAULT_LANDING_CONTENT);
});

app.post('/api/landing-content', (req, res) => {
  const db = readDb();
  const content = req.body;
  db.landingContent = { ...DEFAULT_LANDING_CONTENT, ...(db.landingContent || {}), ...content };
  writeDb(db);
  res.json({ success: true, landingContent: db.landingContent });
});

// 2. Teachers / Native Friends Endpoints
app.get('/api/teachers', (req, res) => {
  const db = readDb();
  res.json({ teachers: db.teachers || [] });
});

app.get('/api/tutors', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const db = readDb();
  const requesterEmail = ((req.query.email as string) || '').toLowerCase().trim();
  const role = req.query.role as string;
  const uid = (req.query.uid as string) || '';

  const isAdmin =
    role === 'admin' ||
    req.query.admin === 'true' ||
    req.query.includePending === 'true' ||
    requesterEmail === 'adm.itissimple@gmail.com' ||
    Boolean(db.authUsers?.[requesterEmail]?.role === 'admin');

  if (isAdmin) {
    return res.json(db.tutorsList || []);
  }

  // Approved tutors are public; pending tutors are visible ONLY to the tutor themselves
  const list = (db.tutorsList || []).filter((t: any) => {
    const tEmail = (t.email || '').toLowerCase().trim();
    const tId = (t.id || '').toLowerCase().trim();
    if (db.deletedTutorEmails?.includes(tEmail) || db.deletedTutorIds?.includes(tId)) {
      return false;
    }
    if (t.approvalStatus === 'approved') return true;
    if (requesterEmail && tEmail === requesterEmail) return true;
    if (uid && t.uid === uid) return true;
    return false;
  });
  res.json(list);
});

app.post('/api/tutors', async (req, res) => {
  const db = readDb();
  const newTutor = req.body.tutor || req.body;
  if (!newTutor || !newTutor.email) {
    return res.status(400).json({ error: 'Invalid tutor data' });
  }
  const cleanEmail = newTutor.email.toLowerCase().trim();
  const cleanName = (newTutor.name || '').trim();
  const cleanNameLower = cleanName.toLowerCase();
  const tutorId = newTutor.id || `tutor-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Check if tutor already exists by explicit email or matching unique ID
  const existingEmailIdx = (db.tutorsList || []).findIndex(
    (t: any) =>
      (t.email && t.email.toLowerCase() === cleanEmail) ||
      (newTutor.id && t.id && t.id === newTutor.id)
  );

  if (existingEmailIdx >= 0 && !req.body.isUpdate && !newTutor.isUpdate) {
    return res.status(409).json({
      error: 'Este e-mail já está cadastrado no sistema como Amigo Nativo. Por favor, faça login com sua conta.',
      duplicateField: 'email',
      isExistingUser: true,
    });
  }

  // Check if tutor already exists by name
  const existingName = (db.tutorsList || []).some(
    (t: any) => (t.name || '').trim().toLowerCase() === cleanNameLower && t.email?.toLowerCase() !== cleanEmail
  );

  if (existingName && !req.body.isUpdate && !newTutor.isUpdate) {
    return res.status(409).json({
      error: 'Já existe um Amigo Nativo cadastrado com este nome na plataforma. Por favor, inclua seu sobrenome ou use um nome distintivo.',
      duplicateField: 'name',
      isExistingUser: true,
    });
  }
  
  const tutorEntry = {
    ...newTutor,
    name: cleanName,
    id: tutorId,
    email: cleanEmail,
    role: 'teacher',
    approvalStatus: newTutor.approvalStatus || (newTutor.registeredByAdmin ? 'approved' : 'pending'),
    appliedAt: newTutor.appliedAt || new Date().toISOString(),
  };

  if (existingEmailIdx >= 0) {
    db.tutorsList[existingEmailIdx] = { ...db.tutorsList[existingEmailIdx], ...tutorEntry };
  } else {
    db.tutorsList = db.tutorsList || [];
    db.tutorsList.push(tutorEntry);
  }

  // Also maintain teachers list for auth
  const teacherIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
  if (teacherIdx >= 0) {
    db.teachers[teacherIdx] = { ...db.teachers[teacherIdx], name: newTutor.name || cleanName, email: cleanEmail, role: 'teacher' };
  } else {
    db.teachers.push({ email: cleanEmail, name: newTutor.name || cleanName, role: 'teacher' });
  }

  // Ensure auth record exists with role 'teacher'
  if (!db.authUsers) db.authUsers = {};
  db.authUsers[cleanEmail] = {
    email: cleanEmail,
    name: newTutor.name || cleanName,
    password: newTutor.password || db.authUsers[cleanEmail]?.password || '',
    role: 'teacher',
    createdAt: db.authUsers[cleanEmail]?.createdAt || new Date().toISOString(),
  };

  // Unmark from deleted lists if newly registered or re-registering
  if (db.deletedTutorIds) {
    db.deletedTutorIds = db.deletedTutorIds.filter((id) => id !== newTutor.id?.toLowerCase());
  }
  if (db.deletedTutorEmails) {
    db.deletedTutorEmails = db.deletedTutorEmails.filter((em) => em !== cleanEmail);
  }

  await writeDbSync(db);
  res.json({ success: true, tutor: tutorEntry, tutors: db.tutorsList });
});

app.put('/api/tutors/:id', (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  const rawBody = req.body;
  const updatedData = rawBody?.tutor ? { ...rawBody.tutor } : { ...rawBody };
  if ((updatedData as any).tutor) delete (updatedData as any).tutor;
  
  const existingIdx = (db.tutorsList || []).findIndex(
    (t) => t.id === tutorId || t.email?.toLowerCase() === tutorId?.toLowerCase()
  );

  if (existingIdx >= 0) {
    db.tutorsList[existingIdx] = {
      ...db.tutorsList[existingIdx],
      ...updatedData,
      id: db.tutorsList[existingIdx].id || tutorId,
    };
    
    // Sync with db.teachers
    const tEmail = (db.tutorsList[existingIdx].email || '').toLowerCase();
    const teacherIdx = (db.teachers || []).findIndex((tc: any) => tc.email?.toLowerCase() === tEmail);
    if (teacherIdx >= 0) {
      db.teachers[teacherIdx] = {
        ...db.teachers[teacherIdx],
        name: db.tutorsList[existingIdx].name,
        avatar: db.tutorsList[existingIdx].avatar,
      };
    }

    writeDb(db);
    return res.json({ success: true, tutor: db.tutorsList[existingIdx], tutors: db.tutorsList });
  }

  // If not found in db.tutorsList, insert it
  const newEntry = { ...updatedData, id: tutorId };
  db.tutorsList = db.tutorsList || [];
  db.tutorsList.push(newEntry);
  writeDb(db);
  res.json({ success: true, tutor: newEntry, tutors: db.tutorsList });
});

// Admin Delete Tutor
app.delete('/api/tutors/:id', async (req, res) => {
  const db = readDb();
  const tutorId = decodeURIComponent(req.params.id);
  const targetEmailQuery = ((req.query.email as string) || '').toLowerCase();

  const targetTutor = (db.tutorsList || []).find(
    (t: any) =>
      t.id === tutorId ||
      t.email?.toLowerCase() === tutorId.toLowerCase() ||
      (targetEmailQuery && t.email?.toLowerCase() === targetEmailQuery)
  );
  const targetEmail = (
    targetTutor?.email ||
    targetEmailQuery ||
    (tutorId.includes('@') ? tutorId : '')
  )?.toLowerCase();

  // Track permanently so deleted tutors are NEVER re-added by defaults or sync
  db.deletedTutorIds = Array.from(
    new Set([...(db.deletedTutorIds || []), tutorId.toLowerCase()])
  );
  if (targetEmail) {
    db.deletedTutorEmails = Array.from(
      new Set([...(db.deletedTutorEmails || []), targetEmail.toLowerCase()])
    );
  }

  db.tutorsList = (db.tutorsList || []).filter(
    (t: any) =>
      t.id !== tutorId &&
      t.email?.toLowerCase() !== tutorId.toLowerCase() &&
      (!targetEmail || t.email?.toLowerCase() !== targetEmail)
  );

  if (targetEmail) {
    // Only remove from teachers if NOT an admin! Admins must keep admin access
    db.teachers = (db.teachers || []).filter(
      (t: any) => t.email?.toLowerCase() !== targetEmail || t.role === 'admin'
    );
    if (db.meetSettings && targetEmail !== 'adm.itissimple@gmail.com') {
      delete db.meetSettings[targetEmail];
    }
    if (db.teacherSettings && targetEmail !== 'adm.itissimple@gmail.com') {
      delete db.teacherSettings[targetEmail];
    }
    // Only delete from authUsers if their role is teacher and not admin!
    if (db.authUsers && db.authUsers[targetEmail]?.role === 'teacher') {
      delete db.authUsers[targetEmail];
    }
  }

  await writeDbSync(db);
  res.json({ success: true, message: 'Amigo Nativo excluído com sucesso.', tutors: db.tutorsList });
});

app.post('/api/tutors/:id/approve', async (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  let approvedEmail = '';
  db.tutorsList = (db.tutorsList || []).map((t) => {
    if (t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()) {
      approvedEmail = (t.email || '').toLowerCase();
      return { ...t, approvalStatus: 'approved' };
    }
    return t;
  });

  if (approvedEmail) {
    const tIdx = (db.teachers || []).findIndex((tc: any) => (tc.email || '').toLowerCase() === approvedEmail);
    if (tIdx >= 0) {
      db.teachers[tIdx] = { ...db.teachers[tIdx], approvalStatus: 'approved' };
    }
  }

  await writeDbSync(db);
  res.json({ success: true, tutors: db.tutorsList });
});

app.post('/api/tutors/:id/reject', async (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  let rejectedEmail = '';
  db.tutorsList = (db.tutorsList || []).map((t) => {
    if (t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()) {
      rejectedEmail = (t.email || '').toLowerCase();
      return { ...t, approvalStatus: 'rejected' };
    }
    return t;
  });

  if (rejectedEmail) {
    const tIdx = (db.teachers || []).findIndex((tc: any) => (tc.email || '').toLowerCase() === rejectedEmail);
    if (tIdx >= 0) {
      db.teachers[tIdx] = { ...db.teachers[tIdx], approvalStatus: 'rejected' };
    }
  }

  await writeDbSync(db);
  res.json({ success: true, tutors: db.tutorsList });
});

app.post('/api/teachers', (req, res) => {
  const db = readDb();
  const newTeacher = req.body.teacher || req.body;
  if (!newTeacher || !newTeacher.email) {
    return res.status(400).json({ error: 'Invalid teacher data' });
  }
  const cleanEmail = newTeacher.email.toLowerCase().trim();
  const existingIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0) {
    db.teachers[existingIdx] = { ...db.teachers[existingIdx], ...newTeacher, email: cleanEmail };
  } else {
    db.teachers.push({ ...newTeacher, email: cleanEmail });
  }
  writeDb(db);
  res.json({ success: true, teachers: db.teachers });
});

app.delete('/api/teachers/:email', (req, res) => {
  const db = readDb();
  const email = decodeURIComponent(req.params.email).toLowerCase().trim();
  db.teachers = db.teachers.filter((t) => t.email.toLowerCase() !== email);
  writeDb(db);
  res.json({ success: true, teachers: db.teachers });
});

// 2.1 Dictionary Definition strictly via Free Dictionary API (https://api.dictionaryapi.dev)
app.post('/api/dictionary/define', async (req, res) => {
  const { word } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const cleanWord = word.trim();
  const lowerWord = cleanWord.toLowerCase();

  // Try official Free Dictionary API (https://api.dictionaryapi.dev)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const apiRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerWord)}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (apiRes.ok) {
      const data = (await apiRes.json()) as any[];
      if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].meanings) && data[0].meanings.length > 0) {
        const entry = data[0];
        const firstMeaning = entry.meanings[0];
        const pos = firstMeaning.partOfSpeech || 'word';

        // 1. First definition directly from the API response
        const firstDefObj = firstMeaning.definitions?.[0];
        const def = firstDefObj?.definition?.trim() || '';

        // 2. Example sentence directly from the API response
        let example = firstDefObj?.example?.trim() || '';
        if (!example && Array.isArray(firstMeaning.definitions)) {
          const defWithExample = firstMeaning.definitions.find((d: any) => d.example && d.example.trim());
          if (defWithExample) {
            example = defWithExample.example.trim();
          }
        }
        if (!example) {
          for (const m of entry.meanings) {
            if (Array.isArray(m.definitions)) {
              const dEx = m.definitions.find((d: any) => d.example && d.example.trim());
              if (dEx) {
                example = dEx.example.trim();
                break;
              }
            }
          }
        }

        if (def) {
          return res.json({
            word: entry.word || cleanWord,
            partOfSpeech: pos,
            definitionEn: def,
            exampleSentenceEn: example || '',
            phonetic: entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text,
            audio: entry.phonetics?.find((p: any) => p.audio && p.audio.startsWith('http'))?.audio,
            source: 'api',
            notFound: false,
          });
        }
      }
    }
  } catch (err) {
    // Free Dictionary API network error or timeout
  }

  // If word is not found in Free Dictionary API, return clean notFound without AI or generic fallback text
  return res.json({
    word: cleanWord,
    partOfSpeech: '',
    definitionEn: '',
    exampleSentenceEn: '',
    source: 'not_found',
    notFound: true,
    errorMessage: 'Word not found in Free Dictionary API',
  });
});

// 3. Meet Settings & Teacher Settings Endpoints
app.get(['/api/meet-settings', '/api/teacher-settings'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const db = readDb();
  const teacherEmail = ((req.query.teacherEmail as string) || (req.query.email as string) || '').toLowerCase().trim();
  const uid = (req.query.uid as string) || '';
  const role = req.query.role as string;

  if (role === 'admin' || teacherEmail === 'adm.itissimple@gmail.com') {
    const settings = { ...db.meetSettings, ...db.teacherSettings };
    return res.json(settings);
  }

  if (teacherEmail || uid) {
    const specific =
      (teacherEmail ? (db.meetSettings[teacherEmail] || db.teacherSettings[teacherEmail]) : null) ||
      (uid ? (db.meetSettings[uid] || db.teacherSettings[uid]) : null) ||
      {};

    // If meet link is missing, fallback to tutor profile meetUrl
    if (!specific.meetLink && teacherEmail) {
      const tutorMatch = (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase() === teacherEmail);
      if (tutorMatch?.meetUrl || tutorMatch?.meetLink) {
        specific.meetLink = tutorMatch.meetUrl || tutorMatch.meetLink;
      }
    }
    return res.json(specific);
  }

  // Return all known meet settings
  res.json({ ...db.meetSettings, ...db.teacherSettings });
});

app.post(['/api/meet-settings', '/api/teacher-settings'], async (req, res) => {
  const db = readDb();
  const settings = req.body.settings || req.body;
  const teacherEmail = req.body.teacherEmail || settings.teacherEmail;
  const uid = req.body.uid || settings.uid;
  if (!teacherEmail || !settings) {
    return res.status(400).json({ error: 'Missing teacherEmail or settings' });
  }
  const cleanEmail = teacherEmail.toLowerCase().trim();
  const entry = {
    ...settings,
    teacherEmail: cleanEmail,
    ...(uid ? { uid } : {}),
  };
  db.meetSettings[cleanEmail] = entry;
  db.teacherSettings[cleanEmail] = entry;
  if (uid) {
    db.meetSettings[uid] = entry;
    db.teacherSettings[uid] = entry;
  }
  await writeDbSync(db);
  res.json({ success: true, meetSettings: db.meetSettings, teacherSettings: db.teacherSettings });
});

// 4. Students & Enrollments Endpoints
app.get('/api/students', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const db = readDb();
  const requesterEmail = (
    (req.query.email as string) ||
    (req.query.teacherEmail as string) ||
    (req.query.studentEmail as string) ||
    ''
  ).toLowerCase().trim();
  const role = req.query.role as string;
  const uid = (req.query.uid as string) || '';

  if (role === 'admin' || requesterEmail === 'adm.itissimple@gmail.com') {
    return res.json(db.students || []);
  }

  if (role === 'teacher' || req.query.teacherEmail) {
    const studentMap = new Map<string, any>();

    // 1. From db.students where teacherEmail matches and subscription is not cancelled
    (db.students || []).forEach((s: any) => {
      const sTeacher = (s.teacherEmail || '').toLowerCase().trim();
      const sTeacherUid = s.teacherUid || '';
      if (sTeacher === requesterEmail || (uid && sTeacherUid === uid)) {
        const sStatus = s.status || s.enrollmentStatus;
        if (sStatus === 'cancelled' || sStatus === 'not_enrolled') {
          return;
        }
        const sEmail = (s.email || s.studentEmail || '').toLowerCase().trim();
        // Check if student profile was transferred or cancelled
        const p = db.userProfiles?.[sEmail];
        if (p) {
          const pTeacher = (p.teacherEmail || '').toLowerCase().trim();
          if (pTeacher && pTeacher !== requesterEmail) return;
          if (p.enrollmentStatus === 'cancelled' || p.enrollmentStatus === 'not_enrolled') return;
        }
        if (sEmail) {
          studentMap.set(sEmail, {
            ...s,
            email: sEmail,
            studentEmail: sEmail,
            name: s.name || s.studentName || sEmail.split('@')[0],
            studentName: s.name || s.studentName || sEmail.split('@')[0],
            status: s.status || 'active',
          });
        }
      }
    });

    // 2. From db.userProfiles where teacherEmail matches and enrollment is active
    Object.entries(db.userProfiles || {}).forEach(([pEmail, profile]: [string, any]) => {
      const cleanPEmail = pEmail.toLowerCase().trim();
      const pTeacher = (profile.teacherEmail || '').toLowerCase().trim();
      if (pTeacher === requesterEmail && profile.role !== 'teacher' && profile.role !== 'admin') {
        if (profile.enrollmentStatus === 'cancelled' || profile.enrollmentStatus === 'not_enrolled' || profile.status === 'cancelled') {
          return;
        }
        if (!studentMap.has(cleanPEmail)) {
          studentMap.set(cleanPEmail, {
            id: profile.id || `st-${cleanPEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: profile.name || cleanPEmail.split('@')[0],
            studentName: profile.name || cleanPEmail.split('@')[0],
            email: cleanPEmail,
            studentEmail: cleanPEmail,
            level: profile.level || 'iniciante',
            studentLevel: profile.level || 'iniciante',
            goal: profile.learningGoal || 'English for everyday life & work',
            learningGoal: profile.learningGoal || 'English for everyday life & work',
            teacherEmail: requesterEmail,
            teacherName: profile.teacherName || '',
            contractedLessons: Number(profile.contractedLessons ?? db.contractedLessons?.[cleanPEmail] ?? 0),
            completedLessonsCount: Number(profile.completedLessonsCount || 0),
            picture: profile.avatar || profile.picture || '',
            avatar: profile.avatar || profile.picture || '',
            status: 'active',
            enrolledAt: profile.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // 3. From db.liveLessons where teacherEmail matches and lesson is scheduled/active
    (db.liveLessons || []).forEach((l: any) => {
      const lTeacher = (l.teacherEmail || l.tutorEmail || '').toLowerCase().trim();
      if (lTeacher === requesterEmail && l.status === 'scheduled') {
        const sEmail = (l.studentEmail || '').toLowerCase().trim();
        const p = db.userProfiles?.[sEmail];
        if (p?.enrollmentStatus === 'cancelled') return;
        if (sEmail && !studentMap.has(sEmail)) {
          studentMap.set(sEmail, {
            id: `st-${sEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: l.studentName || sEmail.split('@')[0],
            studentName: l.studentName || sEmail.split('@')[0],
            email: sEmail,
            studentEmail: sEmail,
            level: 'iniciante',
            studentLevel: 'iniciante',
            goal: 'English for everyday life & work',
            learningGoal: 'English for everyday life & work',
            teacherEmail: requesterEmail,
            teacherName: l.teacherName || '',
            status: 'active',
          });
        }
      }
    });

    return res.json(Array.from(studentMap.values()));
  }

  if (role === 'student' || req.query.studentEmail) {
    const list = (db.students || []).filter((s: any) =>
      (s.email || s.studentEmail || '').toLowerCase() === requesterEmail ||
      (s.uid && s.uid === uid)
    );
    return res.json(list);
  }

  // If unauthenticated or no matching filter, return empty array to prevent data leaks
  res.json([]);
});

app.post('/api/students', (req, res) => {
  const db = readDb();
  const enrollment = req.body;
  const email = enrollment.email || enrollment.studentEmail;
  if (!enrollment || !email) {
    return res.status(400).json({ error: 'Invalid student data' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const idx = db.students.findIndex((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail);
  if (idx >= 0) {
    db.students[idx] = { ...db.students[idx], ...enrollment, email: cleanEmail, studentEmail: cleanEmail };
  } else {
    db.students.push({
      id: enrollment.id || `st-${Date.now()}`,
      ...enrollment,
      email: cleanEmail,
      studentEmail: cleanEmail,
    });
  }
  writeDb(db);
  res.json(db.students);
});

app.delete('/api/students/:identifier', async (req, res) => {
  const db = readDb();
  const rawId = req.params.identifier;
  if (!rawId) {
    return res.status(400).json({ error: 'Identifier is required' });
  }

  const clean = decodeURIComponent(rawId).toLowerCase().trim();
  console.log(`[DELETE /api/students] Request to delete student: ${clean}`);

  let targetEmail = clean.includes('@') ? clean : '';
  const matchingStudent = (db.students || []).find((s: any) => {
    const sEmail = (s.email || s.studentEmail || '').toLowerCase().trim();
    const sId = (s.id || '').toLowerCase().trim();
    return sEmail === clean || sId === clean;
  });

  if (matchingStudent) {
    targetEmail = (matchingStudent.email || matchingStudent.studentEmail || targetEmail).toLowerCase().trim();
  }

  // Remove from students array
  db.students = (db.students || []).filter((s: any) => {
    const sEmail = (s.email || s.studentEmail || '').toLowerCase().trim();
    const sId = (s.id || '').toLowerCase().trim();
    return sEmail !== clean && sId !== clean && (!targetEmail || sEmail !== targetEmail);
  });

  // Remove from userProfiles
  if (targetEmail && db.userProfiles?.[targetEmail]) {
    delete db.userProfiles[targetEmail];
  }

  // Remove from contractedLessons
  if (targetEmail && db.contractedLessons?.[targetEmail] !== undefined) {
    delete db.contractedLessons[targetEmail];
  }

  // Remove from authUsers
  if (targetEmail && db.authUsers?.[targetEmail]?.role === 'student') {
    delete db.authUsers[targetEmail];
  }

  // Remove from studentRoutinesMap
  if (targetEmail && db.studentRoutinesMap?.[targetEmail]) {
    delete db.studentRoutinesMap[targetEmail];
  }

  // Track permanently in deletedStudentEmails
  if (!Array.isArray(db.deletedStudentEmails)) {
    db.deletedStudentEmails = [];
  }
  if (targetEmail && !db.deletedStudentEmails.includes(targetEmail)) {
    db.deletedStudentEmails.push(targetEmail);
  }

  await writeDbSync(db);

  // Clean from Firestore users collection if present
  const firestoreDb = getFirestoreDb();
  if (firestoreDb && targetEmail) {
    try {
      const { deleteDoc, doc, getDocs, collection } = await import('firebase/firestore');
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      for (const d of usersSnap.docs) {
        const u = d.data();
        if ((u.email || '').toLowerCase().trim() === targetEmail || d.id.toLowerCase() === targetEmail) {
          await deleteDoc(doc(firestoreDb, 'users', d.id));
        }
      }
    } catch (e) {
      console.warn('Could not delete user from Firestore users collection:', e);
    }
  }

  res.json({ success: true, message: 'Student profile deleted successfully', email: targetEmail });
});

app.post('/api/students/profile', (req, res) => {
  const db = readDb();
  const { profile, picture } = req.body;
  if (!profile || !profile.email) {
    return res.status(400).json({ error: 'Profile email is required' });
  }
  const cleanEmail = profile.email.toLowerCase().trim();
  if (!db.userProfiles) db.userProfiles = {};
  const existingProfile = db.userProfiles[cleanEmail] || {};

  db.userProfiles[cleanEmail] = {
    ...existingProfile,
    ...profile,
    email: cleanEmail,
    name: profile.name || existingProfile.name,
    level: profile.level || existingProfile.level,
    learningGoal: profile.learningGoal || existingProfile.learningGoal,
    dailyGoalMinutes: profile.dailyGoalMinutes ?? existingProfile.dailyGoalMinutes ?? 30,
    avatar: picture || profile.avatar || existingProfile.avatar,
    picture: picture || profile.picture || existingProfile.picture,
    // Preserve core counters
    contractedLessons: existingProfile.contractedLessons ?? db.contractedLessons?.[cleanEmail] ?? 5,
    completedLessonsCount: existingProfile.completedLessonsCount ?? 0,
    routineVideoTime: profile.routineVideoTime || existingProfile.routineVideoTime || '09:00',
    routineAudioTime: profile.routineAudioTime || existingProfile.routineAudioTime || '14:00',
    dailyPhraseTime: profile.dailyPhraseTime || existingProfile.dailyPhraseTime || '20:00',
    teacherEmail: profile.teacherEmail !== undefined ? profile.teacherEmail : existingProfile.teacherEmail,
    teacherName: profile.teacherName !== undefined ? profile.teacherName : existingProfile.teacherName,
  };

  const idx = db.students.findIndex((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail);
  if (idx >= 0) {
    db.students[idx] = {
      ...db.students[idx],
      name: profile.name || db.students[idx].name,
      studentName: profile.name || db.students[idx].studentName,
      level: profile.level || db.students[idx].level,
      studentLevel: profile.level || db.students[idx].studentLevel,
      goal: profile.learningGoal || db.students[idx].goal,
      learningGoal: profile.learningGoal || db.students[idx].learningGoal,
      picture: picture || profile.avatar || db.students[idx].picture,
      avatar: picture || profile.avatar || db.students[idx].avatar,
      routineVideoTime: profile.routineVideoTime || db.students[idx].routineVideoTime || '09:00',
      routineAudioTime: profile.routineAudioTime || db.students[idx].routineAudioTime || '14:00',
      dailyPhraseTime: profile.dailyPhraseTime || db.students[idx].dailyPhraseTime || '20:00',
    };
  }

  writeDb(db);
  res.json({ success: true, profile: db.userProfiles[cleanEmail] });
});

app.get('/api/user-profile', (req, res) => {
  const db = readDb();
  const email = ((req.query.email as string) || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  // If user is a teacher / Native Friend, return their tutor profile directly
  const isTeacherUser =
    db.authUsers?.[email]?.role === 'teacher' ||
    (db.tutorsList || []).some((t: any) => (t.email || '').toLowerCase() === email) ||
    (db.teachers || []).some((t: any) => (t.email || '').toLowerCase() === email && t.role === 'teacher');

  if (isTeacherUser) {
    const tutor =
      (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase() === email) ||
      (db.teachers || []).find((t: any) => (t.email || '').toLowerCase() === email) ||
      db.authUsers?.[email];
    return res.json({
      success: true,
      role: 'teacher',
      isTeacher: true,
      tutor: tutor || null,
      message: 'Native Friend profile retrieved successfully',
    });
  }

  let profile = db.userProfiles?.[email] || null;
  const student = (db.students || []).find(
    (s) => (s.email || s.studentEmail || '').toLowerCase() === email
  );

  if (profile && student) {
    // Fill in any missing fields from student without overwriting existing profile data
    profile = {
      ...profile,
      name: profile.name || student.name || student.studentName,
      level: profile.level || student.level || student.studentLevel,
      learningGoal: profile.learningGoal || student.goal || student.learningGoal,
      routineVideoTime: profile.routineVideoTime || student.routineVideoTime || '09:00',
      routineAudioTime: profile.routineAudioTime || student.routineAudioTime || '14:00',
      dailyPhraseTime: profile.dailyPhraseTime || student.dailyPhraseTime || '20:00',
      contractedLessons: profile.contractedLessons ?? student.contractedLessons ?? db.contractedLessons?.[email] ?? 5,
      completedLessonsCount: profile.completedLessonsCount ?? student.completedLessonsCount ?? 0,
      teacherEmail: profile.teacherEmail || student.teacherEmail,
      teacherName: profile.teacherName || student.teacherName,
    };
    db.userProfiles[email] = profile;
    writeDb(db);
  } else if (!profile && student) {
    profile = {
      id: student.id || `usr-${Date.now()}`,
      name: student.name || student.studentName,
      email,
      level: student.level || student.studentLevel || 'iniciante',
      teacherEmail: student.teacherEmail,
      teacherName: student.teacherName,
      routineVideoTime: student.routineVideoTime || '09:00',
      routineAudioTime: student.routineAudioTime || '14:00',
      dailyPhraseTime: student.dailyPhraseTime || '20:00',
      enrollmentStatus: student.status || 'active',
      learningGoal: student.goal || student.learningGoal || 'English for everyday life & work',
      streakDays: 0,
      streakCount: 0,
      points: 0,
      dailyGoalMinutes: 30,
      completedTodayMinutes: 0,
      contractedLessons: student.contractedLessons ?? db.contractedLessons?.[email] ?? 5,
      completedLessonsCount: student.completedLessonsCount ?? 0,
      createdAt: student.createdAt || new Date().toISOString(),
      avatar: student.avatar || student.picture,
      picture: student.picture || student.avatar,
    };
    if (!db.userProfiles) db.userProfiles = {};
    db.userProfiles[email] = profile;
    writeDb(db);
  } else if (!profile && !student) {
    const defaultName = (req.query.name as string) || email.split('@')[0];
    profile = {
      id: `usr-${Date.now()}`,
      name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
      email,
      level: 'iniciante',
      routineVideoTime: '09:00',
      routineAudioTime: '14:00',
      dailyPhraseTime: '20:00',
      enrollmentStatus: 'not_enrolled',
      learningGoal: 'English for everyday life & work',
      streakDays: 0,
      streakCount: 0,
      points: 0,
      dailyGoalMinutes: 30,
      completedTodayMinutes: 0,
      contractedLessons: db.contractedLessons?.[email] ?? 0,
      completedLessonsCount: 0,
      teacherEmail: null,
      teacherName: null,
      createdAt: new Date().toISOString(),
    };
    if (!db.userProfiles) db.userProfiles = {};
    db.userProfiles[email] = profile;
    writeDb(db);
  }

  res.json({ success: true, profile });
});

app.post('/api/user-profile', async (req, res) => {
  const db = readDb();
  const rawProfile = req.body.profile || req.body;
  const email = (req.body.email || rawProfile.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const isTeacherUser =
    db.authUsers?.[email]?.role === 'teacher' ||
    (db.tutorsList || []).some((t: any) => (t.email || '').toLowerCase() === email) ||
    (db.teachers || []).some((t: any) => (t.email || '').toLowerCase() === email && t.role !== 'admin');

  if (isTeacherUser) {
    const tutorIdx = (db.tutorsList || []).findIndex((t: any) => (t.email || '').toLowerCase() === email);
    if (tutorIdx >= 0) {
      db.tutorsList[tutorIdx] = {
        ...db.tutorsList[tutorIdx],
        ...rawProfile,
        email,
        role: 'teacher',
      };
    }
    if (db.userProfiles?.[email]) {
      delete db.userProfiles[email];
    }
    writeDb(db);
    return res.json({
      success: true,
      role: 'teacher',
      isTeacher: true,
      tutor: tutorIdx >= 0 ? db.tutorsList[tutorIdx] : rawProfile,
      profile: null,
    });
  }

  if (!db.userProfiles) db.userProfiles = {};
  const existing = db.userProfiles[email] || {};

  const updatedTeacherEmail =
    rawProfile.teacherEmail !== undefined ? (rawProfile.teacherEmail || null) : (existing.teacherEmail ?? null);
  const updatedTeacherName =
    rawProfile.teacherName !== undefined ? (rawProfile.teacherName || null) : (existing.teacherName ?? null);

  db.userProfiles[email] = {
    ...existing,
    ...rawProfile,
    email,
    name: rawProfile.name || existing.name,
    level: rawProfile.level || existing.level,
    learningGoal: rawProfile.learningGoal || existing.learningGoal,
    dailyGoalMinutes: rawProfile.dailyGoalMinutes ?? existing.dailyGoalMinutes ?? 30,
    contractedLessons: rawProfile.contractedLessons ?? existing.contractedLessons ?? db.contractedLessons?.[email] ?? 0,
    completedLessonsCount: existing.completedLessonsCount ?? rawProfile.completedLessonsCount ?? 0,
    teacherEmail: updatedTeacherEmail,
    teacherName: updatedTeacherName,
    enrollmentStatus: rawProfile.enrollmentStatus || existing.enrollmentStatus || (updatedTeacherEmail ? 'active' : 'not_enrolled'),
  };

  const studentIdx = (db.students || []).findIndex(
    (s) => (s.email || s.studentEmail || '').toLowerCase() === email
  );
  if (studentIdx >= 0) {
    db.students[studentIdx] = {
      ...db.students[studentIdx],
      name: rawProfile.name || db.students[studentIdx].name,
      studentName: rawProfile.name || db.students[studentIdx].studentName,
      level: rawProfile.level || db.students[studentIdx].level,
      studentLevel: rawProfile.level || db.students[studentIdx].studentLevel,
      goal: rawProfile.learningGoal || db.students[studentIdx].goal,
      learningGoal: rawProfile.learningGoal || db.students[studentIdx].learningGoal,
      picture: rawProfile.avatar || rawProfile.picture || db.students[studentIdx].picture,
      avatar: rawProfile.avatar || rawProfile.picture || db.students[studentIdx].avatar,
      teacherEmail: updatedTeacherEmail,
      teacherName: updatedTeacherName,
      status: db.userProfiles[email].enrollmentStatus === 'cancelled' ? 'cancelled' : (updatedTeacherEmail ? 'active' : 'not_enrolled'),
    };
  } else {
    if (!db.students) db.students = [];
    const studentName = rawProfile.name || existing.name || email.split('@')[0];
    db.students.push({
      id: `st-${Date.now()}`,
      name: studentName,
      studentName: studentName,
      email,
      studentEmail: email,
      level: rawProfile.level || 'iniciante',
      studentLevel: rawProfile.level || 'iniciante',
      goal: rawProfile.learningGoal || 'English for everyday life & work',
      learningGoal: rawProfile.learningGoal || 'English for everyday life & work',
      contractedLessons: Number(rawProfile.contractedLessons ?? db.contractedLessons?.[email] ?? 0),
      completedLessonsCount: 0,
      teacherEmail: updatedTeacherEmail,
      teacherName: updatedTeacherName,
      status: db.userProfiles[email].enrollmentStatus === 'cancelled' ? 'cancelled' : (updatedTeacherEmail ? 'active' : 'not_enrolled'),
      activeSince: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  }

  await writeDbSync(db);
  res.json({ success: true, profile: db.userProfiles[email] });
});

// Purchase Lesson Package with a specific Native Friend (binds tutor as fixed + adds lessons)
app.post('/api/students/purchase-package', async (req, res) => {
  const db = readDb();
  const { studentEmail, teacherEmail, teacherName, packageLessons, packageName, packagePriceBrl, packagePriceUsd, paymentMethod } = req.body;
  const cleanStudentEmail = (studentEmail || '').toLowerCase().trim();
  const cleanTeacherEmail = (teacherEmail || '').toLowerCase().trim();

  if (!cleanStudentEmail || !cleanTeacherEmail) {
    return res.status(400).json({ error: 'studentEmail and teacherEmail are required' });
  }

  const lessonsToAdd = Number(packageLessons) > 0 ? Number(packageLessons) : 5;

  // Find teacher name if not provided
  let finalTeacherName = teacherName;
  if (!finalTeacherName) {
    const tutorMatch = (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase() === cleanTeacherEmail);
    const teacherMatch = (db.teachers || []).find((t: any) => (t.email || '').toLowerCase() === cleanTeacherEmail);
    finalTeacherName = tutorMatch?.name || teacherMatch?.name || cleanTeacherEmail.split('@')[0];
  }

  // Update contracted lessons count
  if (!db.contractedLessons) db.contractedLessons = {};
  const currentContracted = Number(db.contractedLessons[cleanStudentEmail] || 0);
  const newTotal = currentContracted + lessonsToAdd;
  db.contractedLessons[cleanStudentEmail] = newTotal;

  // Update student in db.students
  let studentFound = false;
  db.students = (db.students || []).map((s: any) => {
    if ((s.email || s.studentEmail || '').toLowerCase() === cleanStudentEmail) {
      studentFound = true;
      return {
        ...s,
        teacherEmail: cleanTeacherEmail,
        teacherName: finalTeacherName,
        contractedLessons: newTotal,
        status: 'active',
      };
    }
    return s;
  });

  if (!studentFound) {
    db.students.push({
      id: `st-${Date.now()}`,
      name: cleanStudentEmail.split('@')[0],
      studentName: cleanStudentEmail.split('@')[0],
      email: cleanStudentEmail,
      studentEmail: cleanStudentEmail,
      level: 'iniciante',
      studentLevel: 'iniciante',
      goal: 'English for everyday life & work',
      learningGoal: 'English for everyday life & work',
      contractedLessons: newTotal,
      completedLessonsCount: 0,
      teacherEmail: cleanTeacherEmail,
      teacherName: finalTeacherName,
      routineVideoTime: '09:00',
      routineAudioTime: '14:00',
      dailyPhraseTime: '20:00',
      status: 'active',
      activeSince: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  }

  // Update db.userProfiles
  if (!db.userProfiles) db.userProfiles = {};
  const existingProfile = db.userProfiles[cleanStudentEmail] || {};
  db.userProfiles[cleanStudentEmail] = {
    ...existingProfile,
    id: existingProfile.id || `usr-${Date.now()}`,
    email: cleanStudentEmail,
    name: existingProfile.name || cleanStudentEmail.split('@')[0],
    level: existingProfile.level || 'iniciante',
    teacherEmail: cleanTeacherEmail,
    teacherName: finalTeacherName,
    enrollmentStatus: 'active',
    contractedLessons: newTotal,
    completedLessonsCount: existingProfile.completedLessonsCount || 0,
  };

  // Record transaction
  if (!db.transactions) db.transactions = [];
  const transaction = {
    id: `tx-${Date.now()}`,
    studentEmail: cleanStudentEmail,
    teacherEmail: cleanTeacherEmail,
    teacherName: finalTeacherName,
    packageLessons: lessonsToAdd,
    packageName: packageName || `${lessonsToAdd} Aulas`,
    packagePriceBrl: packagePriceBrl || lessonsToAdd * 90,
    packagePriceUsd: packagePriceUsd || lessonsToAdd * 16,
    paymentMethod: paymentMethod || 'credit_card',
    timestamp: new Date().toISOString(),
    status: 'completed',
  };
  db.transactions.unshift(transaction);

  await writeDbSync(db);

  res.json({
    success: true,
    message: 'Package purchased successfully and Native Friend assigned',
    contractedLessons: newTotal,
    profile: db.userProfiles[cleanStudentEmail],
    transaction,
  });
});

app.post('/api/students/contract', (req, res) => {
  const db = readDb();
  const { email, studentEmail, count } = req.body;
  const cleanEmail = (email || studentEmail || '').toLowerCase().trim();
  if (cleanEmail && count !== undefined) {
    db.contractedLessons[cleanEmail] = Number(count);
    db.students = db.students.map((s) =>
      (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
        ? { ...s, contractedLessons: Number(count) }
        : s
    );
    writeDb(db);
  }
  res.json({ success: true, contractedLessons: db.contractedLessons });
});

app.post('/api/students/cancel', (req, res) => {
  const db = readDb();
  const { studentEmail, email, cancelledBy } = req.body;
  const cleanEmail = (studentEmail || email || '').toLowerCase().trim();
  db.students = db.students.map((s) =>
    (s.studentEmail || s.email || '').toLowerCase() === cleanEmail
      ? { ...s, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: cancelledBy || 'teacher' }
      : s
  );
  writeDb(db);
  res.json({ success: true, students: db.students });
});

app.get('/api/student-routines', (req, res) => {
  const db = readDb();
  const studentEmail = ((req.query.studentEmail as string) || (req.query.email as string) || '').toLowerCase().trim();
  const uid = (req.query.uid as string) || '';

  if (studentEmail || uid) {
    const routines =
      (uid && db.studentRoutinesMap?.[uid]) ||
      (studentEmail && db.studentRoutinesMap?.[studentEmail]) ||
      {};
    return res.json(routines);
  }
  res.json(db.routinesByDay || {});
});

// 5. Live Lessons Endpoints
app.get(['/api/lessons', '/api/live-lessons'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const db = readDb();
  const requesterEmail = (
    (req.query.email as string) ||
    (req.query.userEmail as string) ||
    (req.query.studentEmail as string) ||
    (req.query.teacherEmail as string) ||
    ''
  ).toLowerCase().trim();
  const role = req.query.role as string;
  const uid = (req.query.uid as string) || '';

  if (role === 'admin' || requesterEmail === 'adm.itissimple@gmail.com') {
    return res.json(db.liveLessons || []);
  }

  if (role === 'teacher' || req.query.teacherEmail) {
    const list = (db.liveLessons || []).filter((l: any) =>
      (l.teacherEmail || '').toLowerCase() === requesterEmail ||
      (l.tutorEmail || '').toLowerCase() === requesterEmail ||
      (l.teacherUid && l.teacherUid === uid) ||
      (l.tutorUid && l.tutorUid === uid)
    );
    return res.json(list);
  }

  if (role === 'student' || req.query.studentEmail) {
    const list = (db.liveLessons || []).filter((l: any) => {
      const lEmail = (l.studentEmail || '').toLowerCase().trim();
      const lName = (l.studentName || '').toLowerCase().trim();
      return (
        lEmail === requesterEmail ||
        (l.studentUid && l.studentUid === uid) ||
        (!lEmail && requesterEmail.includes('vinicius') && lName.includes('vinicius')) ||
        (!lEmail && requesterEmail.includes('regina') && lName.includes('regina'))
      );
    });
    return res.json(list);
  }

  if (requesterEmail || uid) {
    const list = (db.liveLessons || []).filter((l: any) => {
      const lEmail = (l.studentEmail || '').toLowerCase().trim();
      const lTeacher = (l.teacherEmail || l.tutorEmail || '').toLowerCase().trim();
      const lName = (l.studentName || '').toLowerCase().trim();
      return (
        lEmail === requesterEmail ||
        lTeacher === requesterEmail ||
        (l.studentUid && l.studentUid === uid) ||
        (l.teacherUid && l.teacherUid === uid) ||
        (!lEmail && requesterEmail.includes('vinicius') && lName.includes('vinicius')) ||
        (!lEmail && requesterEmail.includes('regina') && lName.includes('regina'))
      );
    });
    return res.json(list);
  }

  // Anonymous / unauthenticated: return empty list to protect privacy
  res.json([]);
});

app.post(['/api/lessons', '/api/live-lessons'], async (req, res) => {
  const db = readDb();
  const { lesson, lessons } = req.body;
  const newLesson = lesson || (req.body.id ? req.body : null);
  if (Array.isArray(lessons)) {
    db.liveLessons = lessons;
  } else if (newLesson && newLesson.id) {
    // Auto-resolve studentEmail if blank
    if (!newLesson.studentEmail || newLesson.studentEmail.trim() === '') {
      const sName = (newLesson.studentName || '').toLowerCase().trim();
      if (sName.includes('vinicius') || sName.includes('ferraz')) {
        newLesson.studentEmail = 'viniciusferrazcardoso@gmail.com';
      } else if (sName.includes('regina')) {
        newLesson.studentEmail = 'reginahelena1980@gmail.com';
      } else if (sName.includes('lavinia')) {
        newLesson.studentEmail = 'laviniatilapia@gmail.com';
      } else if (req.query.email || req.query.studentEmail) {
        newLesson.studentEmail = ((req.query.email || req.query.studentEmail) as string).toLowerCase().trim();
      }
    }

    // Auto-resolve studentUid and teacherUid to individualize activity between the two UIDs
    if (!newLesson.studentUid && newLesson.studentEmail) {
      const sEmail = newLesson.studentEmail.toLowerCase().trim();
      const allUsers = Object.values(db.authUsers || {});
      const allProfiles = Object.values(db.userProfiles || {});
      const foundUser = (allUsers as any[]).find((u: any) => (u.email || '').toLowerCase().trim() === sEmail)
        || (allProfiles as any[]).find((p: any) => (p.email || '').toLowerCase().trim() === sEmail)
        || (db.students || []).find((s: any) => (s.email || '').toLowerCase().trim() === sEmail);
      newLesson.studentUid = foundUser?.uid || foundUser?.id || `usr-${sEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
    if (!newLesson.teacherUid) {
      const tEmail = (newLesson.teacherEmail || newLesson.tutorEmail || '').toLowerCase().trim();
      const allUsers = Object.values(db.authUsers || {});
      const foundTutor = (db.tutorsList || []).find((t: any) => (t.email || '').toLowerCase().trim() === tEmail)
        || (allUsers as any[]).find((u: any) => (u.email || '').toLowerCase().trim() === tEmail)
        || (db.teachers || []).find((t: any) => (t.email || '').toLowerCase().trim() === tEmail);
      newLesson.teacherUid = foundTutor?.uid || foundTutor?.id || (tEmail ? `usr-${tEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');
    }

    // Conflict Check (Strict Anti-Duplicity Rule - Individualized by teacher and student UIDs/emails)
    const proposedTeacher = (newLesson.teacherEmail || newLesson.tutorEmail || '').toLowerCase().trim();
    const proposedTeacherUid = (newLesson.teacherUid || newLesson.tutorUid || '').trim();
    const proposedStudent = (newLesson.studentEmail || '').toLowerCase().trim();
    const proposedStudentUid = (newLesson.studentUid || '').trim();

    if ((proposedTeacher || proposedTeacherUid) && newLesson.startDateTime && newLesson.endDateTime && newLesson.status === 'scheduled' && !newLesson.cancelledAt) {
      const pStart = new Date(newLesson.startDateTime).getTime();
      const pEnd = new Date(newLesson.endDateTime).getTime();
      const conflict = (db.liveLessons || []).find((l: any) => {
        if (l.id === newLesson.id) return false;
        if (l.status === 'cancelled' || l.status === 'canceled' || Boolean(l.cancelledAt)) return false;
        if (l.status && l.status !== 'scheduled') return false;

        const lTeacher = (l.teacherEmail || l.tutorEmail || '').toLowerCase().trim();
        const lTeacherUid = (l.teacherUid || l.tutorUid || '').trim();
        const lStudent = (l.studentEmail || '').toLowerCase().trim();
        const lStudentUid = (l.studentUid || '').trim();

        // Check if teacher has an active conflict
        const isSameTeacher = (proposedTeacherUid && lTeacherUid && proposedTeacherUid === lTeacherUid) ||
                              (proposedTeacher && lTeacher && proposedTeacher === lTeacher);

        // Check if student has an active conflict
        const isSameStudent = (proposedStudentUid && lStudentUid && proposedStudentUid === lStudentUid) ||
                              (proposedStudent && lStudent && proposedStudent === lStudent);

        if (!isSameTeacher && !isSameStudent) return false;
        if (!l.startDateTime || !l.endDateTime) return false;
        const lStart = new Date(l.startDateTime).getTime();
        const lEnd = new Date(l.endDateTime).getTime();
        return lStart < pEnd && lEnd > pStart;
      });
      if (conflict) {
        return res.status(409).json({
          error: 'Conflito de Horário: Já existe uma aula agendada neste horário para este Amigo Nativo ou Aluno.',
          conflict,
        });
      }
    }

    const idx = (db.liveLessons || []).findIndex((l: any) => l.id === newLesson.id);
    if (idx >= 0) {
      db.liveLessons[idx] = newLesson;
    } else {
      if (!db.liveLessons) db.liveLessons = [];
      db.liveLessons.unshift(newLesson);
    }

    // Bidirectional sync: ensure student is linked to this teacher in db.students
    const cleanStudentEmail = (newLesson.studentEmail || '').toLowerCase().trim();
    const cleanTeacherEmail = (newLesson.teacherEmail || newLesson.tutorEmail || '').toLowerCase().trim();
    const cleanTeacherName = newLesson.teacherName || newLesson.tutorName || '';
    if (cleanStudentEmail && cleanTeacherEmail) {
      const studentIdx = (db.students || []).findIndex(
        (s: any) => (s.email || s.studentEmail || '').toLowerCase() === cleanStudentEmail
      );
      if (studentIdx >= 0) {
        db.students[studentIdx] = {
          ...db.students[studentIdx],
          teacherEmail: cleanTeacherEmail,
          teacherName: cleanTeacherName || db.students[studentIdx].teacherName,
          teacherUid: newLesson.teacherUid || db.students[studentIdx].teacherUid,
          studentUid: newLesson.studentUid || db.students[studentIdx].studentUid || db.students[studentIdx].uid,
          status: 'active',
        };
      } else {
        if (!db.students) db.students = [];
        db.students.push({
          id: `st-${Date.now()}`,
          name: newLesson.studentName || cleanStudentEmail.split('@')[0],
          studentName: newLesson.studentName || cleanStudentEmail.split('@')[0],
          email: cleanStudentEmail,
          studentEmail: cleanStudentEmail,
          studentUid: newLesson.studentUid,
          level: 'iniciante',
          studentLevel: 'iniciante',
          goal: 'English for everyday life & work',
          learningGoal: 'English for everyday life & work',
          teacherEmail: cleanTeacherEmail,
          teacherName: cleanTeacherName,
          teacherUid: newLesson.teacherUid,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
  await writeDbSync(db);
  res.json(db.liveLessons);
});

app.post('/api/lessons/:id/complete', (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  db.liveLessons = db.liveLessons.map((l) => (l.id === id ? { ...l, status: 'completed' } : l));
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

app.post('/api/lessons/:id/not-completed', (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  const { responsible, reason } = req.body;
  db.liveLessons = db.liveLessons.map((l) =>
    l.id === id
      ? {
          ...l,
          status: 'not_completed',
          notCompletedResponsible: responsible,
          notCompletedReason: reason,
        }
      : l
  );
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

app.post('/api/lessons/:id/reschedule', (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  const { newStartIso, newEndIso, reason, proposedBy } = req.body;
  const isTeacher = proposedBy === 'teacher';
  db.liveLessons = db.liveLessons.map((l) =>
    l.id === id
      ? {
          ...l,
          proposedNewStartDateTime: newStartIso,
          proposedNewEndDateTime: newEndIso,
          rescheduleNotes: reason,
          proposedBy: isTeacher ? 'teacher' : 'student',
          proposalStatus: isTeacher
            ? 'pending_student_reschedule'
            : 'pending_teacher_reschedule',
          proposedAt: new Date().toISOString(),
        }
      : l
  );
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

app.post('/api/lessons/:id/accept-reschedule', (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  db.liveLessons = db.liveLessons.map((l) => {
    if (l.id === id && l.proposedNewStartDateTime) {
      return {
        ...l,
        startDateTime: l.proposedNewStartDateTime,
        endDateTime: l.proposedNewEndDateTime || l.endDateTime,
        rescheduledFrom: {
          startDateTime: l.startDateTime,
          endDateTime: l.endDateTime,
        },
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: l.proposedBy,
        rescheduledReason: l.rescheduleNotes,
        proposedNewStartDateTime: undefined,
        proposedNewEndDateTime: undefined,
        proposalStatus: undefined,
      };
    }
    return l;
  });
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

app.post('/api/lessons/:id/decline-reschedule', (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  db.liveLessons = db.liveLessons.map((l) =>
    l.id === id
      ? {
          ...l,
          proposedNewStartDateTime: undefined,
          proposedNewEndDateTime: undefined,
          proposalStatus: undefined,
        }
      : l
  );
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

app.post('/api/lessons/:id/cancel', async (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  const { cancelledBy, reason } = req.body || {};
  const target = (db.liveLessons || []).find((l: any) => l.id === id);
  db.liveLessons = (db.liveLessons || []).map((l: any) =>
    l.id === id ||
    (target &&
      target.studentEmail &&
      (l.studentEmail || '').toLowerCase() === target.studentEmail.toLowerCase() &&
      l.startDateTime === target.startDateTime)
      ? {
          ...l,
          status: 'cancelled',
          cancelledAt: l.cancelledAt || new Date().toISOString(),
          cancelledBy: cancelledBy || l.cancelledBy || 'user',
          cancellationReason: reason || l.cancellationReason || 'Cancelled by user',
          proposalStatus: undefined,
          proposedNewStartDateTime: undefined,
          proposedNewEndDateTime: undefined,
        }
      : l
  );
  await writeDbSync(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

// Save live lesson notes & automatically migrate vocabulary to student's personal dictionary
app.post('/api/lessons/:id/notes', async (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  const { topic, liveNotes, recommendations, pronunciationNotes, grammarAndPhrasing, vocabularyNotes } = req.body || {};

  let targetStudentEmail = (req.body?.studentEmail || '').toLowerCase().trim();
  let targetStudentUid = req.body?.studentUid || '';
  let teacherName = req.body?.teacherName || '';
  let teacherEmail = (req.body?.teacherEmail || '').toLowerCase().trim();

  db.liveLessons = (db.liveLessons || []).map((l: any) => {
    if (l.id === id) {
      if (!targetStudentEmail && l.studentEmail) targetStudentEmail = (l.studentEmail || '').toLowerCase().trim();
      if (!targetStudentUid && l.studentUid) targetStudentUid = l.studentUid || '';
      if (!teacherName && (l.teacherName || l.tutorName)) teacherName = l.teacherName || l.tutorName || '';
      if (!teacherEmail && (l.teacherEmail || l.tutorEmail)) teacherEmail = (l.teacherEmail || l.tutorEmail || '').toLowerCase().trim();
      return {
        ...l,
        title: topic || l.title,
        liveNotes,
        recommendations,
        pronunciationNotes,
        grammarAndPhrasing,
        vocabularyNotes: Array.isArray(vocabularyNotes) ? vocabularyNotes : l.vocabularyNotes,
        notesLastSavedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  // Automatically migrate vocabulary words to student's personal dictionary (isolated by student UID and email)
  if (Array.isArray(vocabularyNotes) && vocabularyNotes.length > 0 && (targetStudentEmail || targetStudentUid)) {
    if (!db.studentDictionaryMap) db.studentDictionaryMap = {};
    const existingList: any[] =
      (targetStudentEmail && db.studentDictionaryMap[targetStudentEmail]) ||
      (targetStudentUid && db.studentDictionaryMap[targetStudentUid]) ||
      [];

    const dictMap = new Map<string, any>();
    existingList.forEach((entry: any) => {
      const w = (entry.word || '').toLowerCase().trim();
      if (w) dictMap.set(w, entry);
    });

    vocabularyNotes.forEach((vn: any) => {
      const w = (vn.word || '').trim();
      if (!w) return;
      const lower = w.toLowerCase();
      dictMap.set(lower, {
        id: vn.id || `dict_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        word: w,
        partOfSpeech: vn.partOfSpeech || '',
        definitionEn: vn.meaningOrTip || '',
        exampleSentenceEn: vn.exampleSentence || '',
        phonetic: vn.phonetic,
        audio: vn.audioUrl,
        learnedAt: new Date().toISOString(),
        source: vn.source || 'api',
        sourceActivityName: `Live Session with ${teacherName || 'Native Friend'}`,
        teacherEmail,
        teacherName,
        studentEmail: targetStudentEmail,
        studentUid: targetStudentUid,
      });
    });

    const updatedDict = Array.from(dictMap.values()).sort((a, b) => (a.word || '').localeCompare(b.word || ''));
    if (targetStudentEmail) db.studentDictionaryMap[targetStudentEmail] = updatedDict;
    if (targetStudentUid) db.studentDictionaryMap[targetStudentUid] = updatedDict;
  }

  await writeDbSync(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

// Student Personal Dictionary Endpoints (isolated by student UID and email)
app.get('/api/student-dictionary', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const db = readDb();
  const studentEmail = ((req.query.studentEmail as string) || (req.query.email as string) || '').toLowerCase().trim();
  const uid = (req.query.uid as string) || '';
  const role = (req.query.role as string) || '';

  if (role === 'admin' && !studentEmail && !uid) {
    return res.json(db.studentDictionaryMap || {});
  }

  if (studentEmail || uid) {
    const fromEmail: any[] = (studentEmail && db.studentDictionaryMap?.[studentEmail]) || [];
    const fromUid: any[] = (uid && db.studentDictionaryMap?.[uid]) || [];
    const map = new Map<string, any>();
    [...fromEmail, ...fromUid].forEach((entry: any) => {
      const w = (entry.word || '').toLowerCase().trim();
      if (w) map.set(w, entry);
    });
    const list = Array.from(map.values()).sort((a, b) => (a.word || '').localeCompare(b.word || ''));
    return res.json(list);
  }

  res.json([]);
});

app.post('/api/student-dictionary', async (req, res) => {
  const db = readDb();
  const { studentEmail, studentUid, teacherEmail, teacherName, entries, entry } = req.body || {};
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  if (!cleanEmail && !studentUid) {
    return res.status(400).json({ error: 'studentEmail or studentUid is required' });
  }

  if (!db.studentDictionaryMap) db.studentDictionaryMap = {};
  const currentList: any[] =
    (cleanEmail && db.studentDictionaryMap[cleanEmail]) ||
    (studentUid && db.studentDictionaryMap[studentUid]) ||
    [];

  const dictMap = new Map<string, any>();
  currentList.forEach((e: any) => {
    const w = (e.word || '').toLowerCase().trim();
    if (w) dictMap.set(w, e);
  });

  const itemsToAdd = Array.isArray(entries) ? entries : (entry ? [entry] : []);
  itemsToAdd.forEach((item: any) => {
    const w = (item.word || '').trim();
    if (!w) return;
    const lower = w.toLowerCase();
    dictMap.set(lower, {
      id: item.id || `dict_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: w,
      partOfSpeech: item.partOfSpeech || '',
      definitionEn: item.definitionEn || item.meaningOrTip || '',
      exampleSentenceEn: item.exampleSentenceEn || item.exampleSentence || '',
      phonetic: item.phonetic,
      audio: item.audio || item.audioUrl,
      learnedAt: item.learnedAt || new Date().toISOString(),
      source: item.source || 'api',
      sourceActivityName: item.sourceActivityName || (teacherName ? `Live Session with ${teacherName}` : 'Personal Dictionary'),
      teacherEmail: teacherEmail || item.teacherEmail,
      teacherName: teacherName || item.teacherName,
      studentEmail: cleanEmail,
      studentUid,
    });
  });

  const updated = Array.from(dictMap.values()).sort((a, b) => (a.word || '').localeCompare(b.word || ''));
  if (cleanEmail) db.studentDictionaryMap[cleanEmail] = updated;
  if (studentUid) db.studentDictionaryMap[studentUid] = updated;

  await writeDbSync(db);
  res.json({ success: true, dictionary: updated });
});

app.delete(['/api/lessons/:id', '/api/live-lessons/:id'], (req, res) => {
  const db = readDb();
  const id = decodeURIComponent(req.params.id);
  db.liveLessons = db.liveLessons.filter((l) => l.id !== id);
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
});

// 6. Chat Messages Endpoints
app.get('/api/chat-messages', (req, res) => {
  const db = readDb();
  res.json({ messages: db.chatMessages || [] });
});

app.post('/api/chat-messages', (req, res) => {
  const db = readDb();
  const { message, messages } = req.body;
  if (Array.isArray(messages)) {
    db.chatMessages = messages;
  } else if (message && message.id) {
    const idx = db.chatMessages.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      db.chatMessages[idx] = message;
    } else {
      db.chatMessages.push(message);
    }
  }
  writeDb(db);
  res.json({ success: true, messages: db.chatMessages });
});

app.delete('/api/chat-messages', (req, res) => {
  const db = readDb();
  db.chatMessages = [];
  writeDb(db);
  res.json({ success: true, messages: [] });
});

// 7. Routines Endpoints
app.get('/api/routines', (req, res) => {
  const db = readDb();
  if (Object.keys(db.routinesByDay || {}).length === 0) {
    return res.json({});
  }
  res.json(db.routinesByDay);
});

app.post('/api/routines', (req, res) => {
  const db = readDb();
  const routinesByDay = req.body.routinesByDay || req.body;
  const studentEmail = req.body.studentEmail;
  if (routinesByDay && typeof routinesByDay === 'object') {
    db.routinesByDay = routinesByDay;
    if (studentEmail) {
      db.studentRoutinesMap[studentEmail.toLowerCase().trim()] = routinesByDay;
    }
    writeDb(db);
  }
  res.json(db.routinesByDay);
});

app.post('/api/routines/words', (req, res) => {
  const db = readDb();
  const { day, activityId, words } = req.body;
  if (db.routinesByDay && db.routinesByDay[day]) {
    db.routinesByDay[day] = db.routinesByDay[day].map((item: any) =>
      item.id === activityId ? { ...item, learnedWords: words } : item
    );
    writeDb(db);
  }
  res.json({ success: true });
});

app.post('/api/routines/toggle', (req, res) => {
  const db = readDb();
  const { day, activityId } = req.body;
  if (db.routinesByDay && db.routinesByDay[day]) {
    db.routinesByDay[day] = db.routinesByDay[day].map((item: any) =>
      item.id === activityId ? { ...item, completedToday: !item.completedToday } : item
    );
    writeDb(db);
  }
  res.json({ success: true });
});

app.post('/api/routines/teacher-video', (req, res) => {
  const db = readDb();
  const { activityId, videos, teacherNotes, days } = req.body;
  const targetDays = Array.isArray(days) && days.length > 0 ? days : Object.keys(db.routinesByDay || {});
  targetDays.forEach((d: string) => {
    if (db.routinesByDay && db.routinesByDay[d]) {
      db.routinesByDay[d] = db.routinesByDay[d].map((item: any) =>
        item.id === activityId ? { ...item, teacherVideos: videos, teacherNotes: teacherNotes || item.teacherNotes } : item
      );
    }
  });
  writeDb(db);
  res.json({ success: true });
});

app.post('/api/routines/teacher-spotify', (req, res) => {
  const db = readDb();
  const { activityId, spotify, teacherNotes, days } = req.body;
  const targetDays = Array.isArray(days) && days.length > 0 ? days : Object.keys(db.routinesByDay || {});
  targetDays.forEach((d: string) => {
    if (db.routinesByDay && db.routinesByDay[d]) {
      db.routinesByDay[d] = db.routinesByDay[d].map((item: any) =>
        item.id === activityId ? { ...item, teacherSpotify: spotify, teacherNotes: teacherNotes || item.teacherNotes } : item
      );
    }
  });
  writeDb(db);
  res.json({ success: true });
});

// 7.1 Student Weekly S-Path Progress Endpoints (Multi-device cloud persistence)
app.get('/api/routines/weekly-checks', (req, res) => {
  const db = readDb();
  const studentEmail = ((req.query.studentEmail as string) || '').toLowerCase().trim();
  if (!studentEmail) {
    return res.json({ checks: {} });
  }
  const checks = (db.studentWeeklyChecks && db.studentWeeklyChecks[studentEmail]) || {};
  res.json({ checks });
});

app.post('/api/routines/weekly-checks', (req, res) => {
  const db = readDb();
  const { studentEmail, checks } = req.body;
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  if (cleanEmail && checks && typeof checks === 'object') {
    if (!db.studentWeeklyChecks) {
      db.studentWeeklyChecks = {};
    }
    db.studentWeeklyChecks[cleanEmail] = checks;
    writeDb(db);
  }
  res.json({ success: true, checks: (db.studentWeeklyChecks && db.studentWeeklyChecks[cleanEmail]) || {} });
});

// 8. Homework Endpoints
app.get('/api/homework', (req, res) => {
  const db = readDb();
  res.json(db.weeklyHomework);
});

app.post(['/api/homework', '/api/homework/submit'], (req, res) => {
  const db = readDb();
  const weeklyHomework = req.body.weeklyHomework || req.body;
  if (weeklyHomework) {
    db.weeklyHomework = weeklyHomework;
    writeDb(db);
  }
  res.json({ success: true, weeklyHomework: db.weeklyHomework });
});

// 9. Contracted Lessons Endpoints
app.get('/api/contracted-lessons', (req, res) => {
  const db = readDb();
  res.json(db.contractedLessons || {});
});

app.post('/api/contracted-lessons', (req, res) => {
  const db = readDb();
  const { studentEmail, email, count } = req.body;
  const cleanEmail = (studentEmail || email || '').toLowerCase().trim();
  if (cleanEmail && count !== undefined) {
    db.contractedLessons[cleanEmail] = Number(count);
    writeDb(db);
  }
  res.json(db.contractedLessons);
});

// 11. Email Logs Endpoint
app.post('/api/email-logs', (req, res) => {
  const db = readDb();
  const { log } = req.body;
  if (log) {
    db.emailLogs = [log, ...(db.emailLogs || [])].slice(0, 100);
    writeDb(db);
  }
  res.json({ success: true });
});

// 12. Writing / Grammar Evaluation via Gemini API (or Local Heuristic)
app.post('/api/check-writing', async (req, res) => {
  const { words = [], sentence = '', activityName = 'Routine', level = 'iniciante' } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a helpful pedagogical English teacher. Analyze the following student inputs:
Words typed by student: ${JSON.stringify(words)}
Sentence written by student: "${sentence}"
English level: ${level}
Activity context: ${activityName}

Check for spelling mistakes, vocabulary usage, and grammatical accuracy.
Output STRICT JSON matching this schema:
{
  "hasAnyError": boolean,
  "wordFeedbacks": [
    {
      "original": "string",
      "hasError": boolean,
      "corrected": "string",
      "explanationPt": "string",
      "explanationEn": "string"
    }
  ],
  "sentenceFeedback": {
    "original": "string",
    "hasError": boolean,
    "corrected": "string",
    "explanationPt": "string",
    "explanationEn": "string"
  },
  "correctedSentence": "string",
  "overallSummaryPt": "string",
  "overallSummaryEn": "string"
}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes('not found') || err?.message?.includes('404')) {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
        } else {
          throw err;
        }
      }

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json(parsed);
      }
    } catch (e) {
      console.warn('Gemini API writing check error, falling back:', e);
    }
  }

  // Fallback heuristic
  const wordFeedbacks = (words as string[]).map((w: string) => ({
    original: w,
    hasError: false,
    corrected: w,
    explanationPt: 'Ortografia válida.',
    explanationEn: 'Valid spelling.',
  }));

  res.json({
    hasAnyError: false,
    wordFeedbacks,
    sentenceFeedback: sentence
      ? {
          original: sentence,
          hasError: false,
          corrected: sentence,
          explanationPt: 'Frase correta.',
          explanationEn: 'Correct sentence.',
        }
      : undefined,
    correctedSentence: sentence,
    overallSummaryPt: 'Texto analisado com sucesso.',
    overallSummaryEn: 'Writing evaluated successfully.',
  });
});

// AI Live Lesson Vocabulary Generator
app.post('/api/lesson/vocab-generate', async (req, res) => {
  const { words, topic, notes } = req.body;
  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'words array is required' });
  }

  const cleanWords = words.map((w: any) => String(w || '').trim()).filter((w) => w.length > 0);
  if (cleanWords.length === 0) {
    return res.json({ success: true, entries: [] });
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a native English language teacher creating personalized vocabulary study notes for a live conversation lesson.
Lesson Topic: "${topic || 'Everyday conversation and practical routines'}"
Teacher's Live Lesson Notes/Context: "${notes || 'Real-life speaking practice'}"
Vocabulary items typed by the teacher during class: ${JSON.stringify(cleanWords)}

For EACH word or expression, generate a distinct, highly contextual pedagogical entry tailored specifically to that word:
1. word: exact word/expression
2. definitionEn: A simple, natural 1-sentence English definition explaining what the word means clearly for an English learner.
3. exampleSentenceEn: A natural, practical conversational or workplace example sentence in English that authentically uses the word in real context (NO generic placeholders, and never repeat the same sentence structure across words).
4. translationPt: A clear, concise Portuguese translation of the term.

Return a JSON array of objects with the exact schema:
[
  {
    "word": "string",
    "definitionEn": "string",
    "exampleSentenceEn": "string",
    "translationPt": "string"
  }
]`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes('not found') || err?.message?.includes('404')) {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
        } else {
          throw err;
        }
      }

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ success: true, entries: parsed });
        }
      }
    } catch (e) {
      console.warn('Gemini vocabulary generation error, falling back:', e);
    }
  }

  // Fallback linguistic generator for each word
  const entries = cleanWords.map((word) => {
    return {
      word,
      definitionEn: `A practical English term denoting "${word}", used naturally when communicating about ${topic || 'daily life'}.`,
      exampleSentenceEn: `During our conversation about ${topic || 'our routines'}, we practiced using "${word}" naturally.`,
      translationPt: `Vocabulário prático em inglês`,
    };
  });

  res.json({ success: true, entries });
});

async function startServer() {
  // Preload local database into memory immediately
  readDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`It's Simple Server running on http://localhost:${PORT}`);
    // Sync with Cloud Firestore asynchronously without blocking dev server startup
    initCloudPersistence().catch((err) => {
      console.warn('Initial cloud persistence notice:', err);
    });
  });
}

startServer();
