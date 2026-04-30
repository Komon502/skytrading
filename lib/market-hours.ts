// ============================================================
// Market Hours Configuration
// กำหนดเวลาตลาดเปิด-ปิด
// ใช้เวลาประเทศไทย (UTC+7) - Bangkok, Thailand
// ============================================================

// ตลาดหุ้นไทย (SET)
// เปิด: 10:00 - 12:30, 14:00 - 16:30 (จันทร์-ศุกร์)
// ยกเว้นวันหยุดนักขัตฤกษ์
// ใช้เวลาไทย (UTC+7)

export interface MarketSchedule {
  dayOfWeek: number  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (ใช้เวลาไทย)
  openTime: string   // "HH:MM" format (เวลาไทย)
  closeTime: string  // "HH:MM" format (เวลาไทย)
  isOpen: boolean
}

// Helper: Get current date/time in Thailand (UTC+7)
export function getThailandTime(date: Date = new Date()): Date {
  // Create a date that represents the same moment, but formatted in Thailand timezone
  const thaiTimeString = date.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Parse the Thailand time string back to a Date object
  // This Date will still be in local system time, but represents Thailand time
  return new Date(thaiTimeString)
}

// Helper: Get Thailand date string (YYYY-MM-DD)
export function getThailandDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('sv', { timeZone: 'Asia/Bangkok' }) // sv = ISO format (YYYY-MM-DD)
}

// Helper: Get Thailand day of week (0-6)
export function getThailandDayOfWeek(date: Date = new Date()): number {
  const thaiTime = getThailandTime(date)
  return thaiTime.getDay()
}

// Helper: Get Thailand hours and minutes
export function getThailandHoursMinutes(date: Date = new Date()): { hours: number; minutes: number } {
  const thaiTime = getThailandTime(date)
  return {
    hours: thaiTime.getHours(),
    minutes: thaiTime.getMinutes()
  }
}

// Default: Thai Stock Market (SET) schedule
// Pre-market: 09:30 - 10:00
// Morning: 10:00 - 12:30
// Lunch break: 12:30 - 14:00
// Afternoon: 14:00 - 16:30
// After-hours: 16:30 - 17:00

export const DEFAULT_MARKET_SCHEDULE: MarketSchedule[] = [
  { dayOfWeek: 1, openTime: "10:00", closeTime: "12:30", isOpen: true },  // Monday morning
  { dayOfWeek: 1, openTime: "14:00", closeTime: "16:30", isOpen: true },  // Monday afternoon
  { dayOfWeek: 2, openTime: "10:00", closeTime: "12:30", isOpen: true },  // Tuesday morning
  { dayOfWeek: 2, openTime: "14:00", closeTime: "16:30", isOpen: true },  // Tuesday afternoon
  { dayOfWeek: 3, openTime: "10:00", closeTime: "12:30", isOpen: true },  // Wednesday morning
  { dayOfWeek: 3, openTime: "14:00", closeTime: "16:30", isOpen: true },  // Wednesday afternoon
  { dayOfWeek: 4, openTime: "10:00", closeTime: "12:30", isOpen: true },  // Thursday morning
  { dayOfWeek: 4, openTime: "14:00", closeTime: "16:30", isOpen: true },  // Thursday afternoon
  { dayOfWeek: 5, openTime: "10:00", closeTime: "12:30", isOpen: true },  // Friday morning
  { dayOfWeek: 5, openTime: "14:00", closeTime: "16:30", isOpen: true },  // Friday afternoon
]

// วันหยุดนักขัตฤกษ์ 2568 (Thai Public Holidays 2025)
export const THAI_HOLIDAYS_2025 = [
  "2025-01-01", // New Year's Day
  "2025-04-06", // Chakri Memorial Day
  "2025-04-14", // Songkran
  "2025-04-15", // Songkran
  "2025-05-01", // Labor Day
  "2025-05-05", // Coronation Day
  "2025-05-12", // Wisakha Bucha Day
  "2025-07-28", // King's Birthday
  "2025-08-12", // Queen's Birthday/Mother's Day
  "2025-10-13", // King Bhumibol Memorial Day
  "2025-10-23", // Chulalongkorn Day
  "2025-12-05", // Father's Day
  "2025-12-10", // Constitution Day
  "2025-12-31", // New Year's Eve
]

// แปลงเวลาเป็นนาที (00:00 = 0, 23:59 = 1439)
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// ตรวจสอบว่าเป็นวันหยุดหรือไม่ (ใช้วันที่ไทย)
function isHoliday(date: Date): boolean {
  const dateStr = getThailandDateString(date)
  return THAI_HOLIDAYS_2025.includes(dateStr)
}

