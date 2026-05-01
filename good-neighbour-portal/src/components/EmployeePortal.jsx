import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight, CalendarDays, Trash2, Heart, Coins, Star, Car, Receipt, AlertCircle, Phone, FileText, Info, Wallet, Image as ImageIcon, Mail, MapPin, UserMinus, Download, TrendingUp, Trophy, Medal, Award, Activity, BookOpen, Camera, Loader2, Upload, Filter, Sun, CheckCircle, XCircle } from 'lucide-react';
import Announcements from './Announcements';
import DocumentManager from './DocumentManager';

// ==========================================
// INLINE HELPERS
// ==========================================
const parseLocalSafe = (dateStr) => {
  try {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'number') return new Date(dateStr);
    if (typeof dateStr === 'object') {
      if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
      if (typeof dateStr.toDate === 'function') return dateStr.toDate();
      if (typeof dateStr.seconds === 'number') return new Date(dateStr.seconds * 1000);
      return new Date();
    }
    const str = String(dateStr);
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) { 
    return new Date(); 
  }
};

const safeSortByDateDesc = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  try { 
    return [...arr].filter(Boolean).sort((a, b) => parseLocalSafe(b.date).getTime() - parseLocalSafe(a.date).getTime()); 
  } catch (e) { 
    return []; 
  }
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

const safeShiftsSort = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...arr].filter(Boolean).sort((a, b) => {
    const dA = a.date && a.startTime ? new Date(`${a.date}T${a.startTime}`).getTime() : 0;
    const dB = b.date && b.startTime ? new Date(`${b.date}T${b.startTime}`).getTime() : 0;
    return (isNaN(dA) ? 0 : dA) - (isNaN(dB) ? 0 : dB);
  });
};

const getHoliday = (dateStr) => {
  const holidays = { 
    '2026-01-01': { name: 'New Year\'s Day' }, 
    '2026-02-16': { name: 'Family Day' }, 
    '2026-04-03': { name: 'Good Friday' }, 
    '2026-05-18': { name: 'Victoria Day' }, 
    '2026-07-01': { name: 'Canada Day' }, 
    '2026-08-03': { name: 'Civic Holiday' }, 
    '2026-09-07': { name: 'Labour Day' }, 
    '2026-10-12': { name: 'Thanksgiving Day' }, 
    '2026-12-25': { name: 'Christmas Day' }, 
    '2026-12-26': { name: 'Boxing Day' } 
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
  
  let shiftEarnings = 0; 
  let totalHours = 0;
  
  if (emp.payType === 'salary') {
    shiftEarnings = (Number(emp.annualSalary) || 0) / 12; // Approximation for leaderboard
  } else if (emp.payType === 'hourly') {
    empShifts.forEach(s => {
      const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
      const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
      if(!isNaN(sH) && !isNaN(eH)) { 
        let h = (eH + eM/60) - (sH + sM/60); 
        if (h < 0) h += 24; 
        totalHours += h; 
      }
    });
    shiftEarnings = totalHours * (Number(emp.hourlyWage) || 22.5);
  } else { 
    shiftEarnings = empShifts.length * (Number(emp.perVisitRate) || 45); 
  }
  
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
  return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total).slice(0, 3);
};

