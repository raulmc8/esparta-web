import { Grade } from '../database/entities';

export function calculateAverage(grade?: Grade): number | null {
  if (!grade || grade.finalExam === null) {
    return null;
  }

  return Number(grade.finalExam.toFixed(1));
}
