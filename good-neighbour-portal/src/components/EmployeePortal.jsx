import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight, CalendarDays, Trash2, Heart, Coins, Star, Car, Receipt, AlertCircle, Phone, FileText, Info, Wallet, Image as ImageIcon, Mail, MapPin, UserMinus, Download, TrendingUp, Trophy, Medal, Award, Activity, BookOpen, Camera, Sun, Moon, TreePine, Sailboat, Cloud, Zap } from 'lucide-react';
import Announcements from './Announcements';
import DocumentManager from './DocumentManager';

const CaptainHatIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10c-1-4 1-6 6-6s7 2 6 6" />
    <path d="M2 14c0-2.5 2-4 5-4h10c3 0 5 1.5 5 4 0 2-4 3-10 3S2 16.5 2 14z" />
    <circle cx="12" cy="10" r="1.5" />
  </svg>
);

const SafeAvatar = ({ url, name, role, className }) => {
  const [imgError, setImgError] = React.useState(false);
  
  let cleanUrl = url || '';
  if (cleanUrl.startsWith('[')) {
    const match = cleanUrl.match(/\]\((.*?)\)/);
    if (match && match[1]) cleanUrl = match[1];
  }

  const ICONS = ['Star', 'Sun', 'Moon', 'TreePine', 'Sailboat', 'Cloud', 'Zap'];
  const iconIndex = name ? name.length % ICONS.length : 0;
  const iconName = ICONS[iconIndex];

  const renderIcon = () => {
    if (String(role).includes('Admin')) return <CaptainHatIcon className={className} />;
    if (iconName === 'Star') return <Star className={className} fill="currentColor" />;
    if (iconName === 'Sun') return <Sun className={className} />;
    if (iconName === 'Moon') return <Moon className={className} />;
    if (iconName === 'TreePine') return <TreePine className={className} />;
    if (iconName === 'Sailboat') return <Sailboat className={className} />;
    if (iconName === 'Cloud') return <Cloud className={className} />;
    if (iconName === 'Zap') return <Zap className={className} fill="currentColor" />;
    return <User className={className} />;
  };

  if (!cleanUrl || imgError || cleanUrl.includes('dicebear.com')) return renderIcon();
  return <img src={cleanUrl} alt={name || 'Avatar'} className={`h-full w-full object-cover bg-white ${className}`} onError={() => setImgError(true)} />;
};

const parseLocalSafe = (dateStr) => {
  try {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'number') return new Date(dateStr);
    const parts = String(dateStr).split('-');
    if (parts.length === 3) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return new Date();
  } catch (e) { return new Date(); }
};

const safeSortByDateDesc = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  try {
    return [...arr].filter(Boolean).sort((a, b) => parseLocalSafe(b.date).getTime() - parseLocalSafe(a.date).getTime());
  } catch (e) { return []; }
};

const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = String(startDateStr).split('-').map(Number);
  const [cY, cM, cD] = String(currentDateStr).split('-').map(Number);
  if(isNaN(sY) || isNaN(cY)) return false;
  const diffDays = (Date.UTC(cY, cM - 1, cD) - Date.UTC(sY, sM - 1, sD)) / 86400000;
  return diffDays > 0 && diffDays % 14 === 0;
};

const getPayPeriodBounds = (anchorDateStr) => {
  const now = new Date();
  const anchor = parseLocalSafe(anchorDateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < anchor) return { start: anchor, end: new Date(anchor.getTime() + 13 * 86400000) };
  const diffDays = Math.floor((today - anchor) / 86400000);
  const cycles = Math.floor(diffDays / 14);
  const start = new Date(anchor.getTime() + cycles * 14 * 86400000);
  return { start, end: new Date(start.getTime() + 13 * 86400000) };
};

const getHoliday = (dateStr) => {
  const holidays = {
    '2026-01-01': { name: 'New Year\'s Day' }, '2026-02-16': { name: 'Family Day' }, '2026-04-03': { name: 'Good Friday' },
    '2026-05-18': { name: 'Victoria Day' }, '2026-07-01': { name: 'Canada Day' }, '2026-08-03': { name: 'Civic Holiday' },
    '2026-09-07': { name: 'Labour Day' }, '2026-10-12': { name: 'Thanksgiving Day' }, '2026-12-25': { name: 'Christmas Day' }, '2026-12-26': { name: 'Boxing Day' }
  };
  return holidays[String(dateStr)] || null;
};