// ตรวจสอบว่าตลาดเปิดหรือไม่ (ใช้เวลาไทย UTC+7)
export function isMarketOpen(
  date: Date = new Date(),
  schedule: MarketSchedule[] = DEFAULT_MARKET_SCHEDULE
): { isOpen: boolean; nextOpen?: Date; nextClose?: Date; message: string } {
  // Get Thailand time values
  const thaiDayOfWeek = getThailandDayOfWeek(date)
  const { hours, minutes } = getThailandHoursMinutes(date)
  
  // Check if it's a weekend (Saturday=6, Sunday=0 in Thailand)
  if (thaiDayOfWeek === 0 || thaiDayOfWeek === 6) {
    return {
      isOpen: false,
      message: "ตลาดปิด (วันหยุดสุดสัปดาห์)",
    }
  }

  // Check if it's a holiday (using Thailand date)
  if (isHoliday(date)) {
    return {
      isOpen: false,
      message: "ตลาดปิด (วันหยุดนักขัตฤกษ์)",
    }
  }

  // Get current time in minutes (Thailand time)
  const currentMinutes = hours * 60 + minutes
  const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

  // Find if current time falls within any open session (using Thailand day of week)
  const todaysSessions = schedule.filter(s => s.dayOfWeek === thaiDayOfWeek && s.isOpen)

  for (const session of todaysSessions) {
    const openMinutes = timeToMinutes(session.openTime)
    const closeMinutes = timeToMinutes(session.closeTime)

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      // Market is open!
      // Create nextClose in Thailand timezone
      const thaiTime = getThailandTime(date)
      const nextClose = new Date(thaiTime)
      nextClose.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0)

      return {
        isOpen: true,
        nextClose,
        message: `ตลาดเปิด (ปิดเวลา ${session.closeTime} น.)`,
      }
    }
  }

  // Market is closed - find next opening
  // Check if there are more sessions today
  const futureSessions = todaysSessions.filter(s => timeToMinutes(s.openTime) > currentMinutes)

  if (futureSessions.length > 0) {
    // There are more sessions today
    const nextSession = futureSessions[0]
    // Create nextOpen in Thailand timezone
    const thaiTime = getThailandTime(date)
    const nextOpen = new Date(thaiTime)
    nextOpen.setHours(
      Math.floor(timeToMinutes(nextSession.openTime) / 60),
      timeToMinutes(nextSession.openTime) % 60,
      0,
      0
    )

    return {
      isOpen: false,
      nextOpen,
      message: `ตลาดปิด (เปิดอีกครั้งเวลา ${nextSession.openTime} น.)`,
    }
  }

  // Find next open day (using Thailand timezone)
  let daysToAdd = 1
  let nextOpenDate = new Date(date)
  nextOpenDate.setDate(nextOpenDate.getDate() + 1)

  while (daysToAdd <= 7) {
    const nextDayOfWeek = getThailandDayOfWeek(nextOpenDate)

    // Skip weekends (Saturday=6, Sunday=0 in Thailand)
    if (nextDayOfWeek !== 0 && nextDayOfWeek !== 6) {
      // Check if it's not a holiday (using Thailand date)
      if (!isHoliday(nextOpenDate)) {
        const nextDaySessions = schedule.filter(s => s.dayOfWeek === nextDayOfWeek && s.isOpen)
        if (nextDaySessions.length > 0) {
          const firstSession = nextDaySessions[0]
          
          // Create next open time in Thailand timezone
          const thaiTime = getThailandTime(nextOpenDate)
          thaiTime.setHours(
            Math.floor(timeToMinutes(firstSession.openTime) / 60),
            timeToMinutes(firstSession.openTime) % 60,
            0,
            0
          )

          const formattedDate = thaiTime.toLocaleDateString('th-TH', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })

          return {
            isOpen: false,
            nextOpen: thaiTime,
            message: `ตลาดปิด (เปิด ${formattedDate} เวลา ${firstSession.openTime} น.)`,
          }
        }
      }
    }

    nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    daysToAdd++
  }

  return {
    isOpen: false,
    message: "ตลาดปิด",
  }
}

// Format countdown to next market open
export function formatCountdown(targetDate: Date): string {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()

  if (diff <= 0) return "เปิดแล้ว"

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `อีก ${hours} ชม. ${minutes} น.`
  }
  return `อีก ${minutes} น.`
}
