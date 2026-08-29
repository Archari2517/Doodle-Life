/**
 * 🔁 Routine Generation Engine
 * ---------------------------------------------------------------------------
 * รับ Routine (กฎการทำซ้ำ) แล้วคำนวณออกมาเป็น CalendarEvent (Task) รายวัน
 * เพื่อนำไปลงตาราง Event
 *
 * ใช้ toLocalDateStr / การไล่ทีละวันด้วย year/month/date แบบ local เสมอ
 * (ห้ามใช้ toISOString) เพื่อไม่ให้วันที่เพี้ยนข้ามเขตเวลา (ดู utils/date.ts)
 */
import { Routine, CalendarEvent } from '../types';
import { toLocalDateStr } from './date';

/** index ที่ Date.getDay() คืนค่า (0 = Sun ... 6 = Sat) แม็พไปเป็น day id ที่ Routine.days ใช้ */
const DAY_INDEX_TO_KEY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** สีประจำหมวดของ Routine (ใช้ทาสี Event บนปฏิทิน) */
const ROUTINE_CATEGORY_COLORS: Record<string, string> = {
  study: '#b0beff',
  health: '#a8e6cf',
  chore: '#ffd3b0',
  work: '#ff9f9f',
  personal: '#ffe66d'
};

/** วันแรกของเดือนที่ `date` อยู่ */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** วันสุดท้ายของเดือนที่ `date` อยู่ */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** คืนค่าช่วง startDate/endDate (YYYY-MM-DD) ของทั้งเดือนที่ `date` อยู่ */
export function getMonthRange(date: Date): { start: string; end: string } {
  return {
    start: toLocalDateStr(getFirstDayOfMonth(date)),
    end: toLocalDateStr(getLastDayOfMonth(date))
  };
}

/**
 * "วันเริ่มต้นใช้งาน Routine จริง" (Actual Start Date) ของ Routine หนึ่งตัว
 *  - ถ้าเป็น durationMode 'date_range' และมีการระบุ startDate ➔ ใช้ startDate นั้น
 *  - ไม่งั้น (เช่น durationMode 'indefinite' หรือไม่ได้ระบุ startDate) ➔ ใช้วันที่ (local)
 *    ที่ Routine ถูกสร้างขึ้นจริง (createdAt) แทน เพื่อไม่ให้ Event ย้อนหลังไปก่อนวันที่สร้าง
 */
export function getRoutineActualStartDate(routine: Routine): string {
  if (routine.durationMode === 'date_range' && routine.startDate) {
    return routine.startDate;
  }
  if (routine.createdAt) {
    const created = new Date(routine.createdAt);
    if (!isNaN(created.getTime())) {
      return toLocalDateStr(created);
    }
  }
  // กันพัง: ถ้าไม่มีข้อมูลอะไรเลยให้ถือว่าไม่จำกัดวันเริ่มต้น
  return '0000-01-01';
}

/**
 * "วันเริ่มต้นคำนวณ" (Effective Start Date) ของ Routine หนึ่งตัว ภายในช่วงที่กำลังคำนวณ
 *
 * ใช้กฎ "วันไหนมาทีหลัง ให้ใช้วันนั้น" (Max Date) เปรียบเทียบระหว่าง:
 *  1) `rangeStart` — วันแรกของช่วงที่กำลังเปิดดูบนตาราง (เช่น วันที่ 1 ของเดือน)
 *  2) `getRoutineActualStartDate(routine)` — วันที่เริ่มต้นใช้งาน Routine จริง
 *
 * ตัวอย่าง: เปิดดูตารางเดือนสิงหาคม (rangeStart = 1 ส.ค.) แต่กดสร้าง Routine วันที่ 15 ส.ค.
 * ➔ เทียบ 1 ส.ค. กับ 15 ส.ค. ➔ เลือก 15 ส.ค. (มาทีหลัง) เป็นจุดเริ่มต้นคำนวณ
 * ➔ Event จะถูกสร้างเฉพาะวันที่ 15-31 ส.ค. เท่านั้น
 */
export function getEffectiveStartDate(routine: Routine, rangeStart: string): string {
  const actualStart = getRoutineActualStartDate(routine);
  return actualStart > rangeStart ? actualStart : rangeStart;
}

/**
 * เงื่อนไข 4 ข้อที่ Routine ต้อง "ผ่านทั้งหมด" ถึงจะสร้าง Event ในวันนั้นได้:
 *  1) วันนั้นมาไม่ก่อน "วันเริ่มต้นคำนวณ" (Effective Start Date = max(rangeStart, วันเริ่มต้นจริง))
 *  2) วันนั้นอยู่ในช่วง endDate ของ Routine หรือไม่ (ถ้าเป็น date_range)
 *  3) วันนั้นตรงกับ daysOfWeek (จ.-อา.) ที่ตั้งไว้หรือไม่
 *  4) Routine นั้นยัง active อยู่หรือไม่
 *
 * @param rangeStart วันแรกของช่วงที่กำลังคำนวณ/เปิดดู ("YYYY-MM-DD") ใช้เทียบหา Effective Start Date
 */
export function isRoutineActiveOnDate(
  routine: Routine,
  dateStr: string,
  dayKey: string,
  rangeStart: string = dateStr
): boolean {
  // เงื่อนไข 4: สถานะ active (และไม่ใช่ Routine ที่หมดอายุ/ถูก Archive ไปแล้ว)
  if (!routine.active) return false;
  if (routine.status === 'expired') return false;

  // เงื่อนไข 3: วันในสัปดาห์
  if (!routine.days || !routine.days.includes(dayKey)) return false;

  // เงื่อนไข 1: วันเริ่มต้นคำนวณ (Max Date ระหว่างวันแรกของช่วงที่ดู กับวันเริ่มต้น Routine จริง)
  const effectiveStart = getEffectiveStartDate(routine, rangeStart);
  if (dateStr < effectiveStart) return false;

  // เงื่อนไข 2: วันสิ้นสุด (เฉพาะ durationMode === 'date_range')
  if (routine.durationMode === 'date_range') {
    if (routine.endDate && dateStr > routine.endDate) return false;
  }

  return true;
}