const calculateEarnings = (emp, start, end, shifts, expenses, clientExpenses) => {
  if(!emp || !Array.isArray(shifts)) return { shiftCount: 0, totalHours: 0, shiftEarnings: 0, kmEarnings: 0, oop: 0, total: 0 };
  const empShifts = shifts.filter(s => {
    if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
    const shiftDate = new Date(`${s.date}T${s.endTime}`);
    if (isNaN(shiftDate.getTime())) return false;
    return shiftDate >= start && shiftDate <= end && shiftDate <= new Date();
  });
  let shiftEarnings = 0; let totalHours = 0;
  const isHourly = emp.payType === 'hourly';
  empShifts.forEach(s => {
    const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number);
    const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
    if(!isNaN(sH) && !isNaN(eH)) { let h = (eH + eM/60) - (sH + sM/60); if (h < 0) h += 24; totalHours += h; }
  });
  shiftEarnings = isHourly ? (totalHours * (Number(emp.hourlyWage) || 22.5)) : (empShifts.length * (Number(emp.perVisitRate) || 45));
  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oop = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return { shiftCount: empShifts.length, totalHours, shiftEarnings, kmEarnings, oop, total: shiftEarnings + kmEarnings + oop };
};

const getMonthlyLeaderboard = (year, month, shifts, expenses, clientExpenses, employees) => {
  if(!Array.isArray(employees)) return [];
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  let results = employees.map(emp => {
    const data = calculateEarnings(emp, start, end, shifts, expenses, clientExpenses);
    return { emp, ...data };
  });
  results = results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total);
  return results.slice(0, 3);
};

