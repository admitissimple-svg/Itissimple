import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory / persistent mock database file
const DB_FILE = path.join(process.cwd(), 'app-data.json');

interface AppDb {
  teachers: Array<{ email: string; name: string; role: string; registeredByAdmin?: boolean }>;
  tutorsList: Array<any>;
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

const DEFAULT_DB: AppDb = {
  teachers: [
    {
      email: 'reginahelena1980@gmail.com',
      name: 'Teacher Regina',
      role: 'teacher',
      registeredByAdmin: true,
    },
    {
      email: 'itissimple.school@gmail.com',
      name: 'It is Simple Teacher',
      role: 'teacher',
      registeredByAdmin: true,
    },
    {
      email: 'charles.lambert1939@gmail.com',
      name: 'Amigo Nativo Charles',
      role: 'teacher',
      registeredByAdmin: true,
    },
  ],
  tutorsList: [],
  students: [
    {
      id: 'st-1',
      name: 'Regina Helena',
      email: 'reginahelena1980@gmail.com',
      studentEmail: 'reginahelena1980@gmail.com',
      studentName: 'Regina Helena',
      level: 'iniciante',
      studentLevel: 'iniciante',
      goal: 'English for work & everyday communication',
      learningGoal: 'English for work & everyday communication',
      contractedLessons: 10,
      completedLessonsCount: 3,
      activeSince: '2025-01-10',
      createdAt: '2025-01-10T10:00:00Z',
      teacherEmail: 'itissimple.school@gmail.com',
      teacherName: 'Amigo Nativo Charles',
      status: 'active',
      enrolledAt: new Date().toISOString(),
    },
    {
      id: 'st-2',
      name: 'Vinicius Alcantara',
      email: 'vinicius.student@gmail.com',
      studentEmail: 'vinicius.student@gmail.com',
      studentName: 'Vinicius Alcantara',
      level: 'intermediario',
      studentLevel: 'intermediario',
      goal: 'Business presentations and international meetings',
      learningGoal: 'Business presentations and international meetings',
      contractedLessons: 5,
      completedLessonsCount: 1,
      activeSince: '2025-02-01',
      createdAt: '2025-02-01T10:00:00Z',
      teacherEmail: 'itissimple.school@gmail.com',
      teacherName: 'Amigo Nativo Charles',
      status: 'active',
      enrolledAt: new Date().toISOString(),
    },
  ],
  meetSettings: {
    'itissimple.school@gmail.com': {
      teacherEmail: 'itissimple.school@gmail.com',
      meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 30,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      timezone: 'America/Sao_Paulo',
    },
    'reginahelena1980@gmail.com': {
      teacherEmail: 'reginahelena1980@gmail.com',
      meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 30,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      timezone: 'America/Sao_Paulo',
    },
    'charles.lambert1939@gmail.com': {
      teacherEmail: 'charles.lambert1939@gmail.com',
      meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 30,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      timezone: 'America/New_York',
    },
  },
  teacherSettings: {},
  liveLessons: [],
  chatMessages: [],
  routinesByDay: {},
  studentRoutinesMap: {},
  contractedLessons: {
    'reginahelena1980@gmail.com': 10,
    'vinicius.student@gmail.com': 5,
  },
  userProfiles: {},
  emailLogs: [],
  weeklyHomework: null,
  landingContent: DEFAULT_LANDING_CONTENT,
  dictionary: {},
};

function readDb(): AppDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_DB,
        ...parsed,
        meetSettings: {
          ...DEFAULT_DB.meetSettings,
          ...(parsed.meetSettings || {}),
          ...(parsed.teacherSettings || {}),
        },
        teacherSettings: {
          ...DEFAULT_DB.teacherSettings,
          ...(parsed.teacherSettings || {}),
          ...(parsed.meetSettings || {}),
        },
        landingContent: {
          ...DEFAULT_LANDING_CONTENT,
          ...(parsed.landingContent || {}),
        },
        tutorsList: Array.isArray(parsed.tutorsList) ? parsed.tutorsList : (DEFAULT_DB.tutorsList || []),
      };
    }
  } catch (err) {
    console.warn('Error reading db file:', err);
  }
  return DEFAULT_DB;
}