/** สร้าง id แบบ deterministic (คงที่) ต่อ Routine + วันที่ เพื่อไม่ให้เกิด Event ซ้ำเวลาสร้างซ้ำหลายรอบ */
export function buildRoutineEventId(routineId: string, dateStr: string): string {
  return `routine_${routineId}_${dateStr}`;
}

/** แปลง Routine หนึ่งตัว ให้เป็น CalendarEvent ของวันที่กำหนด (ไม่เช็คเงื่อนไข ผู้เรียกต้องเช็คก่อน) */
function buildEventFromRoutine(routine: Routine, dateStr: string): CalendarEvent {
  const isFixed = routine.scheduleType === 'fixed';
  return {
    id: buildRoutineEventId(routine.id, dateStr),
    title: routine.title,
    category: routine.category,
    categoryColor: ROUTINE_CATEGORY_COLORS[routine.category] || '#ffe66d',
    eisenhowerQuadrant: 'plan',
    dueDate: dateStr,
    dueTime: isFixed ? (routine.startTime || '09:00') : '',
    endTime: isFixed ? routine.endTime : undefined,
    durationMinutes: routine.durationMinutes || 30,
    completed: false,
    goalId: undefined,
    routineId: routine.id,
    isRoutineGenerated: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * ฟังก์ชันหลักของ Generation Engine
 *
 * @param routines  กฎ (Routine) ทั้งหมดที่จะนำมาคำนวณ
 * @param startDate วันเริ่มต้นของช่วงที่จะคำนวณ ("YYYY-MM-DD")
 * @param endDate   วันสิ้นสุดของช่วงที่จะคำนวณ ("YYYY-MM-DD", รวมวันนี้ด้วย)
 * @returns         อาร์เรย์ของ CalendarEvent พร้อมนำไป Append ลงตาราง Event
 *
 * วิธีทำงาน: วนลูปทีละวันตั้งแต่ startDate ถึง endDate แล้วตรวจ Routine ทุกตัว
 * ด้วย 4 เงื่อนไขใน isRoutineActiveOnDate — ผ่านครบทั้ง 4 ข้อ จึง generate Event
 * (รวมเงื่อนไข "วันเริ่มต้นคำนวณ" (Effective Start Date) ที่หา Max Date ระหว่างวันแรกของ
 * ช่วงที่กำลังคำนวณ กับวันเริ่มต้นใช้งาน Routine จริง — ดู getEffectiveStartDate)
 */
export function generateEventsForRange(
  routines: Routine[],
  startDate: string,
  endDate: string
): CalendarEvent[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  const events: CalendarEvent[] = [];

  // แตก "YYYY-MM-DD" เป็น year/month/date แบบ local เพื่อไล่ทีละวันโดยไม่เพี้ยนเขตเวลา
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (cursor <= end) {
    const dateStr = toLocalDateStr(cursor);
    const dayKey = DAY_INDEX_TO_KEY[cursor.getDay()];

    for (const routine of routines) {
      // ส่ง startDate ของช่วงที่กำลังคำนวณ (rangeStart) เข้าไปด้วย เพื่อให้ isRoutineActiveOnDate
      // หา "วันเริ่มต้นคำนวณ" (Effective Start Date) แบบ Max Date ได้ถูกต้อง — ดู getEffectiveStartDate
      if (isRoutineActiveOnDate(routine, dateStr, dayKey, startDate)) {
        events.push(buildEventFromRoutine(routine, dateStr));
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return events;
}

/* =============================================================================
 * 🗂️ Lifecycle & Categories — ตรวจสอบ Routine ที่หมดอายุ (Cron Job / Check Function)
 * =============================================================================
 * เรียกใช้ตอนเปิดแอป (หรือทุกครั้งที่ข้อมูล routines อัปเดต) เพื่อหา Routine ที่:
 *   - durationMode เป็น 'date_range' และมี endDate
 *   - endDate ผ่านไปแล้ว (เลยวันนี้)
 *   - ยังไม่ถูกตั้งสถานะเป็น 'expired'
 * แล้วส่งกลับให้ผู้เรียกไปอัปเดตสถานะเป็น 'expired' (ย้ายเข้าหมวด "กิจกรรมที่จบแล้ว")
 */
export function findNewlyExpiredRoutines(routines: Routine[], todayStr: string): Routine[] {
  return routines.filter(
    (r) =>
      r.durationMode === 'date_range' &&
      !!r.endDate &&
      r.endDate < todayStr &&
      r.status !== 'expired'
  );
}

/** Routine ที่ถูก Archive แล้ว (หมดอายุ) — ใช้แสดงในหมวด "กิจกรรมที่จบแล้ว" */
export function getArchivedRoutines(routines: Routine[]): Routine[] {
  return routines.filter((r) => r.status === 'expired');
}

/** Routine ที่หมดอายุแล้วแต่ผู้ใช้ยังไม่ได้กด "รับทราบ" — ใช้เป็นคิวของ Pop-up แจ้งเตือน */
export function getPendingExpiryNotifications(routines: Routine[]): Routine[] {
  return routines.filter((r) => r.status === 'expired' && !r.expiredAcknowledged);
}
