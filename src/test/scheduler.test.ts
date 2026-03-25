import { describe, it, expect } from 'vitest';
import { TanakhScheduler } from '../services/schedulerService';
import { DateTime } from 'luxon';

describe('TanakhScheduler', () => {
  const scheduler = new TanakhScheduler('2026-03-23', 1);

  it('should identify Shabbat as a non-study day', () => {
    const shabbat = DateTime.fromISO('2026-03-28'); // Saturday
    const result = scheduler.isStudyDay(shabbat);
    expect(result.isStudy).toBe(false);
    expect(result.reason).toBe('Shabbat');
  });

  it('should identify a regular weekday as a study day', () => {
    const monday = DateTime.fromISO('2026-03-23'); // Monday
    const result = scheduler.isStudyDay(monday);
    expect(result.isStudy).toBe(true);
  });

  it('should generate a schedule with study days', () => {
    const schedule = scheduler.generateSchedule();
    expect(schedule.length).toBeGreaterThan(0);
    
    const studyDay = schedule.find(d => d.isStudyDay);
    expect(studyDay).toBeDefined();
    expect(studyDay?.portions.length).toBeGreaterThan(0);
  });

  it('should handle Jewish holidays as non-study days', () => {
    // Pesach 2026 starts on April 1st evening, so April 2nd is a holiday
    const pesach = DateTime.fromISO('2026-04-02');
    const result = scheduler.isStudyDay(pesach);
    expect(result.isStudy).toBe(false);
    expect(result.reason).toBeDefined();
  });
});
