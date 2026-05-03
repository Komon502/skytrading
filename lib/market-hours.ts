// ============================================================
// Market Hours Configuration
// กำหนดเวลาตลาดเปิด-ปิด
// ใช้เวลาประเทศไทย (UTC+7) - Bangkok, Thailand
// ============================================================

// ============================================================
// Market Hours Configuration - Thailand Time (UTC+7)
// กำหนดเวลาตลาดเปิด-ปิด ตามเวลาประเทศไทย (UTC+7)
// ============================================================
// 
// 🏛️ ตลาดหุ้น US (NYSE/NASDAQ)
// เปิด: 21:30 - 04:00 น. (เวลาไทย, วันถัดไป)
// เปิดทำการ: จันทร์-ศุกร์ (US time) = จันทร์เย็น - เช้าวันเสาร์ (เวลาไทย)
// วันหยุด: วันเสาร์เช้า (Thai Sat morning) - วันจันทร์เย็น (Thai Mon evening)
//
// 💱 ตลาด Forex
// เปิด: 24 ชั่วโมง จันทร์ 05:00 น. - เสาร์ 05:00 น. (เวลาไทย)
// ปิด: เสาร์ 05:00 น. - จันทร์ 05:00 น.
//
// ₿ ตลาด Crypto
// เปิด: 24/7 ตลอดทั้งปี (ไม่มีวันหยุด)
//
// ============================================================

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

// US Stock Market (NYSE/NASDAQ) - Converted to Thailand Time (UTC+7)
// US Market Hours: 09:30 - 16:00 ET (Eastern Time)
// Thailand Time: 21:30 - 04:00 (next day)
// 
// Trading days in Thailand time:
// Mon 21:30 -> Tue 04:00 (US Monday)
// Tue 21:30 -> Wed 04:00 (US Tuesday)
// Wed 21:30 -> Thu 04:00 (US Wednesday)
// Thu 21:30 -> Fri 04:00 (US Thursday)
// Fri 21:30 -> Sat 04:00 (US Friday)

export const US_STOCK_SCHEDULE: MarketSchedule[] = [
  // Monday evening to Tuesday morning (US Monday)
  { dayOfWeek: 1, openTime: "21:30", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 2, openTime: "00:00", closeTime: "04:00", isOpen: true },
  // Tuesday evening to Wednesday morning (US Tuesday)
  { dayOfWeek: 2, openTime: "21:30", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 3, openTime: "00:00", closeTime: "04:00", isOpen: true },
  // Wednesday evening to Thursday morning (US Wednesday)
  { dayOfWeek: 3, openTime: "21:30", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 4, openTime: "00:00", closeTime: "04:00", isOpen: true },
  // Thursday evening to Friday morning (US Thursday)
  { dayOfWeek: 4, openTime: "21:30", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 5, openTime: "00:00", closeTime: "04:00", isOpen: true },
  // Friday evening to Saturday morning (US Friday)
  { dayOfWeek: 5, openTime: "21:30", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 6, openTime: "00:00", closeTime: "04:00", isOpen: true },
]

// Forex Market Schedule (Thailand Time UTC+7)
// Forex opens Sunday 17:00 ET = Monday 05:00 Thailand
// Forex closes Friday 17:00 ET = Saturday 05:00 Thailand
// Forex is closed: Saturday 05:00 - Monday 05:00 (Thailand time)

export const FOREX_SCHEDULE: MarketSchedule[] = [
  // Monday: 05:00 - 23:59
  { dayOfWeek: 1, openTime: "05:00", closeTime: "23:59", isOpen: true },
  // Tuesday - Thursday: 00:00 - 23:59 (full day)
  { dayOfWeek: 2, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 3, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 4, openTime: "00:00", closeTime: "23:59", isOpen: true },
  // Friday: 00:00 - 05:00
  { dayOfWeek: 5, openTime: "00:00", closeTime: "23:59", isOpen: true },
  // Saturday: 00:00 - 05:00 only
  { dayOfWeek: 6, openTime: "00:00", closeTime: "05:00", isOpen: true },
]

// Crypto Market - Always open 24/7
export const CRYPTO_SCHEDULE: MarketSchedule[] = [
  { dayOfWeek: 0, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 1, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 2, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 3, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 4, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 5, openTime: "00:00", closeTime: "23:59", isOpen: true },
  { dayOfWeek: 6, openTime: "00:00", closeTime: "23:59", isOpen: true },
]

// Thai Stock Market (SET) schedule - kept for reference
// Pre-market: 09:30 - 10:00
// Morning: 10:00 - 12:30
// Lunch break: 12:30 - 14:00
// Afternoon: 14:00 - 16:30
// After-hours: 16:30 - 17:00

