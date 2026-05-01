// ============================================================
// Admin Configuration - Fixed/Hardcoded Admin Emails
// ผู้ดูแลระบบถูกกำหนดไว้ล่วงหน้า (ไม่ต้อง login แยก)
// ============================================================

// Hardcoded admin emails - ใส่อีเมลที่จะให้เป็นแอดมินตรงนี้
export const ADMIN_EMAILS = [
  // ใส่อีเมลแอดมินที่นี่ (พิมพ์เล็กทั้งหมด)
  'admin@skytrading.com',
  'komon502@gmail.com',
  'dewstp128@gmail.com',
  // เพิ่มอีเมลที่สมัครไว้ตรงนี้ เช่น:
  // 'your.email@gmail.com',
]

// Check if user is admin (hardcoded only - simple & fast)
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

// ============================================================
// วิธีเพิ่มแอดมินใหม่:
// 1. แก้ไฟล์นี้ เพิ่มอีเมลใน ADMIN_EMAILS
// 2. git add . && git commit -m "Add new admin" && git push
// 3. Vercel จะ redeploy อัตโนมัติ
// ============================================================

// Admin routes (for middleware protection)
export const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/deposits',
  '/admin/trades',
  '/admin/settings',
]

// Check if path is admin route
export function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTES.some(route => path.startsWith(route))
}

// Admin navigation items
export const ADMIN_NAV = [
  { id: 'dashboard', label: 'แดชบอร์ด', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { id: 'users', label: 'ผู้ใช้งาน', href: '/admin/users', icon: 'Users' },
  { id: 'deposits', label: 'การฝากเงิน', href: '/admin/deposits', icon: 'CreditCard' },
  { id: 'trades', label: 'การเทรด', href: '/admin/trades', icon: 'BarChart2' },
  { id: 'settings', label: 'ตั้งค่า', href: '/admin/settings', icon: 'Settings' },
]
