import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js';
import assignmentRoutes from './src/routes/assignmentRoutes.js';
import configRoutes from './src/routes/configRoutes.js';
import quizAnswerRoutes from './src/routes/quizAnswerRoutes.js';
import quizAttemptRoutes from './src/routes/quizAttemptRoutes.js';
import { notFound, errorHandler } from './src/middleware/errorMiddleware.js';

dotenv.config();

import connectDB from './src/config/db.js';

const app = express();


// --- MIDDLEWARE ---

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:5173',
  'https://painless-lms-portal-cohort8.vercel.app',
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ''));
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  try {
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return true;
    }

    const { hostname, protocol } = new URL(normalizedOrigin);
    return (
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') &&
      ['http:', 'https:'].includes(protocol)
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));

app.use(express.json());



// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('LMS API is running...');
});

app.use('/api/users', userRoutes);
app.use('/api/config', configRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quiz-answers', quizAnswerRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);





// --- ERROR MIDDLEWARE ---
// Must be placed AFTER routes
app.use(notFound);
app.use(errorHandler);





// --- SERVER LISTEN ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  connectDB();
  
});