export function AwardsLeaderboard({ employees, shifts, expenses, clientExpenses, isBonusActive, bonusSettings }) {
  const now = new Date();
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  const currentLeaderboard = useMemo(() => getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, employees), [shifts, expenses, clientExpenses, employees, now]);
  const annualStandings = useMemo(() => {
    if(!Array.isArray(employees)) return [];
    const scores = {}; employees.forEach(e => { if(e && e.id) scores[e.id] = { emp: e, gold: 0, silver: 0, bronze: 0, totalScore: 0 }; });
    for (let m = 0; m <= now.getMonth(); m++) {
      const lb = getMonthlyLeaderboard(now.getFullYear(), m, shifts, expenses, clientExpenses, employees);
      if (lb[0] && scores[lb[0].emp.id]) { scores[lb[0].emp.id].gold++; scores[lb[0].emp.id].totalScore += 3; }
      if (lb[1] && scores[lb[1].emp.id]) { scores[lb[1].emp.id].silver++; scores[lb[1].emp.id].totalScore += 2; }
      if (lb[2] && scores[lb[2].emp.id]) { scores[lb[2].emp.id].bronze++; scores[lb[2].emp.id].totalScore += 1; }
    }
    return Object.values(scores).filter(s => s.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);
  }, [shifts, expenses, clientExpenses, employees, now]);

  if (!isBonusActive) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-600">Bonus System Inactive</h3>
      </div>
    );
  }

  const badgeIcons = [<Trophy className="h-10 w-10 mb-3" />, <Medal className="h-10 w-10 mb-3" />, <Award className="h-10 w-10 mb-3" />];
  const colors = ["bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400", "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400", "bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700"];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={200} /></div>
        <h2 className="text-2xl font-bold mb-2 relative z-10 flex items-center"><Star className="mr-2 h-6 w-6 text-yellow-300" fill="currentColor"/> {String(now.toLocaleString('default', { month: 'long' }))} Leaderboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          {currentLeaderboard.map((winner, index) => (
            <div key={winner.emp.id || Math.random().toString()} className={`${colors[index]} rounded-xl p-4 shadow-md flex flex-col items-center text-center`}>
              {badgeIcons[index]}<div className="font-bold text-lg">{String(winner.emp.name)}</div><div className="text-sm font-semibold opacity-90 mb-3">{index + 1} Place</div>
              <div className="mt-auto bg-black/20 rounded-full px-4 py-1.5 font-bold text-sm shadow-sm">+${Number(safeBonusSettings.monthly[index] || 0).toFixed(0)} Bonus</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmployeePayTracker({ currentUser, shifts, expenses, clientExpenses, payPeriodStart, isBonusActive, employees, bonusSettings }) {
  const now = new Date();
  const periodBounds = getPayPeriodBounds(payPeriodStart || '2026-04-01');
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  
  const completedShifts = (Array.isArray(shifts) ? shifts : []).filter(s => {
    if (!s || s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
    const shiftEnd = new Date(`${s.date}T${s.endTime}`);
    if (isNaN(shiftEnd.getTime())) return false;
    return shiftEnd <= now && parseLocalSafe(s.date) >= periodBounds.start && parseLocalSafe(s.date) <= periodBounds.end;
  });

  let shiftEarnings = 0;
  if (currentUser.payType === 'hourly') {
    let hrs = 0;
    completedShifts.forEach(s => {
      const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
      if(!isNaN(sH) && !isNaN(eH)) { let h = (eH + eM/60) - (sH + sM/60); if (h < 0) h += 24; hrs += h; }
    });
    shiftEarnings = hrs * (Number(currentUser.hourlyWage) || 22.50);
  } else {
    shiftEarnings = completedShifts.length * (Number(currentUser.perVisitRate) || 45);
  }

  const myPeriodExp = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end);
  const kmEarnings = myPeriodExp.reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);

  const myPeriodCE = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end);
  const oopEarnings = myPeriodCE.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  let bonusEarnings = 0;
  if (isBonusActive && Array.isArray(employees)) {
    const lb = getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, employees);
    if (lb[0]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[0] || 0);
    else if (lb[1]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[1] || 0);
    else if (lb[2]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[2] || 0);
  }

  const totalEarnings = shiftEarnings + kmEarnings + oopEarnings + bonusEarnings;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden mb-6 mt-6">
      <div className="relative z-10">
        <h3 className="text-slate-300 font-medium text-sm flex items-center mb-1"><Activity className="h-4 w-4 mr-1.5 text-emerald-400" /> Live Pay Tracker</h3>
        <div className="text-xs text-slate-400 mb-6">Period: {periodBounds.start.toLocaleDateString()} - {periodBounds.end.toLocaleDateString()}</div>
        <div className="text-4xl font-black text-emerald-400 mb-6 tracking-tight">${totalEarnings.toFixed(2)}</div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-2 rounded"><span className="text-sm text-slate-300">Completed Shifts</span><span className="font-semibold text-white">${shiftEarnings.toFixed(2)}</span></div>
          <div className="flex justify-between items-center bg-white/5 p-2 rounded"><span className="text-sm text-slate-300">Approved Mileage</span><span className="font-semibold text-white">${kmEarnings.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}

export function EmployeeMileageLog({ myExpenses = [], clients = [], onAddExpense, getClientRemainingBalance }) {
  const [date, setDate] = useState(''); const [clientId, setClientId] = useState(''); const [kilometers, setKilometers] = useState(''); const [description, setDescription] = useState('');
  const safeExpenses = Array.isArray(myExpenses) ? myExpenses : []; const safeClients = Array.isArray(clients) ? clients : [];
  const handleSubmit = (e) => { e.preventDefault(); if (!date || !clientId || !kilometers) return; if (onAddExpense) onAddExpense({ date, clientId, kilometers: Number(kilometers), description }); setDate(''); setClientId(''); setKilometers(''); setDescription(''); };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /> Mileage Log</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs mb-1">Date</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full border rounded p-1.5" required /></div>
          <div><label className="block text-xs mb-1">Client</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full border rounded p-1.5 bg-white" required><option value="" disabled>Select Client</option>{safeClients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs mb-1">Kilometers</label><input type="number" min="0.1" step="0.1" value={kilometers} onChange={(e)=>setKilometers(e.target.value)} className="w-full border rounded p-1.5" required /></div>
          <div><label className="block text-xs mb-1">Description</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full border rounded p-1.5" /></div>
        </div>
        <button type="submit" className="w-full bg-teal-600 text-white py-1.5 rounded">Submit</button>
      </form>
    </div>
  );
}

