import { Router } from 'express';
import { questions } from '../data/questions.js';

export const quizRouter = Router();

const quizSessions = new Map<string, { questionId: string; correctAnswer: number }[]>();

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

quizRouter.get('/questions', (_req, res) => {
  const shuffledQuestions = shuffleArray(questions);
  const selected = shuffledQuestions.slice(0, 20);

  const sessionId = Math.random().toString(36).substring(2, 15);

  const sessionData: { questionId: string; correctAnswer: number }[] = [];

  const questionsWithShuffledOptions = selected.map((question) => {
    const correctAnswerText = question.options[question.correctAnswer];

    const shuffledOptions = shuffleArray(question.options);

    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

    sessionData.push({
      questionId: question.id,
      correctAnswer: newCorrectIndex,
    });

    return {
      id: question.id,
      question: question.question,
      options: shuffledOptions,
      category: question.category,
    };
  });

  quizSessions.set(sessionId, sessionData);

  setTimeout(() => {
    quizSessions.delete(sessionId);
  }, 60 * 60 * 1000);

  res.json({
    sessionId,
    questions: questionsWithShuffledOptions,
  });
});

quizRouter.post('/submit', (req, res) => {
  const { sessionId, answers } = req.body as {
    sessionId: string;
    answers: Record<string, number>;
  };

  const sessionData = quizSessions.get(sessionId);

  if (!sessionData) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  let correct = 0;
  const results = Object.entries(answers).map(([questionId, selectedIndex]) => {
    const questionData = sessionData.find((q) => q.questionId === questionId);
    const isCorrect = questionData?.correctAnswer === selectedIndex;
    if (isCorrect) correct++;

    return {
      questionId,
      selectedIndex,
      correctAnswer: questionData?.correctAnswer,
      isCorrect,
    };
  });

  quizSessions.delete(sessionId);

  res.json({
    totalQuestions: Object.keys(answers).length,
    correctAnswers: correct,
    percentage: Math.round((correct / Object.keys(answers).length) * 100),
    results,
  });
});