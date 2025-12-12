import { INITIAL_SCORES, SURVEY_QUESTIONS, HEALTH_TYPES } from '../constants';
import { Assessment, QuestionOption, Scores } from '../types';

export const calculateScores = (selectedOptionIds: string[]): Scores => {
  // Deep copy initial scores
  const currentScores: Scores = { ...INITIAL_SCORES };

  // Flatten all options for easy lookup
  const allOptions: QuestionOption[] = SURVEY_QUESTIONS.flatMap((q) => q.options);

  selectedOptionIds.forEach((id) => {
    const option = allOptions.find((opt) => opt.id === id);
    if (option && option.impact) {
      Object.entries(option.impact).forEach(([axis, impactValue]) => {
        const key = axis as keyof Scores;
        if (impactValue) {
          currentScores[key] = Math.max(0, Math.min(100, currentScores[key] + impactValue));
        }
      });
    }
  });

  return currentScores;
};

export const determineHealthType = (scores: Scores): string => {
  // Find the axis with the lowest score
  let lowestAxis: keyof Scores = 'Energy';
  let lowestScore = 100;

  (Object.entries(scores) as [keyof Scores, number][]).forEach(([axis, score]) => {
    if (score < lowestScore) {
      lowestScore = score;
      lowestAxis = axis;
    }
  });

  const matchedType = HEALTH_TYPES.find((type) => type.triggerAxis === lowestAxis);
  return matchedType ? matchedType.name : 'Balanced Harmony';
};