export function EmployeeClientExpenseLog({ myClientExpenses = [], clients = [], onAddClientExpense }) {
  const [date, setDate] = useState(''); const [clientId, setClientId] = useState(''); const [amount, setAmount] = useState(''); const [description, setDescription] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if (!date || !amount || !clientId) return; if(onAddClientExpense) onAddClientExpense({ date, clientId, amount: Number(amount), description }); setDate(''); setClientId(''); setAmount(''); setDescription(''); };
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /> Client Expenses</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs mb-1">Date</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full border rounded p-1.5" required /></div>
          <div><label className="block text-xs mb-1">Client</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full border rounded p-1.5 bg-white" required><option value="" disabled>Select Client</option>{clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs mb-1">Amount</label><input type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full border rounded p-1.5" required /></div>
          <div><label className="block text-xs mb-1">Description</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full border rounded p-1.5" /></div>
        </div>
        <button type="submit" className="w-full bg-teal-600 text-white py-1.5 rounded">Submit</button>
      </form>
    </div>
  );
}

export function EmployeePaystubs({ myPaystubs = [] }) {
  const safePaystubs = Array.isArray(myPaystubs) ? myPaystubs : [];
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold">My Paystubs</h2></div><div className="p-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{safePaystubs.map(ps => (<div key={ps.id} className="border p-4 rounded-lg flex items-center bg-slate-50"><FileText className="mr-3 text-teal-600"/><div><div className="font-semibold">{ps.date}</div></div></div>))}</div></div></div>
  );
}

export default function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], documents = [], onSendMessage, payPeriodStart, onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const myExpenses = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myClientExpenses = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myPaystubs = (Array.isArray(paystubs) ? paystubs : []).filter(p => p && p.employeeId === currentUser.id);
  
  const now = new Date();
  
  const upcomingShifts = safeShifts.filter(s => {
    if (!s || s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
    return new Date(`${s.date}T${s.endTime}`) > now;
  }).sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
  
  const nextShift = upcomingShifts[0];

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file && onUpdateProfile) {
      const photoUrl = URL.createObjectURL(file);
      onUpdateProfile(currentUser.id, { photoUrl });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center text-center">
          <div className="relative mb-4 group">
            <div className="h-24 w-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-4 border-teal-50 shadow-sm overflow-hidden">
              <SafeAvatar url={currentUser.photoUrl} name={currentUser.name} role={currentUser.role} className="h-10 w-10" />
            </div>
            <label className="absolute bottom-0 right-0 bg-teal-600 p-1.5 rounded-full text-white cursor-pointer shadow-md hover:bg-teal-700 transition opacity-80 group-hover:opacity-100">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
            </label>
          </div>
          <h2 className="text-xl font-bold">{currentUser.name}</h2>
          <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full">{currentUser.role}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold flex items-center"><Clock className="h-5 w-5 mr-2 text-teal-600" /> Next Shift</h2></div><div className="p-6">{nextShift ? <div className="space-y-4"><div className="font-medium">{nextShift.date}</div><div>{nextShift.startTime} - {nextShift.endTime}</div><button onClick={() => setSelectedClient(clients.find(c => c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 text-slate-700 font-semibold py-2 rounded text-sm">View Care Plan</button></div> : <div className="text-center text-slate-500">No upcoming shifts.</div>}</div></div>
      </div>
      <div className="md:w-2/3 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'schedule' ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50' : 'text-slate-500 hover:bg-slate-50'}`}>My Schedule</button>
            <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'expenses' ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50' : 'text-slate-500 hover:bg-slate-50'}`}>Logs & Expenses</button>
          </div>
          <div className="p-6">
            {activeTab === 'schedule' && <div><h3 className="font-bold mb-4">My Shifts</h3>{upcomingShifts.map(s => <div key={s.id} className="p-3 border rounded mb-2 flex justify-between"><span>{s.date} | {s.startTime}-{s.endTime}</span></div>)}</div>}
            {activeTab === 'expenses' && <div className="text-center text-slate-500">Expenses module active.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
