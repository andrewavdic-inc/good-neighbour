import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight, CalendarDays, Trash2, Heart, Coins, Star, Car, Receipt, AlertCircle, Phone, FileText, Info, Wallet, Image as ImageIcon, Mail, MapPin, UserMinus, Download, TrendingUp, Trophy, Medal, Award, Activity, BookOpen, Camera, Loader2, Upload, Filter, Sun, CheckCircle, XCircle, Gift, ExternalLink, PartyPopper } from 'lucide-react';
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

// --- CALCULATE EARNINGS WITH PRIVACY-SAFE "ACTIVITY SCORE" ---
const calculateEarnings = (emp, start, end, shifts, expenses, clientExpenses, kudos = []) => {
  if(!emp || !Array.isArray(shifts)) return { shiftCount: 0, totalHours: 0, shiftEarnings: 0, kmEarnings: 0, oop: 0, activityScore: 0, totalEarnings: 0 };
  
  const empShifts = shifts.filter(s => {
    if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
    const shiftDate = new Date(`${s.date}T${s.endTime}`);
    if (isNaN(shiftDate.getTime())) return false; 
    return shiftDate >= start && shiftDate <= end && shiftDate <= new Date();
  });
  
  let shiftEarnings = 0; 
  let totalHours = 0;
  if (emp.payType === 'salary') {
    shiftEarnings = (Number(emp.annualSalary) || 0) / 12; 
  } else {
    empShifts.forEach(s => {
      // --- NEW ATYPICAL PAY MATH INCORPORATED ---
      if (emp.payType === 'hourly' || s.isHourlyOverride) {
        let hrs = 0;
        if (s.actualStartTime && s.actualEndTime) {
           hrs = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
        } else {
           const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
           const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
           if(!isNaN(sH) && !isNaN(eH)) { 
             let h = (eH + eM/60) - (sH + sM/60); 
             if (h < 0) h += 24; 
             hrs += h; 
           }
        }
        const rate = s.isHourlyOverride ? (Number(s.hourlyRate) || 0) : (Number(emp.hourlyWage) || 22.50);
        shiftEarnings += (hrs * rate);
      } else {
        shiftEarnings += (Number(emp.perVisitRate) || 45); 
      }
    });
  }
  
  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oop = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  let activityScore = 0;
  empShifts.forEach(s => {
    activityScore += 100;
    const hasMileage = expenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
    if (hasMileage) activityScore += 50;
    const hasOop = clientExpenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
    if (hasOop) activityScore += 50;
  });

  const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date) >= start && parseLocalSafe(k.date) <= end);
  const kPoints = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
  activityScore += kPoints;

  return { shiftCount: empShifts.length, totalHours, shiftEarnings, kmEarnings, oop, activityScore, totalEarnings: shiftEarnings + kmEarnings + oop };
};

const getMonthlyLeaderboard = (year, month, shifts, expenses, clientExpenses, employees, kudos) => {
  if(!Array.isArray(employees)) return [];
  const start = new Date(year, month, 1); 
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  let results = employees.map(emp => { 
    const data = calculateEarnings(emp, start, end, shifts, expenses, clientExpenses, kudos); 
    return { emp, ...data }; 
  });
  return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.activityScore - a.activityScore);
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

