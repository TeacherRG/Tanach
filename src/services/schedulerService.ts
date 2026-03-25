import { HDate, HebrewCalendar, flags } from "@hebcal/core";
import { DateTime } from "luxon";
import { NEVIIM_METADATA, KETUVIM_METADATA, BookMetadata } from "../data/tanakhMetadata";

export interface Portion {
  ref: string;
  heRef: string;
  ruRef: string;
  book: string;
  bookName: string;
  heBook: string;
  ruBook: string;
  verseCount: number;
  track: 'neviim' | 'ketuvim';
}

export interface StudyDay {
  day: number;
  date: string;
  portions: Portion[];
  isStudyDay: boolean;
  reason?: string; 
}

export class TanakhScheduler {
  private startDate: DateTime;
  private durationYears: number;

  constructor(startDate: string = "2024-01-01", durationYears: number = 3) {
    this.startDate = DateTime.fromISO(startDate);
    this.durationYears = durationYears;
  }

  public isStudyDay(date: DateTime): { isStudy: boolean; reason?: string } {
    const hDate = new HDate(date.toJSDate());
    
    // Check for Shabbat (Saturday)
    if (date.weekday === 6) {
      return { isStudy: false, reason: "Shabbat" };
    }

    // Check for major Jewish holidays
    const holidays = HebrewCalendar.getHolidaysOnDate(hDate) || [];
    const majorHolidays = holidays.filter(e => {
      const f = e.getFlags();
      // Filter for major holidays (Yom Tov, Fast days)
      return (f & flags.CHAG) || (f & flags.MAJOR_FAST);
    });

    if (majorHolidays.length > 0) {
      return { isStudy: false, reason: majorHolidays[0].render("en") };
    }

    return { isStudy: true };
  }

  private getRefFromVerseIndex(book: any, startVerseIndex: number, endVerseIndex: number, language: 'en' | 'ru' | 'he'): string {
    // startVerseIndex and endVerseIndex are 1-based absolute verse indices in the book
    let currentVerse = 0;
    let startRef = "";
    let endRef = "";

    for (let i = 0; i < book.chapters.length; i++) {
      const chapterVerseCount = book.chapters[i];
      if (!startRef && currentVerse + chapterVerseCount >= startVerseIndex) {
        startRef = `${i + 1}:${startVerseIndex - currentVerse}`;
      }
      if (!endRef && currentVerse + chapterVerseCount >= endVerseIndex) {
        endRef = `${i + 1}:${endVerseIndex - currentVerse}`;
      }
      currentVerse += chapterVerseCount;
    }
    
    let bookName = book.name;
    if (language === 'he') bookName = book.heName;
    else if (language === 'ru') bookName = book.ruName;
    else bookName = book.displayName;

    const startParts = startRef.split(':');
    const endParts = endRef.split(':');
    
    if (startParts[0] === endParts[0]) {
      return `${bookName} ${startParts[0]}:${startParts[1]}-${endParts[1]}`;
    } else {
      return `${bookName} ${startRef}-${endRef}`;
    }
  }