export const DEFAULT_MARKET_SCHEDULE: MarketSchedule[] = US_STOCK_SCHEDULE

// US Market Holidays 2025 (affects US stocks)
export const US_MARKET_HOLIDAYS_2025 = [
  "2025-01-01", // New Year's Day
  "2025-01-20", // Martin Luther King Jr. Day
  "2025-02-17", // Presidents' Day
  "2025-04-18", // Good Friday
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas Day
]

// Thai Public Holidays 2568 (affects Thai stocks)
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

// Check if it's a US market holiday
function isUSHoliday(date: Date): boolean {
  const dateStr = getThailandDateString(date)
  return US_MARKET_HOLIDAYS_2025.includes(dateStr)
}

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

export type MarketType = 'stock' | 'crypto' | 'forex'

export interface MarketStatus {
  isOpen: boolean
  nextOpen?: Date
  nextClose?: Date
  message: string
  countdown?: string
  isSynthetic?: boolean
  timestamp?: string
}

// Check if a specific date falls on weekend in Thailand time
function isWeekendThai(date: Date): boolean {
  const day = getThailandDayOfWeek(date)
  return day === 0 || day === 6
}

// Get schedule for market type
function getScheduleForMarketType(type: MarketType): MarketSchedule[] {
  switch (type) {
    case 'stock':
      return US_STOCK_SCHEDULE
    case 'forex':
      return FOREX_SCHEDULE
    case 'crypto':
      return CRYPTO_SCHEDULE
    default:
      return US_STOCK_SCHEDULE
  }
}

// Check US Stock Market status (NYSE/NASDAQ in Thailand time)
export function isUSStockMarketOpen(date: Date = new Date()): MarketStatus {
  const thaiDayOfWeek = getThailandDayOfWeek(date)
  const { hours, minutes } = getThailandHoursMinutes(date)
  const currentMinutes = hours * 60 + minutes
  const dateStr = getThailandDateString(date)
  
  // US Stock Market is closed on US holidays
  if (isUSHoliday(date)) {
    return {
      isOpen: false,
      message: "ตลาดหุ้นสหรัฐปิด (วันหยุดนักขัตฤกษ์สหรัฐ)",
    }
  }
  
  // Find current session
  const todaysSessions = US_STOCK_SCHEDULE.filter(s => s.dayOfWeek === thaiDayOfWeek && s.isOpen)
  
  for (const session of todaysSessions) {
    const openMinutes = timeToMinutes(session.openTime)
    const closeMinutes = timeToMinutes(session.closeTime)
    
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      // Market is open
      const thaiTime = getThailandTime(date)
      const nextClose = new Date(thaiTime)
      
      // Handle overnight sessions
      if (session.closeTime === "23:59") {
        // This session continues to next day
        const nextDaySessions = US_STOCK_SCHEDULE.filter(
          s => s.dayOfWeek === (thaiDayOfWeek + 1) % 7 && s.isOpen && s.openTime === "00:00"
        )
        if (nextDaySessions.length > 0) {
          nextClose.setDate(nextClose.getDate() + 1)
          nextClose.setHours(4, 0, 0, 0)
        }
      } else {
        nextClose.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0)
      }
      
      return {
        isOpen: true,
        nextClose,
        message: `ตลาดหุ้นสหรัฐเปิด (ปิดเวลา ${session.closeTime === "23:59" ? "04:00" : session.closeTime} น.)`,
        countdown: formatCountdown(nextClose),
      }
    }
  }
  
  // Market is closed - find next opening
  // Check for future sessions today
  const futureSessions = todaysSessions.filter(s => timeToMinutes(s.openTime) > currentMinutes)
  
  if (futureSessions.length > 0) {
    const nextSession = futureSessions[0]
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
      message: `ตลาดหุ้นสหรัฐปิด (เปิดอีกครั้งเวลา ${nextSession.openTime} น.)`,
      countdown: formatCountdown(nextOpen),
    }
  }
  
  // Find next open day
  let daysToAdd = 1
  let nextOpenDate = new Date(date)
  nextOpenDate.setDate(nextOpenDate.getDate() + 1)
  
  while (daysToAdd <= 10) {
    const nextDayOfWeek = getThailandDayOfWeek(nextOpenDate)
    const nextDateStr = getThailandDateString(nextOpenDate)
    
    if (!isUSHoliday(nextOpenDate)) {
      const nextDaySessions = US_STOCK_SCHEDULE.filter(
        s => s.dayOfWeek === nextDayOfWeek && s.isOpen
      ).sort((a, b) => timeToMinutes(a.openTime) - timeToMinutes(b.openTime))
      
      if (nextDaySessions.length > 0) {
        const firstSession = nextDaySessions[0]
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
          message: `ตลาดหุ้นสหรัฐปิด (เปิด ${formattedDate} เวลา ${firstSession.openTime} น.)`,
          countdown: formatCountdown(thaiTime),
        }
      }
    }
    
    nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    daysToAdd++
  }
  
  return {
    isOpen: false,
    message: "ตลาดหุ้นสหรัฐปิด",
  }
}

