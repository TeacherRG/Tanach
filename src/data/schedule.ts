import { TanakhScheduler, StudyDay } from "../services/schedulerService";

// Generate schedule starting from March 23, 2026 (today)
const scheduler = new TanakhScheduler("2026-03-23", 3);
export const TANAKH_SCHEDULE: StudyDay[] = scheduler.generateSchedule();

export type { StudyDay as DaySchedule };
