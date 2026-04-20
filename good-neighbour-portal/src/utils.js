// --- ONTARIO COMPLIANCE REQUIREMENTS ---
export const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' },
  { key: 'whmis', label: 'WHMIS' },
  { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check (VSC)' },
  { key: 'prc', label: 'Police Record Check (PRC)' },
  { key: 'immunization', label: 'Immunization Records' },
  { key: 'skills', label: 'Skills Verification' },
  { key: 'driverLicense', label: "Driver's License" },
  { key: 'autoInsurance', label: 'Auto Insurance' },
  { key: 'references', label: 'Professional References' }
];

// --- MOCK DATA (FOR DATABASE SEEDING) ---
export const MOCK_EMPLOYEES = [
  { 
    id: 'admin1', name: 'Master Admin', role: 'Administrator', username: 'admin', password: 'admin', phone: '555-0000', email: 'admin@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=0f766e', requirements: {}, timeOffBalances: { sick: 5, vacation: 15 }
  },
  { 
    id: 'emp1', name: 'Alice Smith', role: 'Block Captain', username: 'alice', password: 'password', phone: '555-1001', email: 'alice.s@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&backgroundColor=0f766e',
    requirements: { cpr: { status: 'valid', expiryDate: '2027-01-15' }, vsc: { status: 'valid', expiryDate: '2028-04-10' }, whmis: { status: 'valid' } },
    timeOffBalances: { sick: 5, vacation: 10 }
  },
  { 
    id: 'emp2', name: 'Bob Jones', role: 'Neighbour', username: 'bob', password: 'password', phone: '555-1002', email: 'bob.j@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=0f766e',
    requirements: { cpr: { status: 'expired', expiryDate: '2025-12-01' }, maskFit: { status: 'missing' } }, timeOffBalances: { sick: 5, vacation: 10 }
  },
  { 
    id: 'emp3', name: 'Charlie Davis', role: 'Neighbour', username: 'charlie', password: 'password', phone: '555-1003', email: 'charlie.d@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=0f766e',
    requirements: { vsc: { status: 'pending' } }, timeOffBalances: { sick: 5, vacation: 10 }
  },
];