// Check Forex Market status
export function isForexMarketOpen(date: Date = new Date()): MarketStatus {
  const thaiDayOfWeek = getThailandDayOfWeek(date)
  const { hours, minutes } = getThailandHoursMinutes(date)
  const currentMinutes = hours * 60 + minutes
  
  // Forex is closed Saturday 05:00 - Monday 05:00 (Thailand time)
  const isWeekend = (thaiDayOfWeek === 6 && currentMinutes >= 300) || // Sat after 05:00
                   thaiDayOfWeek === 0 || // Sunday all day
                   (thaiDayOfWeek === 1 && currentMinutes < 300) // Monday before 05:00
  
  if (isWeekend) {
    // Find next Monday 05:00
    let nextOpenDate = new Date(date)
    let daysToAdd = 0
    
    if (thaiDayOfWeek === 6 && currentMinutes >= 300) {
      daysToAdd = 2 // Next Monday
    } else if (thaiDayOfWeek === 0) {
      daysToAdd = 1 // Tomorrow (Monday)
    } else if (thaiDayOfWeek === 1 && currentMinutes < 300) {
      daysToAdd = 0 // Today at 05:00
    }
    
    nextOpenDate.setDate(nextOpenDate.getDate() + daysToAdd)
    const thaiTime = getThailandTime(nextOpenDate)
    thaiTime.setHours(5, 0, 0, 0)
    
    const formattedDate = daysToAdd === 0 ? "วันนี้" : thaiTime.toLocaleDateString('th-TH', {
      weekday: 'long',
    })
    
    return {
      isOpen: false,
      nextOpen: thaiTime,
      message: `ตลาด Forex ปิด (เปิด ${formattedDate} เวลา 05:00 น.)`,
      countdown: formatCountdown(thaiTime),
    }
  }
  
  // Market is open - find when it closes
  // If Saturday before 05:00, closes at 05:00 today
  // Otherwise, closes Saturday 05:00
  let nextCloseDate = new Date(date)
  
  if (thaiDayOfWeek === 6 && currentMinutes < 300) {
    // It's Saturday morning before close
    nextCloseDate.setHours(5, 0, 0, 0)
  } else {
    // Find next Saturday 05:00
    const daysUntilSaturday = 6 - thaiDayOfWeek
    nextCloseDate.setDate(nextCloseDate.getDate() + daysUntilSaturday)
    nextCloseDate.setHours(5, 0, 0, 0)
  }
  
  return {
    isOpen: true,
    nextClose: nextCloseDate,
    message: "ตลาด Forex เปิด 24 ชั่วโมง (ปิดเสาร์ 05:00 น.)",
    countdown: formatCountdown(nextCloseDate),
  }
}

// Check Crypto Market status (always open)
export function isCryptoMarketOpen(date: Date = new Date()): MarketStatus {
  return {
    isOpen: true,
    message: "ตลาด Crypto เปิดตลอด 24/7",
  }
}

// Synthetic Forex Market - 24/7 trading (like Olymp Trade/MT5 Demo)
export function getSyntheticForexMarketStatus(): MarketStatus {
  const now = new Date()
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))

  return {
    isOpen: true,
    message: "ตลาดสังเคราะห์เปิด 24/7 (Synthetic Market)",
    isSynthetic: true,
    timestamp: thailandTime.toISOString(),
  }
}

// Check market status by type
export function getMarketStatus(type: MarketType, date: Date = new Date()): MarketStatus {
  switch (type) {
    case 'stock':
      return isUSStockMarketOpen(date)
    case 'crypto':
      return isCryptoMarketOpen(date)
    case 'forex':
      return isForexMarketOpen(date)
    default:
      return isUSStockMarketOpen(date)
  }
}

// Legacy function for backward compatibility
export function isMarketOpen(
  date: Date = new Date(),
  schedule: MarketSchedule[] = DEFAULT_MARKET_SCHEDULE
): MarketStatus {
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
