import { format, subDays, isToday } from 'date-fns';
import confetti from 'canvas-confetti';

export const formatDate = (date: Date) => format(date, 'dd MMM yyyy');

export const calculateNextReview = (word: any, quality: number) => {
  // Simple SM-2 spaced repetition logic
  let { interval, repetitions, easiness } = word;
  easiness = Math.max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easiness);
  }
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return { interval, repetitions, easiness, nextReview };
};

export const triggerConfetti = () => {
  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 250);
};

export const exportToCSV = (words: any[], listName: string) => {
  const csv = "Woord,Vertaling,Voorbeeld,Categorie\n" + words.map(w => `"${w.word}","${w.translation}","${w.example || ''}","${w.category || ''}"`).join("\n");
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${listName}-woorden.csv`;
  a.click();
};

export const importFromCSV = (csvText: string) => {
  const lines = csvText.split('\n').slice(1);
  return lines.map(line => {
    const [word, translation, example, category] = line.split(',').map(s => s.replace(/"/g, '').trim());
    return { word, translation, example, category, difficulty: 'medium' as const };
  }).filter(w => w.word && w.translation);
};