export const MOCK_CLIENTS = [
  { id: 'client1', name: 'Eleanor Vance', notes: 'Needs mobility assistance. Please ensure all rugs are flat and walkways are clear.', emergencyContactName: 'Robert Vance (Son)', emergencyContactPhone: '555-0101', photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleanor&backgroundColor=0d9488', monthlyAllowance: 100 },
  { id: 'client2', name: 'John Miller', notes: 'Dementia care. Requires patience and gentle redirection.', emergencyContactName: 'Sarah Miller (Wife)', emergencyContactPhone: '555-0202', photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John&backgroundColor=0d9488', monthlyAllowance: 50 },
  { id: 'client3', name: 'Mary Johnson', notes: 'Companionship and light housekeeping. Hard of hearing in left ear.', emergencyContactName: 'David Johnson (Brother)', emergencyContactPhone: '555-0303', photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary&backgroundColor=0d9488', monthlyAllowance: 150 },
];

export const INITIAL_SHIFTS = [
  { id: 'shift_101', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_102', employeeId: 'emp1', clientId: 'client3', date: '2026-04-12', startTime: '09:00', endTime: '17:00' },
  { id: 'shift_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-15', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_2', employeeId: 'emp2', clientId: 'client2', date: '2026-04-15', startTime: '14:00', endTime: '22:00' },
  { id: 'shift_3', employeeId: 'emp3', clientId: 'client3', date: '2026-04-16', startTime: '09:00', endTime: '17:00' },
  { id: 'shift_4', employeeId: 'emp1', clientId: 'client1', date: '2026-04-18', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_5', employeeId: 'emp2', clientId: 'client2', date: '2026-04-20', startTime: '22:00', endTime: '06:00' },
];

export const INITIAL_EXPENSES = [
  { id: 'exp_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', kilometers: 15, description: 'Drove Eleanor to the grocery store and pharmacy.', status: 'approved' },
  { id: 'exp_2', employeeId: 'emp2', clientId: 'client2', date: '2026-04-15', kilometers: 8, description: 'Took John out for a park outing and fresh air.', status: 'pending' },
];

export const INITIAL_CLIENT_EXPENSES = [
  { id: 'ce_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', amount: 8.50, description: 'Coffee and a muffin at the cafe.', receiptDetails: 'cafe_receipt.jpg', status: 'approved' },
];

export const INITIAL_PAYSTUBS = [
  { id: 'ps_1', employeeId: 'emp1', date: '2026-03-31', fileName: 'paystub_mar31_2026.pdf' },
];

export const INITIAL_TIME_OFF = [
  { id: 'to_1', employeeId: 'emp2', type: 'sick', date: '2026-04-05', note: 'Flu' }
];

export const INITIAL_MESSAGES = [
  { id: 'msg_1', senderId: 'admin1', text: 'Welcome to the Good Neighbour Portal! Please ensure all client notes are read before arriving for your shift.', date: '2026-04-01T09:00:00Z' },
  { id: 'msg_2', senderId: 'emp1', text: 'Reminder: Team touch-base meeting this Friday at 4 PM via Zoom. Check your emails for the link. See you there!', date: '2026-04-10T14:30:00Z' }
];

// ==========================================
// HELPERS
// ==========================================
export const parseLocal = (dateStr) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [cY, cM, cD] = currentDateStr.split('-').map(Number);
  const start = Date.UTC(sY, sM - 1, sD);
  const current = Date.UTC(cY, cM - 1, cD);
  const diffDays = (current - start) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays % 14 === 0;
};

export const getPayPeriodBounds = (anchorDateStr) => {
  const now = new Date();
  const anchor = parseLocal(anchorDateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const utcAnchor = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  
  if (utcToday < utcAnchor) {
    const end = new Date(anchor);
    end.setDate(end.getDate() + 13);
    return { start: anchor, end };
  }
  
  const diffDays = Math.floor((utcToday - utcAnchor) / (1000 * 60 * 60 * 24));
  const cycles = Math.floor(diffDays / 14);
  const periodStart = new Date(anchor);
  periodStart.setDate(periodStart.getDate() + (cycles * 14));
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 13);
  return { start: periodStart, end: periodEnd };
};

export const getPastPayPeriods = (anchorDateStr, numPeriods = 104) => {
  const { start: currentStart, end: currentEnd } = getPayPeriodBounds(anchorDateStr);
  const periods = [{ start: currentStart, end: currentEnd, isCurrent: true }];
  let prevStart = new Date(currentStart);
  for (let i = 1; i <= numPeriods; i++) {
    prevStart.setDate(prevStart.getDate() - 14);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + 13);
    periods.push({ start: new Date(prevStart), end: new Date(prevEnd), isCurrent: false });
  }
  return periods;
};

export const getOntarioHolidays = (year) => {
  const holidays = [];
  holidays.push({ date: `${year}-01-01`, name: "New Year's Day" });
  const feb1 = new Date(year, 1, 1);
  let famOffset = 1 - feb1.getDay();
  if (famOffset < 0) famOffset += 7;
  const famDate = 1 + famOffset + 14;
  holidays.push({ date: `${year}-02-${String(famDate).padStart(2, '0')}`, name: "Family Day" });
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
  const month = Math.floor(n / 31) - 1, day = (n % 31) + 1;
  const easter = new Date(year, month, day);
  easter.setDate(easter.getDate() - 2); 
  holidays.push({ date: `${year}-${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`, name: "Good Friday" });
  const may25 = new Date(year, 4, 25);
  let vicOffset = may25.getDay() - 1;
  if (vicOffset <= 0) vicOffset += 7;
  const vicDate = 25 - vicOffset;
  holidays.push({ date: `${year}-05-${String(vicDate).padStart(2, '0')}`, name: "Victoria Day" });
  holidays.push({ date: `${year}-07-01`, name: "Canada Day" });
  const sep1 = new Date(year, 8, 1);
  let labOffset = 1 - sep1.getDay();
  if (labOffset < 0) labOffset += 7;
  const labDate = 1 + labOffset;
  holidays.push({ date: `${year}-09-${String(labDate).padStart(2, '0')}`, name: "Labour Day" });
  const oct1 = new Date(year, 9, 1);
  let thanksOffset = 1 - oct1.getDay();
  if (thanksOffset < 0) thanksOffset += 7;
  const thanksDate = 1 + thanksOffset + 7;
  holidays.push({ date: `${year}-10-${String(thanksDate).padStart(2, '0')}`, name: "Thanksgiving" });
  holidays.push({ date: `${year}-12-25`, name: "Christmas Day" });
  holidays.push({ date: `${year}-12-26`, name: "Boxing Day" });
  return holidays;
};

const CACHED_HOLIDAYS = {};
export const getHoliday = (dateStr) => {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0], 10);
  if (!CACHED_HOLIDAYS[year]) {
    CACHED_HOLIDAYS[year] = getOntarioHolidays(year);
  }
  return CACHED_HOLIDAYS[year].find(h => h.date === dateStr);
};