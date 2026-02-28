export interface Word {
  id: string;
  word: string;
  translation: string;
  example?: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReview: Date;
  nextReview: Date;
  interval: number;
  easiness: number;
  repetitions: number;
}

export interface WordList {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  totalWords: number;
  mastered: number;
  lastStudied?: Date;
  streak?: number;
}

export interface StudyStats {
  totalSessions: number;
  accuracy: number;
  currentStreak: number;
  longestStreak: number;
}