// ==========================================
// SUB-COMPONENTS
// ==========================================
export function AwardsLeaderboard({ employees, shifts, expenses, clientExpenses, isBonusActive, bonusSettings }) {
  const now = new Date();
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  const currentLeaderboard = useMemo(() => getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, employees), [shifts, expenses, clientExpenses, employees, now]);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const annualStandings = useMemo(() => {
    if(!Array.isArray(employees)) return []; 
    const scores = {}; 
    employees.forEach(e => { 
      if(e && e.id) scores[e.id] = { emp: e, gold: 0, silver: 0, bronze: 0, totalScore: 0, monthsWon: [] }; 
    });
    
    for (let m = 0; m <= now.getMonth(); m++) {
      const lb = getMonthlyLeaderboard(now.getFullYear(), m, shifts, expenses, clientExpenses, employees);
      if (lb[0] && scores[lb[0].emp.id]) { 
        scores[lb[0].emp.id].gold++; 
        scores[lb[0].emp.id].totalScore += 3; 
        scores[lb[0].emp.id].monthsWon.push(monthNames[m]); 
      }
      if (lb[1] && scores[lb[1].emp.id]) { 
        scores[lb[1].emp.id].silver++; 
        scores[lb[1].emp.id].totalScore += 2; 
        scores[lb[1].emp.id].monthsWon.push(monthNames[m]); 
      }
      if (lb[2] && scores[lb[2].emp.id]) { 
        scores[lb[2].emp.id].bronze++; 
        scores[lb[2].emp.id].totalScore += 1; 
        scores[lb[2].emp.id].monthsWon.push(monthNames[m]); 
      }
    }
    return Object.values(scores).filter(s => s.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);
  }, [shifts, expenses, clientExpenses, employees, now]);

  if (!isBonusActive) return (
    <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
      <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-slate-600">Bonus System Inactive</h3>
    </div>
  );

  const badgeIcons = [<Trophy className="h-10 w-10 mb-3" />, <Medal className="h-10 w-10 mb-3" />, <Award className="h-10 w-10 mb-3" />];
  const colors = ["bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400", "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400", "bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700"];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={200} /></div>
        <h2 className="text-2xl font-bold mb-2 relative z-10 flex items-center">
          <Star className="mr-2 h-6 w-6 text-yellow-300" fill="currentColor"/> {String(now.toLocaleString('default', { month: 'long' }))} Leaderboard
        </h2>
        <p className="text-teal-100 mb-6 relative z-10 text-sm">Top 3 earners with 10+ shifts qualify for monthly cash bonuses!</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          {currentLeaderboard.map((winner, index) => (
            <div key={winner.emp.id} className={`${colors[index]} rounded-xl p-4 shadow-md flex flex-col items-center text-center transform hover:-translate-y-1 transition duration-300`}>
              {badgeIcons[index]}
              <div className="font-bold text-lg leading-tight">{String(winner.emp.name || 'Unknown')}</div>
              <div className="text-sm font-semibold opacity-90 mb-3">{index + 1}{index===0?'st':index===1?'nd':'rd'} Place</div>
              <div className="mt-auto bg-black/20 rounded-full px-4 py-1.5 font-bold text-sm shadow-sm flex items-center">+${Number(safeBonusSettings.monthly[index] || 0).toFixed(0)} Bonus</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Trophy className="h-5 w-5 mr-2 text-yellow-500" /> Annual Trophy Standings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold text-center">Golds (3pt)</th>
                <th className="px-6 py-3 font-semibold text-center">Silvers (2pt)</th>
                <th className="px-6 py-3 font-semibold text-center">Bronzes (1pt)</th>
                <th className="px-6 py-3 font-semibold">Months Awarded</th>
                <th className="px-6 py-3 font-semibold text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {annualStandings.map((s, idx) => (
                <tr key={s.emp.id} className={idx < 3 ? 'bg-yellow-50/30 hover:bg-yellow-50' : 'hover:bg-slate-50 transition'}>
                  <td className="px-6 py-4 font-bold text-slate-800 flex items-center">
                    {idx === 0 && <Trophy className="h-4 w-4 mr-2 text-yellow-500"/>}
                    {idx === 1 && <Medal className="h-4 w-4 mr-2 text-slate-400"/>}
                    {idx === 2 && <Award className="h-4 w-4 mr-2 text-amber-600"/>}
                    {idx > 2 && <span className="w-6 font-normal text-slate-400 text-xs">{idx+1}.</span>}
                    {String(s.emp.name)}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-yellow-600">{s.gold}</td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-500">{s.silver}</td>
                  <td className="px-6 py-4 text-center font-semibold text-amber-700">{s.bronze}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600 max-w-[150px] truncate" title={s.monthsWon.join(', ')}>{s.monthsWon.join(', ') || '-'}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">{s.totalScore} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    return shiftEnd <= now && parseLocalSafe(s.date) >= periodBounds.start && parseLocalSafe(s.date) <= periodBounds.end;
  });

  let shiftEarnings = 0;
  if (currentUser.payType === 'salary') {
    shiftEarnings = (Number(currentUser.annualSalary) || 0) / 26; // Bi-weekly salary split
  } else if (currentUser.payType === 'hourly') {
    let hrs = 0; 
    completedShifts.forEach(s => { 
      const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
      const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number); 
      if(!isNaN(sH) && !isNaN(eH)) { 
        let h = (eH + eM/60) - (sH + sM/60); 
        if (h < 0) h += 24; 
        hrs += h; 
      } 
    });
    shiftEarnings = hrs * (Number(currentUser.hourlyWage) || 22.50);
  } else { 
    shiftEarnings = completedShifts.length * (Number(currentUser.perVisitRate) || 45); 
  }

  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oopEarnings = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
      <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={150} /></div>
      <div className="relative z-10">
        <h3 className="text-slate-300 font-medium text-sm flex items-center mb-1">
          <Activity className="h-4 w-4 mr-1.5 text-emerald-400" /> Live Pay Tracker
        </h3>
        <div className="text-xs text-slate-400 mb-6">
          Period: {periodBounds.start.toLocaleDateString()} - {periodBounds.end.toLocaleDateString()}
        </div>
        <div className="text-4xl font-black text-emerald-400 mb-6 tracking-tight">
          ${totalEarnings.toFixed(2)}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">
              {currentUser.payType === 'salary' ? 'Base Salary (Bi-weekly)' : `Completed Shifts (${completedShifts.length})`}
            </span>
            <span className="font-semibold text-white">${shiftEarnings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">Approved Mileage</span>
            <span className="font-semibold text-white">${kmEarnings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">Approved Expenses</span>
            <span className="font-semibold text-white">${oopEarnings.toFixed(2)}</span>
          </div>
          {isBonusActive && bonusEarnings > 0 && (
            <div className="flex justify-between items-center bg-yellow-500/20 border border-yellow-500/30 p-2 rounded mt-2">
              <span className="text-sm text-yellow-300 flex items-center">
                <Star className="h-3 w-3 mr-1" fill="currentColor"/> Projected Bonus
              </span>
              <span className="font-bold text-yellow-400">+${bonusEarnings.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmployeeMileageLog({ myExpenses = [], clients = [], onAddExpense, getClientRemainingBalance }) {
  const [date, setDate] = useState(''); 
  const [clientId, setClientId] = useState(''); 
  const [kilometers, setKilometers] = useState(''); 
  const [description, setDescription] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); 
  
  const safeExpenses = Array.isArray(myExpenses) ? myExpenses : []; 
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (!date || !clientId || !kilometers) return; 
    if (onAddExpense) onAddExpense({ date, clientId, kilometers: Number(kilometers), description }); 
    setDate(''); setClientId(''); setKilometers(''); setDescription(''); 
  };
  
  const displayExpenses = safeSortByDateDesc(safeExpenses).filter(exp => { 
    if (!filterMonth) return true; 
    return exp.date && exp.date.startsWith(filterMonth); 
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /> Mileage Log</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Client *</label>
              <select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" required>
                <option value="" disabled>Select client</option>
                {safeClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kilometers *</label>
              <input type="number" min="0.1" max="15" step="0.1" value={kilometers} onChange={(e)=>setKilometers(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" placeholder="e.g. Park trip" />
            </div>
          </div>
          <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 transition text-sm flex items-center justify-center">
            <Plus className="h-4 w-4 mr-1"/> Submit Log
          </button>
        </form>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {displayExpenses.map(exp => (
          <div key={exp.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
            <div>
              <div className="font-semibold text-sm text-slate-800">{parseLocalSafe(exp.date).toLocaleDateString()}</div>
              <div className="text-xs text-slate-500 mt-0.5">{exp.kilometers} km &bull; {safeClients.find(c => c.id === exp.clientId)?.name}</div>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmployeeClientExpenseLog({ myClientExpenses = [], clients = [], onAddClientExpense }) {
  const [date, setDate] = useState(''); 
  const [clientId, setClientId] = useState(''); 
  const [amount, setAmount] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [receiptFile, setReceiptFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (!date || !amount || !clientId) return; 
    setIsUploading(true); 
    if(onAddClientExpense) { 
      await onAddClientExpense({ date, clientId, amount: Number(amount), description }, receiptFile); 
    } 
    setDate(''); setClientId(''); setAmount(''); setDescription(''); setReceiptFile(null); setIsUploading(false); 
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /> Client Expenses</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" required disabled={isUploading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Client *</label>
              <select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" required disabled={isUploading}>
                <option value="" disabled>Select Client</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount ($) *</label>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" required disabled={isUploading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" disabled={isUploading} />
            </div>
          </div>
          <button type="submit" disabled={isUploading} className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 disabled:bg-slate-400 transition text-sm flex items-center justify-center">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

// --- NEW: UPDATED PAYSTUB MANAGER WITH TARGET _BLANK AND YEAR SORTING ---
export function EmployeePaystubs({ myPaystubs = [] }) {
  const safePaystubs = Array.isArray(myPaystubs) ? myPaystubs : [];
  
  const availableYears = useMemo(() => {
    const years = safePaystubs.map(p => p.date ? parseLocalSafe(p.date).getFullYear() : new Date().getFullYear());
    return [...new Set(years)].sort((a,b) => b - a);
  }, [safePaystubs]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]?.toString() || new Date().getFullYear().toString());

  const filteredStubs = safePaystubs.filter(ps => {
    if (!ps.date) return false;
    return parseLocalSafe(ps.date).getFullYear().toString() === selectedYear;
  });
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-teal-600" /> My Paystubs
        </h2>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border border-slate-300 rounded text-sm px-2 py-1 text-slate-700">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="p-6">
        {filteredStubs.length === 0 ? (
          <div className="text-center text-slate-500 py-4">No paystubs found for {selectedYear}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStubs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ps => (
              <div key={ps.id} className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-teal-400 transition cursor-pointer group bg-slate-50">
                <FileText className="h-8 w-8 text-teal-600 mr-3 opacity-70 group-hover:opacity-100 transition shrink-0" />
                <div className="flex-1 overflow-hidden pr-2">
                  <div className="font-semibold text-slate-800 text-sm">{parseLocalSafe(ps.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                  <div className="text-xs text-slate-500 truncate w-full" title={ps.fileName}>{ps.fileName}</div>
                </div>
                {/* SAFELY OPENS IN NEW TAB */}
                <a 
                  href={ps.fileUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-teal-600 hover:bg-teal-50 p-2 rounded transition inline-flex shrink-0 ml-auto"
                >
                  <Download className="h-5 w-5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], documents = [], onSendMessage, payPeriodStart, onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile, onEmployeeFileUpload, onAddTimeOff }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Notification States
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [hasNewSchedule, setHasNewSchedule] = useState(false);
  
  const [toStartDate, setToStartDate] = useState(''); 
  const [toEndDate, setToEndDate] = useState(''); 
  const [toType, setToType] = useState('sick'); 
  const [toNote, setToNote] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  
  const liveEmployee = employees.find(e => e && e.id === currentUser.id) || currentUser;
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const openShifts = safeShifts.filter(s => s && s.employeeId === 'unassigned');
  
  const now = new Date();
  const upcomingShifts = safeShiftsSort(myShifts.filter(s => s && s.date && s.endTime && new Date(`${s.date}T${s.endTime}`) > now));
  const nextShift = upcomingShifts[0];

  // Feed Ping Logic
  useEffect(() => {
    if (activeTab === 'announcements') { 
      localStorage.setItem('gn_feed_last_read', Date.now().toString()); 
      setHasNewFeed(false); 
    } else { 
      const lastRead = Number(localStorage.getItem('gn_feed_last_read') || 0); 
      setHasNewFeed(safeMessages.some(m => new Date(m.date).getTime() > lastRead)); 
    }
  }, [safeMessages, activeTab]);

  // Schedule Ping Logic
  useEffect(() => {
    if (activeTab === 'schedule' || activeTab === 'timeoff') { 
      localStorage.setItem('gn_schedule_hash', myShifts.length.toString() + safeTimeOffLogs.length.toString()); 
      setHasNewSchedule(false); 
    } else { 
      const lastHash = localStorage.getItem('gn_schedule_hash'); 
      const currentHash = myShifts.length.toString() + safeTimeOffLogs.length.toString();
      if (lastHash && lastHash !== currentHash) setHasNewSchedule(true);
    }
  }, [myShifts.length, safeTimeOffLogs.length, activeTab]);

  const handleTimeOffSubmit = (e) => { 
    e.preventDefault(); 
    if (onAddTimeOff) {
      onAddTimeOff({ 
        id: `to_${Date.now()}`, 
        employeeId: currentUser.id, 
        startDate: toStartDate, 
        endDate: toEndDate, 
        type: toType, 
        note: toNote 
      }); 
    }
    setToStartDate(''); setToEndDate(''); setToNote(''); 
  };

  // --- NEW: AUTOMATED SHIFT CANCELLATION REQUEST ---
  const handleRequestCancellation = (shift) => {
    const client = clients.find(c => c.id === shift.clientId);
    if(window.confirm(`Are you sure you want to request cancellation for your shift with ${client?.name} on ${parseLocalSafe(shift.date).toLocaleDateString()}?`)) {
      onSendMessage(`🚨 CANCELLATION REQUEST: I need to cancel my shift with ${client?.name} on ${parseLocalSafe(shift.date).toLocaleDateString()} from ${shift.startTime}-${shift.endTime}. Please remove me from this shift and reassign it.`, currentUser.id);
      alert("Your cancellation request has been posted to the Team Feed for an Administrator to approve.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-4 border-teal-50 overflow-hidden mb-4">
              {liveEmployee.photoUrl && !liveEmployee.photoUrl.includes('dicebear') ? (
                <img src={liveEmployee.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10" />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{String(currentUser.name)}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
              <span className="text-xs font-semibold text-slate-500">
                {currentUser.payType === 'salary' ? 'Salaried' : currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}
              </span>
            </div>
          </div>

          <EmployeePayTracker 
            currentUser={currentUser} 
            shifts={shifts} 
            expenses={expenses} 
            clientExpenses={clientExpenses} 
            payPeriodStart={payPeriodStart} 
            isBonusActive={isBonusActive} 
            employees={employees} 
            bonusSettings={bonusSettings} 
          />
          
          {nextShift && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-teal-600" />
                <h2 className="text-lg font-semibold text-slate-800">Next Shift</h2>
              </div>
              <div className="p-6 space-y-4 text-slate-700">
                <div className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-3 text-slate-400" />
                  <span className="font-medium">{parseLocalSafe(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-slate-400" />
                  <span className="font-medium">{nextShift.startTime} - {nextShift.endTime}</span>
                </div>
                <button onClick={() => setSelectedClient(clients.find(c => c && c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded transition text-sm flex items-center justify-center">
                  <Info className="h-4 w-4 mr-2" /> View Client Plan
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              {/* SCHEDULE PING DOT */}
              <button onClick={() => setActiveTab('schedule')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                My Schedule {hasNewSchedule && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>}
              </button>
              <button onClick={() => setActiveTab('timeoff')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'timeoff' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Time Off
              </button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Logs & Expenses
              </button>
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Paystubs
              </button>
              
              {/* FEED PING DOT */}
              <button onClick={() => setActiveTab('announcements')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Team Feed {hasNewFeed && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
              </button>
            </div>

            <div className="p-0">
              {activeTab === 'timeoff' && (
                <div className="p-6 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                      <CalendarDays className="h-5 w-5 mr-2 text-teal-600"/> Request Time Off
                    </h3>
                    <form onSubmit={handleTimeOffSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                          <input type="date" value={toStartDate} onChange={(e) => setToStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                          <input type="date" value={toEndDate} onChange={(e) => setToEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                        </div>
                      </div>
                      <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-semibold py-2.5 rounded-md hover:bg-teal-700 flex items-center justify-center">
                        <Plus className="h-4 w-4 mr-2"/> Submit Request
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="p-6">
                  <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                    {upcomingShifts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>
                    ) : (
                      upcomingShifts.map(shift => {
                        const client = clients.find(c => c.id === shift.clientId);
                        const d = parseLocalSafe(shift.date);
                        return (
                          <div key={shift.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start space-x-4">
                              <div className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px]">
                                <div className="text-xs font-bold text-teal-600 uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                                <div className="text-xl font-extrabold text-teal-800">{d.getDate()}</div>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{client?.name || 'Unknown Client'}</h4>
                                <div className="text-sm text-slate-600 flex items-center mt-1">
                                  <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2 w-full sm:w-auto">
                              <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 bg-white hover:bg-teal-50 px-3 py-1.5 rounded transition text-center w-full">
                                Care Plan
                              </button>
                              {/* NEW: CANCELLATION REQUEST BUTTON */}
                              <button onClick={() => handleRequestCancellation(shift)} className="text-xs font-medium text-slate-400 hover:text-red-500 hover:underline text-center w-full">
                                Request Cancellation
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'paystubs' && <EmployeePaystubs myPaystubs={myPaystubs} />}
              {activeTab === 'announcements' && <Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