export function AwardsLeaderboard({ currentUser, employees, shifts, expenses, clientExpenses, kudos = [], prizes = [], isBonusActive, bonusSettings }) {
  const now = new Date();
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  
  const safeEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin' && !e.excludeFromGala);
  }, [employees]);

  const [selectedLeaderboardMonth, setSelectedLeaderboardMonth] = useState(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedPrizeYear, setSelectedPrizeYear] = useState(() => now.getFullYear().toString());
  const [selectedKudosMonth, setSelectedKudosMonth] = useState('All');

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for(let i=0; i<12; i++) {
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  const fullLeaderboard = useMemo(() => {
    const [y, m] = selectedLeaderboardMonth.split('-');
    return getMonthlyLeaderboard(parseInt(y, 10), parseInt(m, 10) - 1, shifts, expenses, clientExpenses, safeEmployees, kudos);
  }, [selectedLeaderboardMonth, shifts, expenses, clientExpenses, safeEmployees, kudos]);

  const currentMonthShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
      const d = parseLocalSafe(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [shifts, currentUser.id, now]);
  
  const shiftProgress = Math.min(currentMonthShifts.length, 10);
  const progressPercent = (shiftProgress / 10) * 100;
  const isQualified = shiftProgress >= 10;

  const currentMonthGalaScore = useMemo(() => {
    let score = 0;
    currentMonthShifts.forEach(sh => {
      score += 100;
      const hasMileage = expenses.some(e => e.employeeId === currentUser.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
      if (hasMileage) score += 50;
      const hasOop = clientExpenses.some(e => e.employeeId === currentUser.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
      if (hasOop) score += 50;
    });

    const thisMonthKudos = kudos.filter(k => k.employeeId === currentUser.id && parseLocalSafe(k.date).getMonth() === now.getMonth() && parseLocalSafe(k.date).getFullYear() === now.getFullYear());
    score += thisMonthKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
    const thisMonthPrizes = prizes.filter(p => p.employeeId === currentUser.id && parseLocalSafe(p.date).getMonth() === now.getMonth() && parseLocalSafe(p.date).getFullYear() === now.getFullYear());
    score += thisMonthPrizes.length * 50;
    return score;
  }, [currentMonthShifts, expenses, clientExpenses, kudos, prizes, currentUser.id, now]);

  const myPrizes = useMemo(() => prizes.filter(p => p.employeeId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date)), [prizes, currentUser.id]);
  const yearOptions = useMemo(() => {
    const years = myPrizes.map(p => parseLocalSafe(p.date).getFullYear());
    years.push(now.getFullYear());
    return [...new Set(years)].sort((a,b) => b - a).map(String);
  }, [myPrizes, now]);
  const filteredPrizes = useMemo(() => myPrizes.filter(p => parseLocalSafe(p.date).getFullYear().toString() === selectedPrizeYear), [myPrizes, selectedPrizeYear]);

  const myKudos = useMemo(() => kudos.filter(k => k.employeeId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date)), [kudos, currentUser.id]);
  const kudosMonthOptions = useMemo(() => {
    const opts = new Set();
    myKudos.forEach(k => {
      const d = parseLocalSafe(k.date);
      opts.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    opts.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const sortedOpts = [...opts].sort().reverse().map(val => {
      const [y, m] = val.split('-');
      const label = new Date(parseInt(y, 10), parseInt(m, 10)-1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { value: val, label };
    });
    return [{ value: 'All', label: 'All Time' }, ...sortedOpts];
  }, [myKudos, now]);
  const filteredKudos = useMemo(() => myKudos.filter(k => {
      if (selectedKudosMonth === 'All') return true;
      const d = parseLocalSafe(k.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return mKey === selectedKudosMonth;
  }), [myKudos, selectedKudosMonth]);

  const annualStandings = useMemo(() => {
    if(safeEmployees.length === 0) return []; 
    const currentYear = now.getFullYear();
    const scores = {}; 
    safeEmployees.forEach(e => { scores[e.id] = { emp: e, baseActivityScore: 0, kudosPts: 0, prizePts: 0, totalGalaScore: 0 }; });

    Object.values(scores).forEach(s => {
      const emp = s.emp;
      let baseScore = 0;
      const empShifts = shifts.filter(sh => {
        if (sh.employeeId !== emp.id || !sh.date || !sh.endTime) return false;
        return new Date(`${sh.date}T${sh.endTime}`).getFullYear() === currentYear;
      });

      empShifts.forEach(sh => {
        baseScore += 100;
        if (expenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved')) baseScore += 50;
        if (clientExpenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved')) baseScore += 50;
      });
      s.baseActivityScore = baseScore;
      const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date).getFullYear() === currentYear);
      s.kudosPts = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
      const empPrizes = prizes.filter(p => p.employeeId === emp.id && parseLocalSafe(p.date).getFullYear() === currentYear);
      s.prizePts = empPrizes.length * 50;
      s.totalGalaScore = s.baseActivityScore + s.kudosPts + s.prizePts;
    });

    return Object.values(scores).filter(s => s.totalGalaScore > 0 || s.emp.id === currentUser.id).sort((a, b) => b.totalGalaScore - a.totalGalaScore);
  }, [shifts, expenses, clientExpenses, safeEmployees, kudos, prizes, now, currentUser.id]);

  if (!isBonusActive) return (
    <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
      <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-slate-600">Bonus System Inactive</h3>
      <p className="text-sm text-slate-500 mt-2">The rewards platform has been paused by administration.</p>
    </div>
  );

  const topThree = fullLeaderboard.slice(0, 3);
  const globalRankings = fullLeaderboard.slice(3);
  const badgeIcons = [<Trophy className="h-10 w-10 mb-3" />, <Medal className="h-10 w-10 mb-3" />, <Award className="h-10 w-10 mb-3" />];
  const colors = ["bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400", "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400", "bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700"];
  const pastTrophies = currentUser?.pastTrophies || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`bg-white rounded-xl shadow-sm border ${isQualified ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'} p-6 flex flex-col justify-center h-full`}>
           <h3 className="font-bold text-slate-800 flex items-center mb-2">
             {isQualified ? <CheckCircle className="h-5 w-5 mr-2 text-emerald-500"/> : <Clock className="h-5 w-5 mr-2 text-slate-400"/>} Leaderboard Qualification
           </h3>
           <p className="text-xs text-slate-500 mb-4">{isQualified ? 'You have qualified for the global rankings!' : 'Complete 10 shifts to enter the global rankings.'}</p>
           <div className="flex items-center w-full">
             <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200">
               <div className={`h-4 rounded-full transition-all duration-1000 ${isQualified ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${progressPercent}%` }}></div>
             </div>
             <div className="ml-4 font-black text-slate-700 w-16 text-right">{shiftProgress} / 10</div>
           </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Star size={120} /></div>
           <div className="w-full sm:w-2/3 shrink-0 relative z-10">
               <h3 className="font-bold text-amber-400 flex items-center text-lg mb-1"><Star className="h-5 w-5 mr-2 fill-current"/> Current Month Progress</h3>
               <p className="text-xs text-slate-400">Your 'Best Neighbour' Gala points earned so far this month.</p>
           </div>
           <div className="w-full sm:w-1/3 flex items-center justify-start sm:justify-end relative z-10">
               <div className="text-4xl font-black text-amber-400">{currentMonthGalaScore} <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">pts</span></div>
           </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={200} /></div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between relative z-10 gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black flex items-center tracking-tight"><Star className="mr-2 h-6 w-6 text-yellow-300" fill="currentColor"/> {monthOptions.find(o => o.value === selectedLeaderboardMonth)?.label || 'Leaderboard'}</h2>
            <p className="text-teal-100 text-sm font-medium mt-1">Activity Scores determine rankings. 100pts per shift. 50pts per mileage/expense log.</p>
          </div>
          <select value={selectedLeaderboardMonth} onChange={(e) => setSelectedLeaderboardMonth(e.target.value)} className="px-3 py-1.5 border border-teal-500 rounded-md bg-teal-800 text-white text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        
        {fullLeaderboard.length === 0 ? (
           <div className="relative z-10 bg-black/10 rounded-xl p-8 text-center border border-white/10"><p className="font-semibold text-teal-50">No one qualified for the leaderboard in this period.</p><p className="text-xs text-teal-200 mt-2">Check back soon!</p></div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topThree.map((winner, index) => (
                <div key={winner.emp.id} className={`${colors[index]} rounded-xl p-4 shadow-md flex flex-col items-center text-center transform hover:-translate-y-1 transition duration-300 relative overflow-hidden`}>
                  {winner.emp.id === currentUser.id && (<div className="absolute top-0 w-full bg-black/20 text-white text-[10px] font-black uppercase tracking-widest py-1">You</div>)}
                  <div className={winner.emp.id === currentUser.id ? 'mt-4' : ''}>{badgeIcons[index]}</div>
                  <div className="font-black text-lg leading-tight">{String(winner.emp.name || 'Unknown')}</div>
                  <div className="text-xs font-bold opacity-80 mb-1">{index + 1}{index===0?'st':index===1?'nd':'rd'} Place</div>
                  <div className="text-sm bg-white/30 px-3 py-1 rounded mb-4 font-bold border border-white/20 shadow-inner">{winner.activityScore} pts</div>
                  <div className="mt-auto bg-black/20 rounded-full px-4 py-1.5 font-bold text-sm shadow-sm flex items-center border border-black/10">+${Number(safeBonusSettings.monthly[index] || 0).toFixed(0)} Bonus</div>
                </div>
              ))}
            </div>
            {globalRankings.length > 0 && (
              <div className="mt-6 bg-black/20 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                <h3 className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-3 pl-2 border-b border-white/10 pb-2">Global Rankings</h3>
                <div className="space-y-2">
                  {globalRankings.map((ranked, idx) => (
                    <div key={ranked.emp.id} className={`flex items-center justify-between p-3 rounded-lg ${ranked.emp.id === currentUser.id ? 'bg-teal-500/40 border border-teal-300/50' : 'bg-black/10 border border-transparent'}`}>
                       <div className="flex items-center"><div className="w-8 text-center font-bold text-teal-100">{idx + 4}</div><div className="font-semibold text-white ml-2">{ranked.emp.name} {ranked.emp.id === currentUser.id && <span className="text-[10px] uppercase tracking-wider bg-white text-teal-800 px-1.5 py-0.5 rounded ml-2">You</span>}</div></div>
                       <div className="font-bold text-teal-50 bg-black/20 px-3 py-1 rounded-full text-sm">{ranked.activityScore} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {pastTrophies.length > 0 && (
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden p-6 relative">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Trophy size={200} /></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-amber-400 flex items-center mb-1"><Award className="h-5 w-5 mr-2" /> Hall of Fame</h2>
            <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest">Your Annual Award Victories</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastTrophies.sort((a,b) => b.year - a.year).map(t => {
                const colorClasses = t.color === 'gold' ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400' : t.color === 'silver' ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400' : 'bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700';
                return (
                  <div key={t.id} className={`${colorClasses} rounded-xl p-5 shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition`}>
                    <Trophy className="h-12 w-12 mb-3 drop-shadow-md" />
                    <div className="font-black text-lg leading-tight drop-shadow-sm">{t.title}</div>
                    <div className="text-sm font-bold opacity-80 mt-1 bg-black/20 px-3 py-1 rounded-full">{t.year} Gala</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-slate-800 flex items-center"><Gift className="h-5 w-5 mr-2 text-purple-600" /> Prize Wallet</h2><p className="text-xs text-slate-500 mt-1 font-medium">Digital gift cards & rewards.</p></div>
            <div className="flex items-center space-x-2"><select value={selectedPrizeYear} onChange={(e) => setSelectedPrizeYear(e.target.value)} className="bg-purple-100 border border-purple-200 text-purple-800 font-bold px-2 py-1 rounded text-xs focus:outline-none">{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto max-h-[400px]">
            {filteredPrizes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-white">No prizes awarded in {selectedPrizeYear}.</div>
            ) : (
              <div className="space-y-4">
                {filteredPrizes.map(p => (
                  <div key={p.id} className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-xl p-5 shadow-md text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10"><Gift size={100} /></div>
                     <div className="relative z-10">
                       <div className="text-xs font-bold text-purple-200 mb-1 uppercase tracking-wider flex justify-between"><span>{p.date}</span><div className="flex items-center">{p.value > 0 && <span className="text-emerald-300 font-black">${Number(p.value).toFixed(2)}</span>}<span className="ml-3 bg-amber-400 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">+50 Gala Pts</span></div></div>
                       <div className="text-xl font-black mt-2 mb-2 leading-tight">{p.name}</div>
                       {p.note && <div className="text-xs bg-black/30 p-2.5 rounded-lg italic border border-white/10 shadow-inner mb-3">"{p.note}"</div>}
                       {p.code && <div className="text-sm font-mono bg-black/40 px-3 py-1.5 rounded mt-2 text-center border border-white/20 font-bold tracking-wider">Code: {p.code}</div>}
                       <div className="flex gap-2 mt-2">
                         {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-white text-purple-900 font-bold py-2 rounded text-xs hover:bg-slate-100 transition shadow-sm"><ExternalLink className="h-3 w-3 mr-1.5"/> Redeem Prize</a>}
                         {p.fileUrl && <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-purple-800 border border-purple-500 text-white font-bold py-2 rounded text-xs hover:bg-purple-700 transition shadow-sm"><FileText className="h-3 w-3 mr-1.5"/> View Attachment</a>}
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-slate-800 flex items-center"><Award className="h-5 w-5 mr-2 text-amber-500" /> My Badges & Kudos</h2><p className="text-xs text-slate-500 mt-1 font-medium">Recognition from administration.</p></div>
            <div className="flex items-center space-x-2"><select value={selectedKudosMonth} onChange={(e) => setSelectedKudosMonth(e.target.value)} className="bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2 py-1 rounded text-xs focus:outline-none max-w-[100px]">{kudosMonthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
          </div>
          <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto max-h-[400px]">
            {filteredKudos.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-white">No badges earned in this period. </div>
            ) : (
              <div className="space-y-4">
                {filteredKudos.map(k => (
                  <div key={k.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-start space-x-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                    <div className="text-4xl bg-amber-50 h-14 w-14 rounded-full flex items-center justify-center shrink-0 border border-amber-100 shadow-inner">{k.badgeIcon}</div>
                    <div className="flex-1 pr-12"><div className="font-bold text-slate-800">{k.badgeLabel}</div><div className="text-xs text-slate-500 mb-2">{k.date}</div><div className="text-sm text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">"{k.message}"</div></div>
                    <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 font-black px-2 py-1 rounded shadow-sm text-xs">+{k.points} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden relative mt-8">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none"><Star size={300} /></div>
        <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/80 relative z-10 backdrop-blur-sm">
          <h2 className="text-2xl font-black text-amber-400 flex items-center tracking-tight mb-3"><Trophy className="h-6 w-6 mr-3 text-amber-400" /> The 'Best Neighbour' Annual Awards</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="bg-amber-900/40 border border-amber-500/50 text-amber-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">1st Place: Best Neighbour ($3000)</div>
            <div className="bg-slate-800/60 border border-slate-500/50 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">2nd Place: Great Neighbour ($2000)</div>
            <div className="bg-amber-900/20 border border-amber-700/30 text-amber-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">3rd Place: Good Neighbour ($1000)</div>
          </div>
        </div>
        <div className="p-0 overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-800/80 backdrop-blur sticky top-0">
              <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-700">
                <th className="px-6 py-4 font-bold">Rank</th><th className="px-6 py-4 font-bold">Employee</th><th className="px-6 py-4 font-bold">Role</th><th className="px-6 py-4 font-bold text-center text-slate-300">Base Activity Pts</th><th className="px-6 py-4 font-bold text-center text-blue-400">Kudos Pts</th><th className="px-6 py-4 font-bold text-center text-purple-400">Prize Pts</th><th className="px-6 py-4 font-bold text-right text-amber-400">Total Gala Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
               {annualStandings.length === 0 ? (
                 <tr><td colSpan="7" className="text-center py-10 text-slate-500">No gala data available yet.</td></tr>
               ) : (
                 annualStandings.map((r, idx) => (
                    <tr key={r.emp.id} className={`transition ${r.emp.id === currentUser.id ? 'bg-amber-900/40 border-l-4 border-amber-500' : 'hover:bg-slate-800/50 border-l-4 border-transparent'}`}>
                      <td className="px-6 py-4 font-black text-slate-500">{idx === 0 ? <span className="text-yellow-400 text-lg">1st</span> : idx === 1 ? <span className="text-slate-300 text-lg">2nd</span> : idx === 2 ? <span className="text-amber-600 text-lg">3rd</span> : `${idx + 1}th`}</td>
                      <td className="px-6 py-4 font-bold text-slate-200 flex items-center">{r.emp.name} {r.emp.id === currentUser.id && <span className="ml-3 bg-amber-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">You</span>}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{r.emp.role}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-300">{r.baseActivityScore.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-blue-400">{r.kudosPts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-purple-400">{r.prizePts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-400 text-lg">{r.totalGalaScore.toLocaleString()} pts</td>
                    </tr>
                 ))
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function EmployeePayTracker({ currentUser, shifts, expenses, clientExpenses, payPeriodStart, isBonusActive, employees, bonusSettings, kudos = [] }) {
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
    shiftEarnings = (Number(currentUser.annualSalary) || 0) / 26; 
  } else { 
    completedShifts.forEach(s => { 
      if (currentUser.payType === 'hourly' || s.isHourlyOverride) {
         let h = 0;
         if (s.actualStartTime && s.actualEndTime) {
             h = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
         } else {
             const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
             const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number); 
             h = (eH + eM/60) - (sH + sM/60); 
             if (h < 0) h += 24; 
         }
         const rate = s.isHourlyOverride ? (Number(s.hourlyRate) || 0) : (Number(currentUser.hourlyWage) || 22.50);
         shiftEarnings += (h * rate);
      } else {
         shiftEarnings += (Number(currentUser.perVisitRate) || 45);
      }
    });
  }

  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oopEarnings = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  let bonusEarnings = 0;
  if (isBonusActive && Array.isArray(employees)) {
    const safeEmployees = employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin');
    const lb = getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, safeEmployees, kudos);
    if (lb[0]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[0] || 0); 
    else if (lb[1]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[1] || 0); 
    else if (lb[2]?.emp?.id === currentUser.id) bonusEarnings = Number(safeBonusSettings.monthly[2] || 0);
  }
  const totalEarnings = shiftEarnings + kmEarnings + oopEarnings + bonusEarnings;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden mb-6 mt-6">
      <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={150} /></div>
      <div className="relative z-10">
        <h3 className="text-slate-300 font-medium text-sm flex items-center mb-1"><Activity className="h-4 w-4 mr-1.5 text-emerald-400" /> Live Pay Tracker</h3>
        <div className="text-xs text-slate-400 mb-6">Period: {periodBounds.start.toLocaleDateString()} - {periodBounds.end.toLocaleDateString()}</div>
        <div className="text-4xl font-black text-emerald-400 mb-6 tracking-tight">${totalEarnings.toFixed(2)}</div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">{currentUser.payType === 'salary' ? 'Base Salary (Bi-weekly)' : `Completed Shifts (${completedShifts.length})`}</span>
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
              <span className="text-sm text-yellow-300 flex items-center"><Star className="h-3 w-3 mr-1" fill="currentColor"/> Projected Bonus</span>
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
      <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log History</span>
        <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
          <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
          <input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="text-xs py-1 border-none focus:outline-none text-slate-600 bg-transparent w-32" 
            title="Filter by Month" 
          />
        </div>
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
  const [filterMonth, setFilterMonth] = useState('');
  
  const safeClientExpenses = Array.isArray(myClientExpenses) ? myClientExpenses : [];
  
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (!date || !amount || !clientId) return; 
    setIsUploading(true); 
    if(onAddClientExpense) { 
      await onAddClientExpense({ date, clientId, amount: Number(amount), description }, receiptFile); 
    } 
    setDate(''); setClientId(''); setAmount(''); setDescription(''); setReceiptFile(null); setIsUploading(false); 
  };

  const displayExpenses = safeSortByDateDesc(safeClientExpenses).filter(exp => { 
    if (!filterMonth) return true; 
    return exp.date && exp.date.startsWith(filterMonth); 
  });
  
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
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">Upload Receipt</label>
            <div className={`mt-1 flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('receipt-upload').click()}>
              <div className="text-center flex items-center space-x-2"><ImageIcon className="h-4 w-4 text-slate-400" /><span className="text-xs font-medium text-teal-600 truncate max-w-[150px]">{receiptFile ? receiptFile.name : 'Click to attach receipt'}</span></div>
              <input id="receipt-upload" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setReceiptFile(e.target.files[0])} disabled={isUploading} />
            </div>
          </div>
          <button type="submit" disabled={isUploading || !amount || !clientId || !date} className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 disabled:bg-slate-400 transition text-sm flex items-center justify-center">
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : <><Plus className="h-4 w-4 mr-1"/> Submit Expense</>}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log History</span>
        <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
          <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
          <input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="text-xs py-1 border-none focus:outline-none text-slate-600 bg-transparent w-32" 
            title="Filter by Month" 
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {displayExpenses.map(exp => (
          <div key={exp.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
            <div>
              <div className="font-semibold text-sm text-slate-800">{parseLocalSafe(exp.date).toLocaleDateString()}</div>
              <div className="text-xs text-slate-500 mt-0.5">${Number(exp.amount || 0).toFixed(2)} &bull; {clients.find(c => c.id === exp.clientId)?.name}</div>
            </div>
            <div className="flex items-center space-x-2">
              {exp.receiptUrl && (
                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:bg-teal-100 p-1 rounded" title="View Receipt">
                  <FileText className="h-4 w-4" />
                </a>
              )}
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

export default function EmployeeDashboard({ 
  shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, 
  clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], 
  timeOffLogs = [], messages = [], documents = [], onSendMessage, payPeriodStart, 
  onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile, 
  onEmployeeFileUpload, onAddTimeOff, onRequestShiftCancel,
  onDeleteMessage, onAcknowledgeMessage, announcementPictureUrl, onUpdateAnnouncementPicture,
  kudos = [], prizes = [], onAcknowledgeReward, onUpdateShift
}) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Notification & Upload States
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [scheduleChanges, setScheduleChanges] = useState([]); 
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  
  // Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelShiftId, setCancelShiftId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [agendaDateStr, setAgendaDateStr] = useState('');

  // Time Off State
  const [toStartDate, setToStartDate] = useState(''); 
  const [toEndDate, setToEndDate] = useState(''); 
  const [toType, setToType] = useState('sick'); 
  const [toNote, setToNote] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const liveEmployee = employees.find(e => e && e.id === currentUser.id) || currentUser;
  const myUploads = liveEmployee.uploadedFiles || [];
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const openShifts = safeShifts.filter(s => s && s.employeeId === 'unassigned');
  const myExpenses = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myClientExpenses = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myPaystubs = (Array.isArray(paystubs) ? paystubs : []).filter(p => p && p.employeeId === currentUser.id);
  const myTimeOffLogs = safeTimeOffLogs.filter(l => l && l.employeeId === currentUser.id);
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const upcomingShifts = safeShiftsSort(myShifts.filter(s => s && s.date && s.endTime && new Date(`${s.date}T${s.endTime}`) > now));
  const nextShift = upcomingShifts[0];

  // --- TIMECLOCK LOGIC ---
  const todayShifts = safeShiftsSort(myShifts.filter(s => s.date === todayStr));
  const activeShift = todayShifts.find(s => !s.actualEndTime) || todayShifts[todayShifts.length - 1];

  // --- REWARDS UNBOXING LOGIC ---
  const unackedKudos = useMemo(() => kudos.filter(k => k.employeeId === currentUser.id && k.acknowledged === false), [kudos, currentUser.id]);
  const unackedPrizes = useMemo(() => prizes.filter(p => p.employeeId === currentUser.id && p.acknowledged === false), [prizes, currentUser.id]);
  const activeReward = unackedKudos[0] ? { ...unackedKudos[0], _type: 'kudo' } : (unackedPrizes[0] ? { ...unackedPrizes[0], _type: 'prize' } : null);
  const hasUnreadRewards = unackedKudos.length > 0 || unackedPrizes.length > 0;

  const handleClaimReward = () => {
    if (activeReward && onAcknowledgeReward) {
      onAcknowledgeReward(activeReward._type === 'kudo' ? 'gn_kudos' : 'gn_prizes', activeReward.id);
    }
  };

  // --- Feed Ping Logic ---
  useEffect(() => {
    if (activeTab === 'announcements') { 
      localStorage.setItem('gn_feed_last_read', Date.now().toString()); 
      setHasNewFeed(false); 
    } else { 
      const lastRead = Number(localStorage.getItem('gn_feed_last_read') || 0); 
      setHasNewFeed(safeMessages.some(m => new Date(m.date).getTime() > lastRead)); 
    }
  }, [safeMessages, activeTab]);

  // --- Smart Ping Logic ---
  useEffect(() => {
    const saved = localStorage.getItem(`gn_shift_snapshot_${currentUser.id}`);
    if (saved) {
      const snapshot = JSON.parse(saved);
      const changes = [];
      
      snapshot.forEach(snapShift => {
        const stillExists = myShifts.find(s => s.id === snapShift.id);
        if (!stillExists) {
          const client = safeClients.find(c => c.id === snapShift.clientId);
          const dateStr = parseLocalSafe(snapShift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          changes.push(`🚨 REMOVED: Shift with ${client?.name || 'Unknown'} on ${dateStr} from ${snapShift.startTime} to ${snapShift.endTime}`);
        }
      });

      myShifts.forEach(shift => {
        const found = snapshot.find(s => s.id === shift.id);
        const client = safeClients.find(c => c.id === shift.clientId);
        const dateStr = parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!found) {
          changes.push(`🟢 ADDED: Shift with ${client?.name || 'Unknown'} on ${dateStr} from ${shift.startTime} to ${shift.endTime}`);
        } else if (found.date !== shift.date || found.startTime !== shift.startTime || found.endTime !== shift.endTime) {
          changes.push(`🔄 CHANGED: Shift with ${client?.name || 'Unknown'} moved to ${dateStr} from ${shift.startTime} to ${shift.endTime}`);
        }
      });

      if (changes.length > 0) {
        setScheduleChanges(changes);
        setShowUpdateBanner(true);
      }
    } else {
      const snapshot = myShifts.map(s => ({ id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, clientId: s.clientId }));
      localStorage.setItem(`gn_shift_snapshot_${currentUser.id}`, JSON.stringify(snapshot));
    }
  }, [myShifts, currentUser.id, safeClients]);

  const acknowledgeScheduleUpdates = () => {
    setScheduleChanges([]);
    setShowUpdateBanner(false);
    const snapshot = myShifts.map(s => ({ id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, clientId: s.clientId }));
    localStorage.setItem(`gn_shift_snapshot_${currentUser.id}`, JSON.stringify(snapshot));
  };

  const hasNewShift = scheduleChanges.some(msg => msg.includes('🟢 ADDED'));
  const hasChangedShift = scheduleChanges.some(msg => msg.includes('🔄 CHANGED') || msg.includes('🚨 REMOVED'));

  // --- TIME OFF BALANCE CALCULATIONS ---
  const currentYear = new Date().getFullYear();
  const currentYearLogs = myTimeOffLogs.filter(l => l.startDate && parseLocalSafe(l.startDate).getFullYear() === currentYear);
  
  let usedSick = 0; let usedVacation = 0;
  let pendingSick = 0; let pendingVacation = 0;

  currentYearLogs.forEach(log => {
    const start = parseLocalSafe(log.startDate);
    const end = parseLocalSafe(log.endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (log.status === 'approved') {
      if (log.type === 'sick') usedSick += diffDays;
      if (log.type === 'vacation') usedVacation += diffDays;
    } else if (log.status === 'pending') {
      if (log.type === 'sick') pendingSick += diffDays;
      if (log.type === 'vacation') pendingVacation += diffDays;
    }
  });

  const allowedSick = currentUser.timeOffBalances?.sick || 0;
  const allowedVacation = currentUser.timeOffBalances?.vacation || 0;
  const remainingSick = allowedSick - usedSick - pendingSick;
  const remainingVacation = allowedVacation - usedVacation - pendingVacation;

  const calculateRequestedDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = parseLocalSafe(startStr);
    const end = parseLocalSafe(endStr);
    if (end < start) return 0;
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleTimeOffSubmit = (e) => { 
    e.preventDefault(); 
    const requestedDays = calculateRequestedDays(toStartDate, toEndDate);
    
    if (requestedDays <= 0) {
      alert('End date must be the same or after the start date.');
      return;
    }
    if (toType === 'sick' && requestedDays > remainingSick) {
      alert(`You only have ${remainingSick} sick days remaining. You cannot request ${requestedDays}.`);
      return;
    }
    if (toType === 'vacation' && requestedDays > remainingVacation) {
      alert(`You only have ${remainingVacation} vacation days remaining. You cannot request ${requestedDays}.`);
      return;
    }

    if (onAddTimeOff) {
      onAddTimeOff({ id: `to_${Date.now()}`, employeeId: currentUser.id, startDate: toStartDate, endDate: toEndDate, type: toType, note: toNote }); 
    }
    setToStartDate(''); setToEndDate(''); setToNote(''); 
  };

  // --- FORMAL CANCELLATION REQUEST LOGIC ---
  const initiateCancellation = (shiftId) => {
    setCancelShiftId(shiftId);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const submitCancellation = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    if (onRequestShiftCancel && cancelShiftId) {
      onRequestShiftCancel(cancelShiftId, cancelReason);
    }
    setIsCancelModalOpen(false);
    setCancelShiftId(null);
    setCancelReason('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onUpdateProfile) {
      setIsUploadingPhoto(true);
      await onUpdateProfile(currentUser.id, {}, file);
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onEmployeeFileUpload) {
      setIsUploadingDoc(true);
      await onEmployeeFileUpload(currentUser.id, file);
      setIsUploadingDoc(false);
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setAgendaDateStr(dateStr);
    setIsDayAgendaOpen(true);
  };

  const renderSchedule = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />{monthNames[month]} {year}</h2>
          <div className="flex space-x-2">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
          {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>))}
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
            const holiday = getHoliday(dateStr);
            const isToday = dateStr === todayStr;
            const dayShifts = myShifts.filter(s => s && s.date === dateStr).sort((a,b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
            
            const cellTime = new Date(year, month, day).getTime();
            const dayTimeOff = myTimeOffLogs.filter(log => {
              if (log.status !== 'approved') return false;
              if (!log.startDate || !log.endDate) return false;
              
              const start = parseLocalSafe(log.startDate);
              const end = parseLocalSafe(log.endDate);
              const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
              const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
              return cellTime >= sTime && cellTime <= eTime;
            });
            
            // Capping Logic for Month View
            const maxShifts = 3;
            const visibleShifts = dayShifts.slice(0, maxShifts);
            const hiddenCount = dayShifts.length - maxShifts;

            return (
              <div key={day} onClick={() => handleDayClick(day)} className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative cursor-pointer ${holiday ? 'bg-purple-50/50' : ''} ${isToday ? 'border-2 border-teal-500 shadow-sm z-10' : ''}`}>
                <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                  <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : isToday ? 'text-teal-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                  <div className="flex flex-col items-end gap-1">
                    {isToday && (<span className="text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded shadow-sm">TODAY</span>)}
                    {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {String(holiday.name).toUpperCase()}</span>)}
                    {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
                  </div>
                </div>

                <div className="space-y-1">
                  {dayTimeOff.map(log => {
                    const isSick = log.type === 'sick';
                    const isVacation = log.type === 'vacation';
                    return (
                      <div key={`to_${log.id}`} className={`text-xs p-1.5 rounded relative border shadow-sm mb-1 ${isSick ? 'bg-red-50 text-red-800 border-red-200' : isVacation ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-800 border-slate-200'}`} title={`${isSick ? 'Sick Leave' : isVacation ? 'Vacation' : 'Unpaid Time Off'}`}>
                        <div className="font-semibold truncate flex items-center">
                          {isSick ? <Activity className="h-3 w-3 mr-1" /> : isVacation ? <Sun className="h-3 w-3 mr-1" /> : <CalendarDays className="h-3 w-3 mr-1" />}
                          {isSick ? 'Sick Day' : isVacation ? 'Vacation' : 'Unpaid Leave'}
                        </div>
                      </div>
                    );
                  })}

                  {visibleShifts.map(shift => {
                    const client = clients.find(c => c && c.id === shift.clientId);
                    return (
                      <div key={shift.id} className={`text-xs p-1.5 rounded transition shadow-sm ${shift.cancelRequest?.pending ? 'bg-slate-200 text-slate-500 border border-slate-300' : 'bg-teal-100 text-teal-800 border border-teal-200 group-hover:bg-teal-200'}`}>
                        <div className="font-semibold truncate flex items-center">
                          <Heart className={`h-2.5 w-2.5 mr-1 shrink-0 ${shift.cancelRequest?.pending ? 'text-slate-400' : 'text-teal-600'}`} />
                          {client?.name?.split(' ')[0] || 'Unknown'}
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-90 flex items-center">
                          <Clock className="h-2.5 w-2.5 mr-1 shrink-0" />
                          {shift.startTime}-{shift.endTime}
                        </div>
                        {shift.cancelRequest?.pending && (
                          <div className="mt-1 text-[9px] font-bold text-red-600 uppercase tracking-wider text-center">Pending Cancel</div>
                        )}
                      </div>
                    );
                  })}

                  {/* THE +X MORE BUTTON FOR MONTH VIEW */}
                  {hiddenCount > 0 && (
                     <div className="w-full text-center text-[10px] font-bold text-slate-500 group-hover:text-teal-600 mt-1 py-1 bg-slate-100/80 group-hover:bg-teal-50 rounded transition shadow-inner">
                        +{hiddenCount} more...
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* REWARDS UNBOXING MODAL */}
      {activeReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            <div className={`px-6 py-8 text-center relative overflow-hidden ${activeReward._type === 'kudo' ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950' : 'bg-gradient-to-b from-purple-500 to-purple-700 text-white'}`}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
                 {activeReward._type === 'kudo' ? <Award size={150} /> : <Gift size={150} />}
               </div>
               <PartyPopper className="h-12 w-12 mx-auto mb-4 relative z-10 animate-bounce" />
               <h2 className="text-2xl font-black relative z-10">You've been recognized!</h2>
               <p className="text-sm font-medium mt-1 relative z-10 opacity-90">Administration has sent you a new reward.</p>
            </div>
            
            <div className="p-8 text-center flex flex-col items-center">
               <div className={`h-24 w-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-inner border-4 ${activeReward._type === 'kudo' ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                 {activeReward._type === 'kudo' ? activeReward.badgeIcon : <Gift className="h-10 w-10" />}
               </div>
               
               <h3 className="text-xl font-bold text-slate-800 mb-2">
                 {activeReward._type === 'kudo' ? activeReward.badgeLabel : activeReward.name}
               </h3>
               
               <div className="text-slate-600 italic bg-slate-50 p-4 rounded-lg border border-slate-100 w-full mb-6 relative">
                 <span className="text-2xl text-slate-300 absolute top-2 left-2">"</span>
                 {activeReward._type === 'kudo' ? activeReward.message : activeReward.note}
                 <span className="text-2xl text-slate-300 absolute bottom-0 right-2">"</span>
               </div>
               
               <div className={`w-full py-3 rounded-xl font-black text-lg shadow-sm border ${activeReward._type === 'kudo' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                 {activeReward._type === 'kudo' ? `+${activeReward.points} Gala Points` : `+50 Gala Points`}
               </div>
               
               <button 
                 onClick={handleClaimReward} 
                 className={`mt-6 w-full py-3.5 rounded-lg font-bold text-white shadow-md transition transform hover:scale-105 ${activeReward._type === 'kudo' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}
               >
                 Claim Reward
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION REASON MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-red-50 text-red-800 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Request Shift Cancellation</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="hover:text-red-600 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={submitCancellation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  rows="4" 
                  placeholder="e.g. Client requested a different day, sick leave, etc." 
                  required 
                />
                <p className="text-xs text-slate-500 mt-2">This request will be sent to Administration. You remain responsible for this shift until the request is approved.</p>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Back</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition shadow-sm">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY AGENDA MODAL (EMPLOYEE DAY VIEW) */}
      {isDayAgendaOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-teal-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-200"/> Daily Agenda: {parseLocalSafe(agendaDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button onClick={() => setIsDayAgendaOpen(false)} className="hover:text-teal-200 transition text-2xl leading-none">&times;</button>
            </div>
            <div className="p-0 bg-slate-50 flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {myShifts.filter(s => s.date === agendaDateStr).length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No shifts scheduled for this day.</div>
                ) : (
                  myShifts.filter(s => s.date === agendaDateStr).sort((a,b) => String(a.startTime).localeCompare(String(b.startTime))).map(shift => {
                    const client = clients.find(c => c && c.id === shift.clientId);
                    return (
                      <div key={shift.id} className="p-4 hover:bg-slate-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                        <div className="flex items-start space-x-4">
                          <div className={`bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px] ${shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}`}>
                            <div className="text-xs font-bold text-teal-600 uppercase">{parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="text-xl font-extrabold text-teal-800">{parseLocalSafe(shift.date).getDate()}</div>
                          </div>
                          <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                            <h4 className="font-bold text-slate-800">{client?.name || 'Unknown Client'}</h4>
                            <div className="text-sm text-slate-600 flex items-center mt-1">
                              <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 w-full sm:w-auto">
                          <button onClick={() => { setSelectedClient(client); setIsDayAgendaOpen(false); }} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                            Care Plan
                          </button>
                          
                          {/* CANCELLATION BUTTON LOGIC */}
                          {shift.cancelRequest?.pending ? (
                            <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded cursor-not-allowed text-center w-full sm:w-auto border border-slate-200">
                              Cancellation Pending
                            </button>
                          ) : (
                            <button onClick={() => { initiateCancellation(shift.id); setIsDayAgendaOpen(false); }} className="text-xs font-medium text-slate-500 hover:text-red-500 hover:underline text-center w-full sm:w-auto">
                              Request Cancellation
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
              <button onClick={() => setIsDayAgendaOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition shadow-sm">Close Agenda</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="h-24 w-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-4 border-teal-50 shadow-sm overflow-hidden relative">
                {isUploadingPhoto ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : liveEmployee.photoUrl && !liveEmployee.photoUrl.includes('dicebear') ? (
                  <img src={liveEmployee.photoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              <label htmlFor="profile-upload" className={`absolute bottom-0 right-0 bg-teal-600 p-1.5 rounded-full text-white shadow-md transition ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-teal-700 opacity-80 group-hover:opacity-100'}`}>
                <Camera className="h-4 w-4" />
                <input disabled={isUploadingPhoto} id="profile-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
              </label>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">{String(currentUser.name)}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
              <span className="text-xs font-semibold text-slate-500">
                {currentUser.payType === 'salary' ? 'Salaried' : currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}
              </span>
            </div>
          </div>

          {/* --- NEW LIVE TIMECLOCK WIDGET --- */}
          {activeShift && (
             <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden text-white p-6 relative">
                <div className="absolute -right-4 -bottom-4 opacity-10"><Clock size={120} /></div>
                <div className="relative z-10">
                   <h3 className="font-bold text-teal-400 flex items-center mb-1">
                     <Activity className="h-5 w-5 mr-2" /> Live Timeclock
                   </h3>
                   <p className="text-xs text-slate-400 mb-4 flex items-center flex-wrap gap-2">
                     {clients.find(c => c.id === activeShift.clientId)?.name} &bull; {activeShift.startTime} - {activeShift.endTime}
                     {activeShift.isHourlyOverride && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/50 inline-block">Hourly Shift</span>}
                   </p>
                   
                   {activeShift.actualEndTime ? (
                       <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 p-4 rounded-lg text-center shadow-inner">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                          <div className="font-bold">Shift Completed</div>
                          <div className="text-xs mt-1 text-emerald-100">Clocked out at {new Date(activeShift.actualEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                       </div>
                   ) : activeShift.actualStartTime ? (
                       <div className="text-center">
                          <div className="text-sm text-amber-300 font-bold mb-2 animate-pulse">Currently Clocked In</div>
                          <div className="text-4xl font-black text-white mb-4 tracking-tight shadow-sm">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <button onClick={() => { if(onUpdateShift) onUpdateShift(activeShift.id, { actualEndTime: new Date().toISOString() }); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-lg shadow-md transition text-lg tracking-wider">
                            CLOCK OUT
                          </button>
                       </div>
                   ) : (
                       <div className="text-center pt-2">
                          <div className="text-sm text-slate-300 font-medium mb-3">Ready to start your visit?</div>
                          <button onClick={() => { if(onUpdateShift) onUpdateShift(activeShift.id, { actualStartTime: new Date().toISOString() }); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-black py-3.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition text-lg flex items-center justify-center tracking-wider">
                            <Clock className="h-5 w-5 mr-2" /> CLOCK IN NOW
                          </button>
                       </div>
                   )}
                </div>
             </div>
          )}

          <EmployeePayTracker 
            currentUser={currentUser} 
            shifts={shifts} 
            expenses={expenses} 
            clientExpenses={clientExpenses} 
            payPeriodStart={payPeriodStart} 
            isBonusActive={isBonusActive} 
            employees={employees} 
            bonusSettings={bonusSettings} 
            kudos={kudos}
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

          {openShifts.length > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-center text-amber-800 font-bold mb-2">
                <AlertCircle className="h-5 w-5 mr-2" /> Open Shifts Available!
              </div>
              <p className="text-sm text-amber-700 mb-3">There are {openShifts.length} shift(s) that need coverage.</p>
              <button onClick={() => setActiveTab('open-shifts')} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded transition text-sm">
                View Open Shifts
              </button>
            </div>
          )}
        </div>

        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* TABS NAVIGATION */}
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveTab('schedule')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                My Schedule 
                {hasNewShift && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="New Shift Added"></span>}
                {!hasNewShift && hasChangedShift && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" title="Schedule Changed"></span>}
              </button>
              <button onClick={() => setActiveTab('timeoff')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'timeoff' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Time Off
              </button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Logs & Expenses
              </button>
              {isBonusActive && (
                <button onClick={() => setActiveTab('awards')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'awards' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                  Awards
                  {hasUnreadRewards && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" title="New Reward!"></span>}
                </button>
              )}
              <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Documents
              </button>
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Paystubs
              </button>
              <button onClick={() => setActiveTab('announcements')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Team Feed {hasNewFeed && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
              </button>
            </div>

            <div className="p-0">
              
              {/* TAB 1: TIME OFF */}
              {activeTab === 'timeoff' && (
                <div className="p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center">
                      <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4"><Activity className="h-6 w-6"/></div>
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sick Days Remaining</div>
                        <div className="text-2xl font-black text-slate-800">{remainingSick} <span className="text-sm font-medium text-slate-400">/ {allowedSick}</span></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4"><Sun className="h-6 w-6"/></div>
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vacation Days Remaining</div>
                        <div className="text-2xl font-black text-slate-800">{remainingVacation} <span className="text-sm font-medium text-slate-400">/ {allowedVacation}</span></div>
                      </div>
                    </div>
                  </div>

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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
                          <select value={toType} onChange={(e) => setToType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-semibold text-slate-700" required>
                            <option value="sick">Sick Leave</option>
                            <option value="vacation">Paid Vacation</option>
                            <option value="unpaid">Unpaid Leave</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Note to Admin</label>
                          <input type="text" value={toNote} onChange={(e) => setToNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="Optional context" />
                        </div>
                      </div>
                      <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-semibold py-2.5 rounded-md hover:bg-teal-700 transition flex items-center justify-center">
                        <Plus className="h-4 w-4 mr-2"/> Submit Request for Approval
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center"><Clock className="h-5 w-5 mr-2 text-teal-600"/> My Time Off History</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {myTimeOffLogs.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">No time off requests found.</div>
                      ) : (
                        myTimeOffLogs.sort((a,b) => new Date(b.dateSubmitted || 0) - new Date(a.dateSubmitted || 0)).map(req => {
                          const isSick = req.type === 'sick';
                          const start = parseLocalSafe(req.startDate);
                          const end = parseLocalSafe(req.endDate);
                          
                          return (
                            <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition gap-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full shrink-0 ${isSick ? 'bg-red-100 text-red-600' : req.type === 'vacation' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                  {isSick ? <Activity className="h-4 w-4" /> : req.type === 'vacation' ? <Sun className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">
                                    {start.toLocaleDateString()} <span className="text-slate-400 font-normal mx-1">to</span> {end.toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {req.type === 'sick' ? 'Sick Leave' : req.type === 'vacation' ? 'Vacation' : 'Unpaid Leave'}
                                    {req.note && <span className="italic ml-2">"{req.note}"</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center sm:justify-end">
                                {req.status === 'approved' ? (
                                  <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approved</span>
                                ) : req.status === 'rejected' ? (
                                  <span className="flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full"><XCircle className="h-3.5 w-3.5 mr-1" /> Denied</span>
                                ) : req.status === 'cancelled' ? (
                                  <span className="flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full"><Trash2 className="h-3.5 w-3.5 mr-1" /> Cancelled</span>
                                ) : (
                                  <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Clock className="h-3.5 w-3.5 mr-1" /> Pending</span>
                                )}
                              </div>                            
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SCHEDULE */}
              {activeTab === 'schedule' && (
                <div className="flex flex-col">
                  
                  {/* --- DETAILED EXPLICIT ACKNOWLEDGEMENT BANNER --- */}
                  {showUpdateBanner && scheduleChanges.length > 0 && (
                    <div className="mx-6 mt-6 mb-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex items-start">
                          <div className={`h-2.5 w-2.5 rounded-full animate-pulse mr-3 shrink-0 mt-1 ${hasNewShift ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-2">Unread Schedule Updates</h3>
                            <ul className="space-y-1.5">
                              {scheduleChanges.map((msg, i) => (
                                <li key={i} className="text-xs text-slate-700 font-medium bg-white px-3 py-2 rounded border border-emerald-100 shadow-sm flex items-start">
                                  <span className="mr-2 mt-0.5">{msg.substring(0,2)}</span>
                                  <span>{msg.substring(3)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <button onClick={acknowledgeScheduleUpdates} className="w-full sm:w-auto px-4 py-2 text-sm font-bold bg-white text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-100 transition shadow-sm whitespace-nowrap shrink-0">
                          Acknowledge & Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-end">
                    <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
                      <button onClick={() => setScheduleView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>List View</button>
                      <button onClick={() => setScheduleView('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Calendar</button>
                    </div>
                  </div>
                  
                  {scheduleView === 'list' ? (
                    <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden m-6">
                      {upcomingShifts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>
                      ) : (
                        upcomingShifts.map(shift => {
                          const client = clients.find(c => c && c.id === shift.clientId);
                          const d = parseLocalSafe(shift.date);
                          const isInvalid = isNaN(d.getTime());
                          return (
                            <div key={shift.id || Math.random()} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start space-x-4">
                                <div className={`bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px] ${shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}`}>
                                  <div className="text-xs font-bold text-teal-600 uppercase">{!isInvalid ? d.toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                                  <div className="text-xl font-extrabold text-teal-800">{!isInvalid ? d.getDate() : ''}</div>
                                </div>
                                <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                                  <h4 className="font-bold text-slate-800">{client?.name || 'Unknown Client'}</h4>
                                  <div className="text-sm text-slate-600 flex items-center mt-1">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2 w-full sm:w-auto">
                                <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                                  Care Plan
                                </button>
                                
                                {/* CANCELLATION BUTTON LOGIC */}
                                {shift.cancelRequest?.pending ? (
                                  <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded cursor-not-allowed text-center w-full sm:w-auto border border-slate-200">
                                    Cancellation Pending
                                  </button>
                                ) : (
                                  <button onClick={() => initiateCancellation(shift.id)} className="text-xs font-medium text-slate-500 hover:text-red-500 hover:underline text-center w-full sm:w-auto">
                                    Request Cancellation
                                  </button>
                                )}

                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    renderSchedule()
                  )}
                </div>
              )}

              {/* TAB 3: OPEN SHIFTS */}
              {activeTab === 'open-shifts' && (
                <div className="bg-amber-50/30 p-4">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Shifts Needing Coverage</h3>
                  <div className="space-y-3">
                    {openShifts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No open shifts at this time.</p>
                    ) : (
                      openShifts.map(shift => {
                        const client = clients.find(c => c && c.id === shift.clientId);
                        return (
                          <div key={shift.id || Math.random()} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <div className="font-bold text-slate-800">{shift.date ? parseLocalSafe(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}</div>
                              <div className="text-sm text-slate-600 mt-1">{shift.startTime} - {shift.endTime} &bull; {client?.name}</div>
                            </div>
                            <button 
                              onClick={() => { if(onPickupShift) onPickupShift(shift.id, currentUser.id); }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded transition w-full sm:w-auto"
                            >
                              Pick Up Shift
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: EXPENSES */}
              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                  <EmployeeMileageLog 
                    myExpenses={myExpenses} 
                    clients={clients} 
                    onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                  <EmployeeClientExpenseLog 
                    myClientExpenses={myClientExpenses} 
                    clients={clients} 
                    onAddClientExpense={(exp, file) => onAddClientExpense({ ...exp, employeeId: currentUser.id }, file)} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                </div>
              )}

              {/* TAB 5: AWARDS */}
              {activeTab === 'awards' && isBonusActive && (
                <div className="p-6">
                  <AwardsLeaderboard 
                    currentUser={currentUser}
                    employees={employees} 
                    shifts={shifts} 
                    expenses={expenses} 
                    clientExpenses={clientExpenses} 
                    kudos={kudos}
                    prizes={prizes}
                    isBonusActive={isBonusActive} 
                    bonusSettings={bonusSettings}
                  />
                </div>
              )}

              {/* TAB 6: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="p-6 space-y-6">
                  <DocumentManager documents={documents} isAdmin={false} />
                  
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" /> My Personal Uploads</h2>
                    </div>
                    <div className="p-6">
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Securely send a document to the Administrator</label>
                        <div className="flex items-center justify-center w-full">
                          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {isUploadingDoc ? <Loader2 className="w-8 h-8 mb-3 text-teal-600 animate-spin" /> : <Upload className="w-8 h-8 mb-3 text-slate-400" />}
                              <p className="mb-2 text-sm text-slate-500">{isUploadingDoc ? <span className="font-semibold text-teal-600">Uploading securely...</span> : <><span className="font-semibold text-teal-600">Click to upload</span> or drag and drop</>}</p>
                              <p className="text-xs text-slate-500">PDF, JPG, or PNG</p>
                            </div>
                            <input type="file" className="hidden" disabled={isUploadingDoc} onChange={handleDocumentUpload} />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {myUploads.length === 0 ? (
                          <div className="text-center py-4 text-sm text-slate-500">You haven't uploaded any personal files yet.</div>
                        ) : (
                          myUploads.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-teal-50 transition border border-slate-200 rounded-md">
                              <div className="flex items-center overflow-hidden pr-4">
                                <FileText className="h-6 w-6 mr-3 text-teal-600 shrink-0" />
                                <div className="truncate">
                                  <div className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{new Date(file.date).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded transition text-xs font-semibold shadow-sm shrink-0">View</a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7 & 8: PAYSTUBS AND ANNOUNCEMENTS */}
              {activeTab === 'paystubs' && <EmployeePaystubs myPaystubs={myPaystubs} />}
              {activeTab === 'announcements' && (
                <Announcements 
                  messages={messages} 
                  onSendMessage={onSendMessage} 
                  currentUser={currentUser} 
                  employees={employees} 
                  onDeleteMessage={onDeleteMessage} 
                  onAcknowledgeMessage={onAcknowledgeMessage} 
                  announcementPictureUrl={announcementPictureUrl} 
                  onUpdateAnnouncementPicture={onUpdateAnnouncementPicture} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