  public generateSchedule(): StudyDay[] {
    const schedule: StudyDay[] = [];
    const endDate = this.startDate.plus({ years: this.durationYears });
    
    let currentDate = this.startDate;
    const allDates: DateTime[] = [];
    while (currentDate < endDate) {
      allDates.push(currentDate);
      currentDate = currentDate.plus({ days: 1 });
    }

    const studyDates: DateTime[] = [];
    for (const date of allDates) {
      const check = this.isStudyDay(date);
      if (check.isStudy) {
        studyDates.push(date);
      }
    }

    const totalStudyDays = studyDates.length;

    // Track 1: Nevi'im
    const neviimVerses = NEVIIM_METADATA.reduce((acc, b) => acc + b.verseCount, 0);
    const neviimBasePace = neviimVerses / totalStudyDays;

    // Track 2: Ketuvim
    const ketuvimVerses = KETUVIM_METADATA.reduce((acc, b) => acc + b.verseCount, 0);
    const ketuvimBasePace = ketuvimVerses / totalStudyDays;

    let neviimBookIdx = 0;
    let neviimVerseIdx = 1;
    
    let ketuvimBookIdx = 0;
    let ketuvimVerseIdx = 1;

    let studyDayCounter = 1;

    for (const date of allDates) {
      const check = this.isStudyDay(date);
      
      if (!check.isStudy) {
        schedule.push({
          day: 0,
          date: date.toISODate()!,
          portions: [],
          isStudyDay: false,
          reason: check.reason
        });
        continue;
      }

      const portions: Portion[] = [];

      // Generate Nevi'im Portion
      if (neviimBookIdx < NEVIIM_METADATA.length) {
        const book = NEVIIM_METADATA[neviimBookIdx];
        const { versesRead, nextBook, nextVerse } = this.calculatePortion(book, neviimVerseIdx, neviimBasePace, NEVIIM_METADATA, neviimBookIdx);
        
        portions.push({
          ref: this.getRefFromVerseIndex(book, neviimVerseIdx, neviimVerseIdx + versesRead - 1, 'en'),
          heRef: this.getRefFromVerseIndex(book, neviimVerseIdx, neviimVerseIdx + versesRead - 1, 'he'),
          ruRef: this.getRefFromVerseIndex(book, neviimVerseIdx, neviimVerseIdx + versesRead - 1, 'ru'),
          book: book.displayName,
          bookName: book.name,
          heBook: book.heName,
          ruBook: book.ruName,
          verseCount: versesRead,
          track: 'neviim'
        });

        neviimBookIdx = nextBook;
        neviimVerseIdx = nextVerse;
      }

      // Generate Ketuvim Portion
      if (ketuvimBookIdx < KETUVIM_METADATA.length) {
        const book = KETUVIM_METADATA[ketuvimBookIdx];
        const { versesRead, nextBook, nextVerse } = this.calculatePortion(book, ketuvimVerseIdx, ketuvimBasePace, KETUVIM_METADATA, ketuvimBookIdx);
        
        portions.push({
          ref: this.getRefFromVerseIndex(book, ketuvimVerseIdx, ketuvimVerseIdx + versesRead - 1, 'en'),
          heRef: this.getRefFromVerseIndex(book, ketuvimVerseIdx, ketuvimVerseIdx + versesRead - 1, 'he'),
          ruRef: this.getRefFromVerseIndex(book, ketuvimVerseIdx, ketuvimVerseIdx + versesRead - 1, 'ru'),
          book: book.displayName,
          bookName: book.name,
          heBook: book.heName,
          ruBook: book.ruName,
          verseCount: versesRead,
          track: 'ketuvim'
        });

        ketuvimBookIdx = nextBook;
        ketuvimVerseIdx = nextVerse;
      }

      schedule.push({
        day: studyDayCounter++,
        date: date.toISODate()!,
        portions,
        isStudyDay: true
      });
    }

    return schedule;
  }

  private calculatePortion(book: BookMetadata, currentVerse: number, basePace: number, metadata: BookMetadata[], bookIdx: number) {
    const targetVerses = Math.max(3, Math.round(basePace / book.complexity));
    let versesToday = targetVerses;
    let verseAccumulator = 0;
    
    for (let i = 0; i < book.chapters.length; i++) {
      const chapterSize = book.chapters[i];
      const chapterEndAbsolute = verseAccumulator + chapterSize;
      const targetEndAbsolute = currentVerse + targetVerses - 1;
      
      if (chapterEndAbsolute >= currentVerse) {
        if (Math.abs(chapterEndAbsolute - targetEndAbsolute) <= 8) {
          versesToday = chapterEndAbsolute - currentVerse + 1;
          break;
        }
        if (targetEndAbsolute > chapterEndAbsolute && (targetEndAbsolute - chapterEndAbsolute) < 8) {
          versesToday = chapterEndAbsolute - currentVerse + 1;
          break;
        }
        if (chapterEndAbsolute > targetEndAbsolute) break;
      }
      verseAccumulator += chapterSize;
    }

    const remainingInBook = book.verseCount - currentVerse + 1;
    versesToday = Math.min(versesToday, remainingInBook);

    let nextVerse = currentVerse + versesToday;
    let nextBook = bookIdx;

    if (nextVerse > book.verseCount) {
      nextBook++;
      nextVerse = 1;
    }

    return { versesRead: versesToday, nextBook, nextVerse };
  }
}