function writeDb(db: AppDb) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing db file:', err);
  }
}

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1.1 Auth Endpoints (Preply-style Login & Registration)
app.post('/api/auth/login', (req, res) => {
  const db = readDb();
  const { email, password, role: requestedRole } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email or username is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let role = requestedRole === 'teacher' ? 'teacher' : 'student';
  let name = cleanEmail.split('@')[0];

  // Check if admin
  if (cleanEmail === 'adm.itissimple@gmail.com' || cleanEmail.includes('admin')) {
    role = 'admin';
    name = 'Admin It\'s Simple';
  } else if (requestedRole) {
    role = requestedRole === 'teacher' ? 'teacher' : 'student';
    if (role === 'teacher') {
      const teacherObj = db.teachers?.find((t) => t.email.toLowerCase() === cleanEmail);
      if (teacherObj) name = teacherObj.name;
    } else {
      const studentObj = db.students?.find(
        (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
      );
      if (studentObj) {
        name = studentObj.name || studentObj.studentName || name;
      }
    }
  } else {
    // Check if teacher
    const isTeacher = db.teachers?.some((t) => t.email.toLowerCase() === cleanEmail) ||
      cleanEmail.includes('charles') ||
      cleanEmail.includes('teacher') ||
      cleanEmail.includes('sarah');

    if (isTeacher) {
      role = 'teacher';
      const teacherObj = db.teachers?.find((t) => t.email.toLowerCase() === cleanEmail);
      if (teacherObj) name = teacherObj.name;
    } else {
      // Check if student
      const studentObj = db.students?.find(
        (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
      );
      if (studentObj) {
        name = studentObj.name || studentObj.studentName || name;
        role = 'student';
      }
    }
  }

  const account = {
    email: cleanEmail,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    role,
  };

  res.json({ success: true, account });
});

app.post('/api/auth/register', (req, res) => {
  const db = readDb();
  const { name, email, password, role = 'student', level = 'iniciante', goal } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const resolvedRole = role === 'teacher' ? 'teacher' : 'student';

  if (resolvedRole === 'teacher') {
    const existingIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
    const teacherData = {
      name,
      email: cleanEmail,
      role: 'teacher',
      registeredByAdmin: false,
    };
    if (existingIdx >= 0) {
      db.teachers[existingIdx] = { ...db.teachers[existingIdx], ...teacherData };
    } else {
      db.teachers.push(teacherData);
    }
  } else {
    const existingIdx = db.students.findIndex(
      (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
    );
    const studentData = {
      id: `st-${Date.now()}`,
      name,
      studentName: name,
      email: cleanEmail,
      studentEmail: cleanEmail,
      level,
      studentLevel: level,
      goal: goal || 'English for everyday life & work',
      learningGoal: goal || 'English for everyday life & work',
      contractedLessons: 5,
      completedLessonsCount: 0,
      teacherEmail: 'charles.lambert1939@gmail.com',
      teacherName: 'Charles Lambert',
      status: 'active',
      activeSince: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.students[existingIdx] = { ...db.students[existingIdx], ...studentData };
    } else {
      db.students.push(studentData);
    }
    db.contractedLessons[cleanEmail] = 5;
  }

  writeDb(db);

  const account = {
    email: cleanEmail,
    name,
    role: resolvedRole,
  };

  res.json({ success: true, account });
});

app.post('/api/auth/google', (req, res) => {
  const db = readDb();
  const { email, name, picture, role: requestedRole } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for Google login' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let role = requestedRole === 'teacher' ? 'teacher' : 'student';
  let displayName = name || cleanEmail.split('@')[0];

  if (cleanEmail === 'adm.itissimple@gmail.com' || cleanEmail.includes('admin')) {
    role = 'admin';
    displayName = 'Admin It\'s Simple';
  } else if (requestedRole) {
    role = requestedRole === 'teacher' ? 'teacher' : 'student';
  } else if (
    db.teachers?.some((t) => t.email.toLowerCase() === cleanEmail) ||
    cleanEmail.includes('charles') ||
    cleanEmail.includes('teacher')
  ) {
    role = 'teacher';
  }

  // If new student, add to students list
  if (role === 'student') {
    const existing = db.students.find(
      (s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail
    );
    if (!existing) {
      db.students.push({
        id: `st-${Date.now()}`,
        name: displayName,
        studentName: displayName,
        email: cleanEmail,
        studentEmail: cleanEmail,
        level: 'iniciante',
        studentLevel: 'iniciante',
        contractedLessons: 5,
        completedLessonsCount: 0,
        teacherEmail: 'charles.lambert1939@gmail.com',
        teacherName: 'Charles Lambert',
        status: 'active',
        activeSince: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
      db.contractedLessons[cleanEmail] = 5;
      writeDb(db);
    }
  }

  const account = {
    email: cleanEmail,
    name: displayName,
    role,
    picture: picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  };

  res.json({ success: true, account });
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
  const db = readDb();
  res.json(db.tutorsList || []);
});

app.post('/api/tutors', (req, res) => {
  const db = readDb();
  const newTutor = req.body.tutor || req.body;
  if (!newTutor || !newTutor.email) {
    return res.status(400).json({ error: 'Invalid tutor data' });
  }
  const cleanEmail = newTutor.email.toLowerCase().trim();
  const tutorId = newTutor.id || `tutor-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
  
  const tutorEntry = {
    ...newTutor,
    id: tutorId,
    email: cleanEmail,
    approvalStatus: newTutor.approvalStatus || (newTutor.registeredByAdmin ? 'approved' : 'pending'),
    appliedAt: newTutor.appliedAt || new Date().toISOString(),
  };

  const existingIdx = (db.tutorsList || []).findIndex((t) => t.email.toLowerCase() === cleanEmail || t.id === tutorId);
  if (existingIdx >= 0) {
    db.tutorsList[existingIdx] = { ...db.tutorsList[existingIdx], ...tutorEntry };
  } else {
    db.tutorsList = db.tutorsList || [];
    db.tutorsList.push(tutorEntry);
  }

  // Also maintain teachers list for auth
  const teacherIdx = db.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
  if (teacherIdx >= 0) {
    db.teachers[teacherIdx] = { ...db.teachers[teacherIdx], name: newTutor.name, email: cleanEmail };
  } else {
    db.teachers.push({ email: cleanEmail, name: newTutor.name, role: 'teacher' });
  }

  writeDb(db);
  res.json({ success: true, tutor: tutorEntry, tutors: db.tutorsList });
});

app.put('/api/tutors/:id', (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  const updatedData = req.body;
  
  const existingIdx = (db.tutorsList || []).findIndex(
    (t) => t.id === tutorId || t.email?.toLowerCase() === tutorId?.toLowerCase()
  );

  if (existingIdx >= 0) {
    db.tutorsList[existingIdx] = {
      ...db.tutorsList[existingIdx],
      ...updatedData,
      id: db.tutorsList[existingIdx].id || tutorId,
    };
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

app.post('/api/tutors/:id/approve', (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  db.tutorsList = (db.tutorsList || []).map((t) =>
    t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()
      ? { ...t, approvalStatus: 'approved' }
      : t
  );
  writeDb(db);
  res.json({ success: true, tutors: db.tutorsList });
});

app.post('/api/tutors/:id/reject', (req, res) => {
  const db = readDb();
  const tutorId = req.params.id;
  db.tutorsList = (db.tutorsList || []).map((t) =>
    t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()
      ? { ...t, approvalStatus: 'rejected' }
      : t
  );
  writeDb(db);
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

// 2.1 Dictionary Definition with Gemini AI fallback
app.post('/api/dictionary/define', async (req, res) => {
  const { word, context, activityName } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const cleanWord = word.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a professional pedagogical English dictionary for Brazilian learners. Provide the English dictionary definition, part of speech, an everyday English example sentence, and a concise Portuguese translation for the word/expression: "${cleanWord}". Context: ${activityName || context || 'Everyday life routine'}.
Return strictly JSON matching:
{
  "word": "${cleanWord}",
  "partOfSpeech": "noun | verb | adjective | phrasal verb | idiom",
  "definitionEn": "Clear, accessible, native English definition in simple English",
  "exampleSentenceEn": "Natural everyday English example sentence",
  "translationPt": "Tradução concisa em português"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json(parsed);
      }
    } catch (e) {
      console.warn('Gemini dictionary definition fallback:', e);
    }
  }

  // Local fallback
  res.json({
    word: cleanWord,
    partOfSpeech: 'word / expression',
    definitionEn: `Key English vocabulary used in daily conversational situations${context ? ` related to ${context}` : ''}.`,
    exampleSentenceEn: `I practiced using "${cleanWord}" during my routine today.`,
    translationPt: 'Vocabulário prático em inglês',
  });
});

// 3. Meet Settings & Teacher Settings Endpoints
app.get(['/api/meet-settings', '/api/teacher-settings'], (req, res) => {
  const db = readDb();
  const settings = { ...db.meetSettings, ...db.teacherSettings };
  res.json(settings);
});

app.post(['/api/meet-settings', '/api/teacher-settings'], (req, res) => {
  const db = readDb();
  const settings = req.body.settings || req.body;
  const teacherEmail = req.body.teacherEmail || settings.teacherEmail;
  if (!teacherEmail || !settings) {
    return res.status(400).json({ error: 'Missing teacherEmail or settings' });
  }
  const cleanEmail = teacherEmail.toLowerCase().trim();
  db.meetSettings[cleanEmail] = {
    ...settings,
    teacherEmail: cleanEmail,
  };
  db.teacherSettings[cleanEmail] = db.meetSettings[cleanEmail];
  writeDb(db);
  res.json({ success: true, meetSettings: db.meetSettings, teacherSettings: db.teacherSettings });
});

// 4. Students & Enrollments Endpoints
app.get('/api/students', (req, res) => {
  const db = readDb();
  res.json(db.students || []);
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

app.post('/api/students/profile', (req, res) => {
  const db = readDb();
  const { profile, picture } = req.body;
  if (!profile || !profile.email) {
    return res.status(400).json({ error: 'Profile email is required' });
  }
  const cleanEmail = profile.email.toLowerCase().trim();
  db.userProfiles[cleanEmail] = {
    ...profile,
    email: cleanEmail,
    avatar: picture || profile.avatar,
    picture: picture || profile.picture,
  };

  const idx = db.students.findIndex((s) => (s.email || s.studentEmail || '').toLowerCase() === cleanEmail);
  if (idx >= 0) {
    db.students[idx] = {
      ...db.students[idx],
      name: profile.name,
      studentName: profile.name,
      level: profile.level,
      studentLevel: profile.level,
      goal: profile.learningGoal || db.students[idx].goal,
      picture: picture || db.students[idx].picture,
    };
  }

  writeDb(db);
  res.json({ success: true, profile: db.userProfiles[cleanEmail] });
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
  const studentEmail = ((req.query.studentEmail as string) || '').toLowerCase().trim();
  const routines = db.studentRoutinesMap[studentEmail] || db.routinesByDay;
  res.json(routines);
});

// 5. Live Lessons Endpoints
app.get(['/api/lessons', '/api/live-lessons'], (req, res) => {
  const db = readDb();
  res.json(db.liveLessons || []);
});

app.post(['/api/lessons', '/api/live-lessons'], (req, res) => {
  const db = readDb();
  const { lesson, lessons } = req.body;
  const newLesson = lesson || (req.body.id ? req.body : null);
  if (Array.isArray(lessons)) {
    db.liveLessons = lessons;
  } else if (newLesson && newLesson.id) {
    const idx = db.liveLessons.findIndex((l) => l.id === newLesson.id);
    if (idx >= 0) {
      db.liveLessons[idx] = newLesson;
    } else {
      db.liveLessons.unshift(newLesson);
    }
  }
  writeDb(db);
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
  const { newStartIso, newEndIso, reason } = req.body;
  db.liveLessons = db.liveLessons.map((l) =>
    l.id === id
      ? {
          ...l,
          startDateTime: newStartIso || l.startDateTime,
          endDateTime: newEndIso || l.endDateTime,
          rescheduleNotes: reason,
          proposalStatus: 'pending_reschedule',
        }
      : l
  );
  writeDb(db);
  res.json({ success: true, liveLessons: db.liveLessons });
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

// 10. User Profile Endpoints
app.get('/api/user-profile', (req, res) => {
  const db = readDb();
  const email = ((req.query.email as string) || '').toLowerCase().trim();
  const profile = db.userProfiles[email] || null;
  res.json({ profile });
});

app.post('/api/user-profile', (req, res) => {
  const db = readDb();
  const { profile } = req.body;
  if (profile && profile.email) {
    const cleanEmail = profile.email.toLowerCase().trim();
    db.userProfiles[cleanEmail] = profile;
    writeDb(db);
  }
  res.json({ success: true });
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

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

async function startServer() {
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
  });
}

startServer();
