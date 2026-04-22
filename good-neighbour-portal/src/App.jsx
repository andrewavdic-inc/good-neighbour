import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, ShieldAlert, Trash2, Users, Heart, Coins, Star, Settings, Car, Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Wallet, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, Bell, MessageSquare, Send, Download, TrendingUp, Trophy, Medal, Award, Activity } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
let firebaseApp, auth, db, appId;
try {
  const firebaseConfig = {
    apiKey: "AIzaSyCMhO6iAPDuWJhZLdWZ_orO8-AyWDItnQo",
    authDomain: "good-neighbour-portal.firebaseapp.com",
    projectId: "good-neighbour-portal",
    storageBucket: "good-neighbour-portal.firebasestorage.app",
    messagingSenderId: "570654987529",
    appId: "1:570654987529:web:400f90a7a63a03b6aa6fd8"
  };
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  appId = 'good-neighbour-portal';
} catch (e) {
  console.error("Firebase init error:", e);
}

// ==========================================
// UTILS & HELPERS
// ==========================================
const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (typeof dateStr !== 'string') {
    if (dateStr.toDate) return dateStr.toDate();
    if (dateStr.seconds) return new Date(dateStr.seconds * 1000);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (y && m && d && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) { 
    return new Date(); 
  }
};

const safeSortByDateDesc = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...arr].filter(Boolean).sort((a, b) => {
    const tA = (a && a.date) ? new Date(a.date).getTime() : 0;
    const tB = (b && b.date) ? new Date(b.date).getTime() : 0;
    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
  });
};

const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [cY, cM, cD] = currentDateStr.split('-').map(Number);
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

const getPastPayPeriods = (anchorDateStr, numPeriods = 104) => {
  const { start: currentStart, end: currentEnd } = getPayPeriodBounds(anchorDateStr);
  const periods = [{ start: currentStart, end: currentEnd, isCurrent: true }];
  let prevStart = new Date(currentStart);
  for (let i = 1; i <= numPeriods; i++) {
    prevStart = new Date(prevStart.getTime() - 14 * 86400000);
    periods.push({ start: new Date(prevStart), end: new Date(prevStart.getTime() + 13 * 86400000), isCurrent: false });
  }
  return periods;
};

const safeShiftsSort = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const dA = a?.date && a?.startTime ? new Date(`${a.date}T${a.startTime}`).getTime() : 0;
    const dB = b?.date && b?.startTime ? new Date(`${b.date}T${b.startTime}`).getTime() : 0;
    return dA - dB;
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
  return holidays[dateStr] || null;
};

// Bonus Logic Helpers
const calculateEarnings = (emp, start, end, shifts, expenses, clientExpenses) => {
  const empShifts = shifts.filter(s => {
    if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
    const shiftDate = new Date(`${s.date}T${s.endTime}`);
    return shiftDate >= start && shiftDate <= end && shiftDate <= new Date();
  });
  
  let shiftEarnings = 0;
  let totalHours = 0;
  const isHourly = emp.payType === 'hourly';

  empShifts.forEach(s => {
    const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
    const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
    let h = (eH + eM/60) - (sH + sM/60);
    if (h < 0) h += 24;
    totalHours += h;
  });

  shiftEarnings = isHourly ? (totalHours * (Number(emp.hourlyWage) || 22.5)) : (empShifts.length * (Number(emp.perVisitRate) || 45));

  const kmEarnings = expenses.filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oop = clientExpenses.filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return { shiftCount: empShifts.length, totalHours, shiftEarnings, kmEarnings, oop, total: shiftEarnings + kmEarnings + oop };
};

const getMonthlyLeaderboard = (year, month, shifts, expenses, clientExpenses, employees) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  
  let results = employees.map(emp => {
    const data = calculateEarnings(emp, start, end, shifts, expenses, clientExpenses);
    return { emp, ...data };
  });

  results = results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total);
  return results.slice(0, 3);
};


// ==========================================
// INLINE COMPONENTS
// ==========================================

function AwardsLeaderboard({ employees, shifts, expenses, clientExpenses, isBonusActive, bonusSettings }) {
  const now = new Date();
  
  const currentLeaderboard = useMemo(() => {
    return getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, employees);
  }, [shifts, expenses, clientExpenses, employees, now]);
  
  const annualStandings = useMemo(() => {
    const scores = {};
    employees.forEach(e => scores[e.id] = { emp: e, gold: 0, silver: 0, bronze: 0, totalScore: 0 });
    
    for (let m = 0; m <= now.getMonth(); m++) {
      const lb = getMonthlyLeaderboard(now.getFullYear(), m, shifts, expenses, clientExpenses, employees);
      if (lb[0]) { scores[lb[0].emp.id].gold++; scores[lb[0].emp.id].totalScore += 3; }
      if (lb[1]) { scores[lb[1].emp.id].silver++; scores[lb[1].emp.id].totalScore += 2; }
      if (lb[2]) { scores[lb[2].emp.id].bronze++; scores[lb[2].emp.id].totalScore += 1; }
    }
    
    return Object.values(scores).filter(s => s.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);
  }, [shifts, expenses, clientExpenses, employees, now]);

  if (!isBonusActive) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-600">Bonus System Inactive</h3>
        <p className="text-sm text-slate-500 mt-1">The Performance Bonus System is currently disabled.</p>
      </div>
    );
  }

  const badgeIcons = [<Trophy className="h-10 w-10 mb-3" />, <Medal className="h-10 w-10 mb-3" />, <Award className="h-10 w-10 mb-3" />];
  const colors = [
    "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400", 
    "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400", 
    "bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700"
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={200} /></div>
        <h2 className="text-2xl font-bold mb-2 relative z-10 flex items-center">
          <Star className="mr-2 h-6 w-6 text-yellow-300" fill="currentColor"/> 
          {now.toLocaleString('default', { month: 'long' })} Leaderboard
        </h2>
        <p className="text-teal-100 mb-6 relative z-10 text-sm">
          Top 3 earners with 10+ shifts qualify for monthly cash bonuses!
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          {currentLeaderboard.map((winner, index) => (
            <div key={winner.emp.id} className={`${colors[index]} rounded-xl p-4 shadow-md border transform hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center`}>
              {badgeIcons[index]}
              <div className="font-bold text-lg leading-tight">{winner.emp.name}</div>
              <div className="text-sm font-semibold opacity-90 mb-3">{index + 1}{index===0?'st':index===1?'nd':'rd'} Place</div>
              <div className="mt-auto bg-black/20 rounded-full px-4 py-1.5 font-bold text-sm shadow-sm flex items-center">
                +${bonusSettings.monthly[index]} Bonus
              </div>
            </div>
          ))}
          {currentLeaderboard.length === 0 && (
            <div className="col-span-3 text-center py-8 bg-black/10 rounded-lg text-sm border border-white/20 backdrop-blur-sm">
              <p className="font-semibold text-lg mb-1">The race is on!</p>
              <p className="opacity-90">No employees have completed the 10 shifts required to qualify for the leaderboard yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" /> 
            Annual Trophy Standings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Top 3 badge earners at year-end win grand prizes of ${bonusSettings.annual[0]}, ${bonusSettings.annual[1]}, and ${bonusSettings.annual[2]}!
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold text-center">Golds (3pt)</th>
                <th className="px-6 py-3 font-semibold text-center">Silvers (2pt)</th>
                <th className="px-6 py-3 font-semibold text-center">Bronzes (1pt)</th>
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
                    {s.emp.name}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-yellow-600">{s.gold}</td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-500">{s.silver}</td>
                  <td className="px-6 py-4 text-center font-semibold text-amber-700">{s.bronze}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">{s.totalScore} pts</td>
                </tr>
              ))}
              {annualStandings.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No badges have been awarded yet this year.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeePayTracker({ currentUser, shifts, expenses, clientExpenses, payPeriodStart, isBonusActive, employees, bonusSettings }) {
  const now = new Date();
  const periodBounds = getPayPeriodBounds(payPeriodStart || '2026-04-01');
  
  const completedShifts = shifts.filter(s => {
    if (!s || s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
    const shiftEnd = new Date(`${s.date}T${s.endTime}`);
    return shiftEnd <= now && new Date(s.date) >= periodBounds.start && new Date(s.date) <= periodBounds.end;
  });

  let shiftEarnings = 0;
  if (currentUser.payType === 'hourly') {
    let hrs = 0;
    completedShifts.forEach(s => {
      const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
      let h = (eH + eM/60) - (sH + sM/60);
      if (h < 0) h += 24;
      hrs += h;
    });
    shiftEarnings = hrs * (Number(currentUser.hourlyWage) || 22.50);
  } else {
    shiftEarnings = completedShifts.length * (Number(currentUser.perVisitRate) || 45);
  }

  const myPeriodExp = expenses.filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end);
  const kmEarnings = myPeriodExp.reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);

  const myPeriodCE = clientExpenses.filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end);
  const oopEarnings = myPeriodCE.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  let bonusEarnings = 0;
  if (isBonusActive) {
    const lb = getMonthlyLeaderboard(now.getFullYear(), now.getMonth(), shifts, expenses, clientExpenses, employees);
    if (lb[0]?.emp.id === currentUser.id) bonusEarnings = bonusSettings.monthly[0];
    else if (lb[1]?.emp.id === currentUser.id) bonusEarnings = bonusSettings.monthly[1];
    else if (lb[2]?.emp.id === currentUser.id) bonusEarnings = bonusSettings.monthly[2];
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
            <span className="text-sm text-slate-300">Completed Shifts ({completedShifts.length})</span>
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

function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  const handleUpdateBonus = (category, index, value) => {
    const updated = { ...bonusSettings, [category]: [...bonusSettings[category]] };
    updated[category][index] = Number(value) || 0;
    setBonusSettings(updated); 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="font-semibold text-slate-800">System Settings</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Pay Period Anchor Date</label>
          <input 
            type="date" 
            value={payPeriodStart} 
            onChange={(e) => setPayPeriodStart(e.target.value)} 
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
          />
          <p className="text-xs text-slate-500 mt-1">This date is used to calculate bi-weekly pay cycles.</p>
        </div>
        
        <div className="border-t border-slate-200 pt-5">
          <label className="flex items-center space-x-3 cursor-pointer group w-fit">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                checked={isBonusActive || false} 
                onChange={(e) => setIsBonusActive(e.target.checked)} 
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" 
              />
            </div>
            <span className="font-bold text-slate-800 flex items-center group-hover:text-teal-700 transition">
              <Award className="h-5 w-5 mr-1.5 text-amber-500"/> 
              Enable Performance Bonus System
            </span>
          </label>
          <div className="mt-2 ml-8 text-xs text-slate-500 leading-relaxed max-w-xl">
            When active, top earning employees with a minimum of 10 completed shifts will receive automated cash bonuses on their paycheck each month. Annual trophies track total badges won.
          </div>

          {isBonusActive && (
            <div className="mt-4 ml-8 p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-5">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Bonus Payout Configurations</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1.5"/> Monthly Leaderboard
                  </h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.monthly[0]} onChange={(e)=>handleUpdateBonus('monthly', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.monthly[1]} onChange={(e)=>handleUpdateBonus('monthly', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.monthly[2]} onChange={(e)=>handleUpdateBonus('monthly', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                    <Trophy className="h-4 w-4 mr-1.5"/> Annual Grand Prizes
                  </h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.annual[0]} onChange={(e)=>handleUpdateBonus('annual', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.annual[1]} onChange={(e)=>handleUpdateBonus('annual', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={bonusSettings.annual[2]} onChange={(e)=>handleUpdateBonus('annual', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddShiftModal({ isOpen, onClose, selectedDate, employees = [], clients = [], onSave }) {
  const safeEmps = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const [employeeId, setEmployeeId] = useState(safeEmps[0]?.id || '');
  const [clientId, setClientId] = useState(safeClients[0]?.id || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newShifts = [];
    const baseDate = parseLocalSafe(selectedDate);

    if (isRecurring) {
      for (let i = 0; i < recurrenceWeeks; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + (i * 7));
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        
        if (getHoliday(dateStr)) continue;
        newShifts.push({ employeeId, clientId, date: dateStr, startTime, endTime });
      }
    } else {
      newShifts.push({ employeeId, clientId, date: selectedDate, startTime, endTime });
    }
    if (onSave) onSave(newShifts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Assign New Shift</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" value={selectedDate} readOnly className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required>
              {safeEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required>
              {safeClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              <span>Repeat Weekly</span>
            </label>
            {isRecurring && (
              <select value={recurrenceWeeks} onChange={(e) => setRecurrenceWeeks(Number(e.target.value))} className="w-full mt-3 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                <option value={4}>4 Weeks (1 Month)</option>
                <option value={12}>12 Weeks (3 Months)</option>
                <option value={26}>26 Weeks (6 Months)</option>
                <option value={52}>52 Weeks (1 Year)</option>
              </select>
            )}
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition">Save Shift</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientProfileModal({ client, remainingBalance, onClose }) {
  if (!client) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0">
          <h3 className="text-lg font-bold flex items-center"><Heart className="h-5 w-5 mr-2 text-teal-200" /> Client Profile</h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center space-x-4">
            {client.photoUrl ? <img src={client.photoUrl} alt={client.name} className="h-16 w-16 rounded-full border-2 border-teal-100 object-cover" /> :
              <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-8 w-8" /></div>}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  <Wallet className="h-3 w-3 mr-1" /> ${remainingBalance.toFixed(2)} Funds Left
                </div>
                {client.dateOfBirth && (
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <CalendarDays className="h-3 w-3 mr-1" /> DOB: {client.dateOfBirth}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(client.phone || client.address) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              {client.phone && <div className="text-sm text-slate-700 flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400" /> {client.phone}</div>}
              {client.address && <div className="text-sm text-slate-700 flex items-center"><MapPin className="h-4 w-4 mr-2 text-slate-400" /> {client.address}</div>}
            </div>
          )}

          {client.accountHolderName && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center"><User className="h-4 w-4 mr-1.5" /> Account Holder</h4>
              <div className="space-y-1">
                <div className="font-semibold text-indigo-900">{client.accountHolderName}</div>
                {client.accountHolderPhone && <div className="text-sm text-indigo-700 flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.accountHolderPhone}</div>}
                {client.accountHolderEmail && <div className="text-sm text-indigo-700 flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.accountHolderEmail}</div>}
                {client.accountHolderAddress && <div className="text-sm text-indigo-700 flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.accountHolderAddress}</div>}
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Info className="h-4 w-4 mr-1.5" /> Care Notes & Routine</h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{client.notes || 'No special instructions provided.'}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center"><Phone className="h-4 w-4 mr-1.5" /> Emergency Contacts</h4>
            {client.emergencyContactName ? (
              <div className="mb-3 border-b border-red-100 pb-3">
                <div className="text-sm font-semibold text-red-900">Primary: {client.emergencyContactName}</div>
                <div className="text-lg font-bold text-red-700 mt-0.5">{client.emergencyContactPhone}</div>
              </div>
            ) : <span className="text-sm text-red-600 italic block mb-2">No primary contact listed.</span>}
            
            {client.secondaryEmergencyName && (
              <div>
                <div className="text-sm font-semibold text-red-900">Secondary: {client.secondaryEmergencyName}</div>
                <div className="text-md font-bold text-red-700 mt-0.5">{client.secondaryEmergencyPhone}</div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

function EmployeeMileageLog({ myExpenses = [], clients = [], onAddExpense }) {
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [description, setDescription] = useState('');
  
  const safeExpenses = Array.isArray(myExpenses) ? myExpenses : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !clientId || !kilometers) return;
    if (onAddExpense) onAddExpense({ date, clientId, kilometers: Number(kilometers), description });
    setDate(''); setClientId(''); setKilometers(''); setDescription('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /> Mileage Log</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Client *</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required><option value="" disabled>Select client</option>{safeClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kilometers *</label>
              <input type="number" min="0.1" max="15" step="0.1" value={kilometers} onChange={(e)=>setKilometers(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required />
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Description</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" /></div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded p-2 text-amber-800 text-[10px] font-medium leading-tight">
            * Keep travel within 15km (max approx $10). Mileage is only covered when traveling <strong>with</strong> the client (not to and from the client's home).
          </div>
          <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 transition text-sm flex items-center justify-center"><Plus className="h-4 w-4 mr-1"/> Submit</button>
        </form>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {safeExpenses.length === 0 ? <div className="text-center text-sm text-slate-500 py-4">No mileage logged yet.</div> :
          safeSortByDateDesc(safeExpenses).map(exp => {
            if(!exp) return null;
            const client = safeClients.find(c => c.id === exp.clientId);
            return (
              <div key={exp.id || Math.random()} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{exp.date ? parseLocalSafe(exp.date).toLocaleDateString() : 'Unknown Date'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{exp.kilometers} km &bull; {exp.description}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status || 'pending'}</span>
              </div>
            )
          })
        }
      </div>
    </div>
  );
}

function EmployeeClientExpenseLog({ myClientExpenses = [], clients = [], onAddClientExpense }) {
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  
  const safeClientExpenses = Array.isArray(myClientExpenses) ? myClientExpenses : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !clientId || !amount) return;
    if(onAddClientExpense) {
      onAddClientExpense({ 
        date, 
        clientId, 
        amount: Number(amount), 
        description, 
        receiptDetails: receiptFile ? receiptFile.name : '' 
      });
    }
    setDate(''); setClientId(''); setAmount(''); setDescription(''); setReceiptFile(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /> Client Expenses</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Client *</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required><option value="" disabled>Select client</option>{safeClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Amount ($) *</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Item</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Upload Receipt</label>
            <div className="mt-1 flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('receipt-upload').click()}>
              <div className="text-center flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-teal-600 truncate max-w-[150px]">{receiptFile ? receiptFile.name : 'Click to attach receipt'}</span>
              </div>
              <input id="receipt-upload" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setReceiptFile(e.target.files[0])} />
            </div>
          </div>
          <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 transition text-sm flex items-center justify-center"><Plus className="h-4 w-4 mr-1"/> Submit Expense</button>
        </form>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {safeClientExpenses.length === 0 ? <div className="text-center text-sm text-slate-500 py-4">No expenses logged yet.</div> :
          safeSortByDateDesc(safeClientExpenses).map(exp => {
            if(!exp) return null;
            const client = safeClients.find(c => c.id === exp.clientId);
            return (
              <div key={exp.id || Math.random()} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{exp.date ? parseLocalSafe(exp.date).toLocaleDateString() : 'Unknown Date'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">${Number(exp.amount || 0).toFixed(2)} &bull; {exp.description}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status || 'pending'}</span>
              </div>
            )
          })
        }
      </div>
    </div>
  );
}

function EmployeePaystubs({ myPaystubs = [] }) {
  const safePaystubs = Array.isArray(myPaystubs) ? myPaystubs : [];
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">My Paystubs</h2></div>
      <div className="p-6">
        {safePaystubs.length === 0 ? <div className="text-center text-slate-500 py-4">No paystubs available.</div> :
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {safeSortByDateDesc(safePaystubs).map(ps => {
              if(!ps) return null;
              return (
                <div key={ps.id || Math.random()} className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-teal-400 transition cursor-pointer group bg-slate-50">
                  <FileText className="h-8 w-8 text-teal-600 mr-3 opacity-70 group-hover:opacity-100 transition" />
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{ps.date ? parseLocalSafe(ps.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date'}</div>
                    <div className="text-xs text-slate-500 truncate w-32" title={ps.fileName}>{ps.fileName || 'Unnamed File'}</div>
                  </div>
                  <Download className="h-4 w-4 text-slate-400 ml-auto group-hover:text-teal-600 transition" />
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}

function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], onSendMessage, payPeriodStart, onPickupShift, isBonusActive, bonusSettings }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClient, setSelectedClient] = useState(null);
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const openShifts = safeShifts.filter(s => s && s.employeeId === 'unassigned');
  
  const now = new Date();
  const upcomingShifts = safeShiftsSort(myShifts.filter(s => s && s.date && s.endTime && new Date(`${s.date}T${s.endTime}`) > now));
  const nextShift = upcomingShifts[0];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-4">
              <User className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{currentUser.name}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{currentUser.role}</span>
              <span className="text-xs font-semibold text-slate-500">
                {currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-800">Next Shift</h2>
            </div>
            <div className="p-6">
              {nextShift ? (
                <div className="space-y-4">
                  <div className="flex items-center text-slate-700">
                    <CalendarDays className="h-5 w-5 mr-3 text-slate-400" />
                    <span className="font-medium">{parseLocalSafe(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Clock className="h-5 w-5 mr-3 text-slate-400" />
                    <span className="font-medium">{nextShift.startTime} - {nextShift.endTime}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Heart className="h-5 w-5 mr-3 text-slate-400" />
                    <span className="font-medium">{safeClients.find(c => c.id === nextShift.clientId)?.name || 'Unknown Client'}</span>
                  </div>
                  <button onClick={() => setSelectedClient(safeClients.find(c => c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded transition text-sm flex items-center justify-center">
                    <Info className="h-4 w-4 mr-2" /> View Client Plan
                  </button>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-4">No upcoming shifts scheduled.</div>
              )}
            </div>
          </div>

          {openShifts.length > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-center text-amber-800 font-bold mb-2">
                <AlertCircle className="h-5 w-5 mr-2" /> Open Shifts Available!
              </div>
              <p className="text-sm text-amber-700 mb-3">There are {openShifts.length} shift(s) that need coverage.</p>
              <button onClick={() => setActiveTab('open-shifts')} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded transition text-sm">View Open Shifts</button>
            </div>
          )}
        </div>

        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>My Schedule</button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Logs & Expenses</button>
              {isBonusActive && (
                <button onClick={() => setActiveTab('awards')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'awards' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Awards</button>
              )}
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Paystubs</button>
              <button onClick={() => setActiveTab('announcements')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Team Feed</button>
            </div>

            <div className="p-0">
              {activeTab === 'schedule' && (
                <div className="flex flex-col">
                  <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-end">
                    <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
                      <button onClick={() => setScheduleView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>List View</button>
                      <button onClick={() => setScheduleView('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Calendar</button>
                    </div>
                  </div>
                  
                  {scheduleView === 'list' ? (
                    <div className="divide-y divide-slate-100">
                      {upcomingShifts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>
                      ) : (
                        upcomingShifts.map(shift => {
                          if(!shift) return null;
                          const client = safeClients.find(c => c.id === shift.clientId);
                          return (
                            <div key={shift.id || Math.random()} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start space-x-4">
                                <div className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px]">
                                  <div className="text-xs font-bold text-teal-600 uppercase">{shift.date ? parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                                  <div className="text-xl font-extrabold text-teal-800">{shift.date ? parseLocalSafe(shift.date).getDate() : ''}</div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800">{client?.name || 'Unknown Client'}</h4>
                                  <div className="text-sm text-slate-600 flex items-center mt-1">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                                Care Plan
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                        <h3 className="text-md font-semibold text-slate-800 flex items-center">
                          {monthNames[month]} {year}
                        </h3>
                        <div className="flex space-x-2">
                          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-100 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-100 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                        {blanksArray.map(blank => (
                          <div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>
                        ))}
                        {daysArray.map(day => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayShifts = myShifts.filter(s => s.date === dateStr);
                          
                          return (
                            <div key={day} className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative`}>
                              <div className="font-medium text-sm text-slate-600 mb-1">{day}</div>
                              <div className="space-y-1">
                                {dayShifts.map(shift => {
                                  const client = clients.find(c => c.id === shift.clientId);
                                  return (
                                    <div 
                                      key={shift.id} 
                                      onClick={() => setSelectedClient(client)}
                                      className="text-xs p-1.5 rounded bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer hover:bg-teal-200 transition shadow-sm"
                                    >
                                      <div className="font-semibold truncate flex items-center">
                                        <Heart className="h-2.5 w-2.5 mr-1 shrink-0 text-teal-600" />
                                        {client?.name?.split(' ')[0] || 'Unknown'}
                                      </div>
                                      <div className="text-[10px] mt-0.5 opacity-90 flex items-center">
                                        <Clock className="h-2.5 w-2.5 mr-1 shrink-0" />
                                        {shift.startTime}-{shift.endTime}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'open-shifts' && (
                <div className="bg-amber-50/30 p-4">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Shifts Needing Coverage</h3>
                  <div className="space-y-3">
                    {openShifts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No open shifts at this time.</p>
                    ) : (
                      openShifts.map(shift => {
                        if(!shift) return null;
                        const client = safeClients.find(c => c.id === shift.clientId);
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

              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                  <EmployeeMileageLog 
                    myExpenses={myExpenses} 
                    clients={safeClients} 
                    onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} 
                  />
                  <EmployeeClientExpenseLog 
                    myClientExpenses={myClientExpenses} 
                    clients={safeClients} 
                    onAddClientExpense={(exp) => onAddClientExpense({ ...exp, employeeId: currentUser.id })} 
                  />
                </div>
              )}

              {activeTab === 'awards' && isBonusActive && (
                <div className="p-6">
                  <AwardsLeaderboard 
                    employees={employees} 
                    shifts={shifts} 
                    expenses={expenses} 
                    clientExpenses={clientExpenses} 
                    isBonusActive={isBonusActive} 
                    bonusSettings={bonusSettings}
                  />
                </div>
              )}

              {activeTab === 'paystubs' && <EmployeePaystubs myPaystubs={myPaystubs} />}

              {activeTab === 'announcements' && <Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} />}
            </div>
          </div>
        </div>
      </div>

      {selectedClient && (
        <ClientProfileModal 
          client={selectedClient} 
          remainingBalance={getClientRemainingBalance ? getClientRemainingBalance(selectedClient.id) : 0}
          onClose={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
}

function AdminDashboard({ shifts = [], employees = [], setEmployees, updateEmployee, clients = [], setClients, updateClient, expenses = [], onUpdateExpense, clientExpenses = [], onUpdateClientExpense, paystubs = [], onAddPaystub, onRemovePaystub, timeOffLogs = [], onAddTimeOffLog, onRemoveTimeOffLog, messages = [], onSendMessage, currentUser, payPeriodStart, setPayPeriodStart, onAddShift, onRemoveShift, onMarkShiftOpen, onAddEmployee, onRemoveEmployee, onAddClient, onRemoveClient, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const isMasterAdmin = currentUser?.id === 'admin1';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setIsModalOpen(true);
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Manage schedule and personnel.</p>
        </div>
        {activeTab === 'schedule' && (
          <button 
            onClick={() => handleDayClick(new Date().getDate() || 1)}
            className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition"
          >
            <Plus className="h-5 w-5" />
            <span>Add Shift</span>
          </button>
        )}
      </div>

      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('schedule')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><CalendarIcon className="h-4 w-4"/><span>Schedule</span></div>
        </button>
        <button onClick={() => setActiveTab('employees')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'employees' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><Users className="h-4 w-4"/><span>Employees</span></div>
        </button>
        <button onClick={() => setActiveTab('clients')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'clients' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><Heart className="h-4 w-4"/><span>Clients</span></div>
        </button>
        <button onClick={() => setActiveTab('client-funds')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'client-funds' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><Wallet className="h-4 w-4"/><span>Client Funds</span></div>
        </button>
        <button onClick={() => setActiveTab('expenses')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><Receipt className="h-4 w-4"/><span>Reimbursements</span></div>
        </button>
        {isMasterAdmin && (
          <button onClick={() => setActiveTab('earnings')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'earnings' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <div className="flex items-center space-x-2"><Coins className="h-4 w-4"/><span>Earnings</span></div>
          </button>
        )}
        <button onClick={() => setActiveTab('timeoff')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'timeoff' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><CalendarDays className="h-4 w-4"/><span>Time Off</span></div>
        </button>
        <button onClick={() => setActiveTab('paystubs')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><FileText className="h-4 w-4"/><span>Paystubs</span></div>
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center space-x-2"><MessageSquare className="h-4 w-4"/><span>Announcements</span></div>
        </button>
        {isMasterAdmin && (
          <button onClick={() => setActiveTab('settings')} className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <div className="flex items-center space-x-2"><Settings className="h-4 w-4"/><span>Settings</span></div>
          </button>
        )}
      </div>

      {activeTab === 'employees' ? (
        <EmployeeManager employees={employees} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />
      ) : activeTab === 'clients' ? (
        <ClientManager clients={clients} onAddClient={onAddClient} onRemoveClient={onRemoveClient} updateClient={updateClient} />
      ) : activeTab === 'client-funds' ? (
        <AdminClientFundsManager clients={clients} expenses={expenses} clientExpenses={clientExpenses} employees={employees} />
      ) : activeTab === 'expenses' ? (
        <ExpenseManager 
          expenses={expenses} 
          clientExpenses={clientExpenses}
          employees={employees} 
          clients={clients}
          onUpdateExpense={onUpdateExpense} 
          onUpdateClientExpense={onUpdateClientExpense}
        />
      ) : activeTab === 'earnings' && isMasterAdmin ? (
        <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} />
      ) : activeTab === 'timeoff' ? (
        <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={onAddTimeOffLog} onRemoveTimeOff={onRemoveTimeOffLog} />
      ) : activeTab === 'paystubs' ? (
        <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />
      ) : activeTab === 'announcements' ? (
        <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} /></div>
      ) : activeTab === 'settings' && isMasterAdmin ? (
        <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={setPayPeriodStart} isBonusActive={isBonusActive} setIsBonusActive={setIsBonusActive} bonusSettings={bonusSettings} setBonusSettings={setBonusSettings} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <label htmlFor="schedule-search" className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter Schedule:</label>
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="schedule-search"
                  type="text"
                  placeholder="Search employee or client..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
                />
              </div>
            </div>
            {scheduleSearch.trim() !== '' && (
              <div className="text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 whitespace-nowrap">
                Filtered View Active
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />
                {monthNames[month]} {year}
              </h2>
              <div className="flex space-x-2">
                <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
              {blanksArray.map(blank => (
                <div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>
              ))}
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
                const holiday = getHoliday(dateStr);
                
                const safeShifts = Array.isArray(shifts) ? shifts : [];
                const filteredShifts = safeShifts.filter(s => {
                  if (!s || !scheduleSearch.trim()) return true;
                  const emp = employees.find(e => e.id === s.employeeId);
                  const client = clients.find(c => c.id === s.clientId);
                  const searchLower = scheduleSearch.toLowerCase();
                  return (
                    (emp && emp.name.toLowerCase().includes(searchLower)) ||
                    (client && client.name.toLowerCase().includes(searchLower))
                  );
                });
                
                const dayShifts = filteredShifts.filter(s => s && s.date === dateStr);
                
                return (
                  <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[120px] p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                      <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                      <div className="flex flex-col items-end gap-1">
                        {holiday && (
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>
                            🍁 {holiday.name.toUpperCase()}
                          </span>
                        )}
                        {isPayday && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday">
                            <Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map(shift => {
                        const isOpen = shift.employeeId === 'unassigned';
                        const emp = isOpen ? null : employees.find(e => e.id === shift.employeeId);
                        const client = clients.find(c => c.id === shift.clientId);
                        return (
                          <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`} title={`${isOpen ? 'OPEN SHIFT' : emp?.name || 'Unknown'} with ${client?.name || 'Unknown'}: ${shift.startTime}-${shift.endTime}`}>
                            <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>
                              {isOpen ? '🚨 OPEN SHIFT' : emp?.name?.split(' ')[0] || 'Unknown'}
                            </div>
                            <div className={`text-[10px] truncate flex items-center mt-0.5 ${isOpen ? 'text-amber-700' : 'text-teal-700'}`}>
                              <Heart className="h-2.5 w-2.5 mr-1 shrink-0" />
                              <span className="truncate">{client?.name?.split(' ')[0] || 'Unknown Client'}</span>
                            </div>
                            <div className="text-[10px] mt-0.5 opacity-90">{shift.startTime} - {shift.endTime}</div>
                            
                            <div className="absolute right-1 top-1 opacity-0 group-hover/shift:opacity-100 flex space-x-1 bg-white/80 p-0.5 rounded backdrop-blur-sm">
                              {!isOpen && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onMarkShiftOpen(shift.id); }}
                                  className="text-amber-600 hover:text-amber-800 transition p-0.5 rounded"
                                  title="Mark as Open Shift (Sick Call)"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }}
                                className="text-red-500 hover:text-red-700 transition p-0.5 rounded"
                                title="Delete Shift"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddShiftModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          selectedDate={selectedDateStr}
          employees={employees}
          clients={clients}
          onSave={onAddShift}
        />
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [viewMode, setViewMode] = useState('employee');
  const [payPeriodStart, setPayPeriodStart] = useState('2026-04-01');
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [bonusSettings, setBonusSettings] = useState({ monthly: [100, 50, 20], annual: [3000, 2000, 1000] });

  // App State
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clientExpenses, setClientExpenses] = useState([]);
  const [paystubs, setPaystubs] = useState([]);
  const [timeOffLogs, setTimeOffLogs] = useState([]);
  const [messages, setMessages] = useState([]);

  // Setup Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Firebase Auth Error:', error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Setup Firestore Listeners
  useEffect(() => {
    if (!firebaseUser || !db) return;

    const getCol = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubs = [];
    const handleError = (err) => console.error("Firestore Error:", err);

    unsubs.push(onSnapshot(getCol('gn_employees'), snap => {
      setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setIsDbReady(true);
    }, handleError));

    unsubs.push(onSnapshot(getCol('gn_shifts'), snap => setShifts(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clients'), snap => setClients(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_expenses'), snap => setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clientExpenses'), snap => setClientExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_paystubs'), snap => setPaystubs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_timeOffLogs'), snap => setTimeOffLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_messages'), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    
    // Listen for global settings
    unsubs.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'gn_settings', 'global'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payPeriodStart) setPayPeriodStart(data.payPeriodStart);
        if (data.isBonusActive !== undefined) setIsBonusActive(data.isBonusActive);
        if (data.bonusAmounts) setBonusSettings(data.bonusAmounts);
      }
    }, handleError));

    return () => unsubs.forEach(unsub => unsub());
  }, [firebaseUser]);

  // App Authentication
  const handleLogin = (username, password) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const foundEmp = safeEmployees.find(e => 
      e && e.username && e.username.toLowerCase() === username.toLowerCase() && e.password === password
    );
    
    if (foundEmp) {
      setCurrentUser({ 
        id: foundEmp.id, 
        name: foundEmp.name, 
        role: foundEmp.role, 
        payType: foundEmp.payType,
        hourlyWage: foundEmp.hourlyWage,
        perVisitRate: foundEmp.perVisitRate,
        timeOffBalances: foundEmp.timeOffBalances 
      });
      setViewMode(foundEmp.role === 'Administrator' ? 'admin' : 'employee');
    } else {
      alert("Invalid credentials. Please check your username and password.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setViewMode('employee');
  };

  // Firestore CRUD Handlers
  const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId.toString());

  const onAddShift = async (newShifts) => {
    if (!firebaseUser) return;
    const arr = Array.isArray(newShifts) ? newShifts : [newShifts];
    for (const s of arr) {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      await setDoc(getDocRef('gn_shifts', id), { ...s, id });
    }
  };
  const onRemoveShift = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_shifts', id));
  const onMarkShiftOpen = async (id) => firebaseUser && await updateDoc(getDocRef('gn_shifts', id), { employeeId: 'unassigned' });
  const onPickupShift = async (shiftId, empId) => firebaseUser && await updateDoc(getDocRef('gn_shifts', shiftId), { employeeId: empId });

  const onAddExpense = async (newExpense) => {
    if (!firebaseUser) return;
    const id = Date.now().toString();
    await setDoc(getDocRef('gn_expenses', id), { ...newExpense, id, status: 'pending' });
  };
  const onUpdateExpense = async (id, status) => firebaseUser && await updateDoc(getDocRef('gn_expenses', id), { status });

  const onAddClientExpense = async (newExpense) => {
    if (!firebaseUser) return;
    const id = Date.now().toString();
    await setDoc(getDocRef('gn_clientExpenses', id), { ...newExpense, id, status: 'pending' });
  };
  const onUpdateClientExpense = async (id, status) => firebaseUser && await updateDoc(getDocRef('gn_clientExpenses', id), { status });

  const onAddPaystub = async (newPaystub) => {
    if (!firebaseUser) return;
    const id = Date.now().toString();
    await setDoc(getDocRef('gn_paystubs', id), { ...newPaystub, id });
  };
  const onRemovePaystub = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_paystubs', id));

  const onAddTimeOffLog = async (log) => {
    if (!firebaseUser) return;
    const id = Date.now().toString();
    await setDoc(getDocRef('gn_timeOffLogs', id), { ...log, id });
  };
  const onRemoveTimeOffLog = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_timeOffLogs', id));

  const onAddClient = async (newClient) => firebaseUser && await setDoc(getDocRef('gn_clients', newClient.id), newClient);
  const onRemoveClient = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_clients', id));
  const updateClient = async (id, updatedData) => firebaseUser && await updateDoc(getDocRef('gn_clients', id), updatedData);

  const onAddEmployee = async (newEmp) => firebaseUser && await setDoc(getDocRef('gn_employees', newEmp.id), newEmp);
  const onRemoveEmployee = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_employees', id));
  const updateEmployee = async (id, updatedData) => {
    if (!firebaseUser) return;
    await updateDoc(getDocRef('gn_employees', id), updatedData);
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updatedData }));
    }
  };

  const onSendMessage = async (text, senderId) => {
    if (!firebaseUser) return;
    const id = Date.now().toString();
    await setDoc(getDocRef('gn_messages', id), { id, text, senderId, date: new Date().toISOString() });
  };

  const handleSaveSettings = async (field, value) => {
    if (!firebaseUser) return;
    
    // Update local state immediately for fast UI response
    if (field === 'payPeriodStart') setPayPeriodStart(value);
    if (field === 'isBonusActive') setIsBonusActive(value);
    if (field === 'bonusAmounts') setBonusSettings(value);
    
    await setDoc(
      getDocRef('gn_settings', 'global'), 
      { 
        payPeriodStart: field === 'payPeriodStart' ? value : payPeriodStart, 
        isBonusActive: field === 'isBonusActive' ? value : isBonusActive,
        bonusAmounts: field === 'bonusAmounts' ? value : bonusSettings
      }, 
      { merge: true }
    );
  };

  const getClientRemainingBalance = (clientId) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const client = safeClients.find(c => c && c.id === clientId);
    if (!client) return 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
    const spentThisMonth = safeCE
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        if(!e.date) return false;
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
    const safeExp = Array.isArray(expenses) ? expenses : [];
    const mileageThisMonth = safeExp
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        if(!e.date) return false;
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
      
    return (client.monthlyAllowance || 0) - spentThisMonth - mileageThisMonth;
  };

  if (!currentUser) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        isDbReady={Boolean(isDbReady)} 
        hasData={Boolean(Array.isArray(employees) && employees.length > 0)} 
        onSeedData={() => {}} 
      />
    );
  }

  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'admin';
  const showAdminView = isAdmin && viewMode === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6 text-teal-200" />
              <span className="font-bold text-xl tracking-wide">Good Neighbour</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              {isAdmin && (
                <button
                  onClick={() => setViewMode(viewMode === 'admin' ? 'employee' : 'admin')}
                  className="text-xs font-bold bg-teal-800 hover:bg-teal-900 text-teal-100 px-2 sm:px-3 py-1.5 rounded transition shadow-sm"
                >
                  {viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}
                </button>
              )}
              <div className="flex items-center space-x-2 text-sm text-teal-100 hidden sm:flex">
                <User className="h-4 w-4" />
                <span>{currentUser.name} ({currentUser.role})</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-teal-600 transition flex items-center space-x-1"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only sm:not-sr-only sm:text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {showAdminView ? (
          <AdminDashboard 
            shifts={shifts} 
            employees={employees} 
            onAddEmployee={onAddEmployee}
            onRemoveEmployee={onRemoveEmployee}
            updateEmployee={updateEmployee}
            clients={clients}
            onAddClient={onAddClient}
            onRemoveClient={onRemoveClient}
            updateClient={updateClient}
            expenses={expenses}
            onUpdateExpense={onUpdateExpense}
            clientExpenses={clientExpenses}
            onUpdateClientExpense={onUpdateClientExpense}
            paystubs={paystubs}
            onAddPaystub={onAddPaystub}
            onRemovePaystub={onRemovePaystub}
            timeOffLogs={timeOffLogs}
            onAddTimeOffLog={onAddTimeOffLog}
            onRemoveTimeOffLog={onRemoveTimeOffLog}
            messages={messages}
            onSendMessage={onSendMessage}
            currentUser={currentUser}
            payPeriodStart={payPeriodStart}
            setPayPeriodStart={(v) => handleSaveSettings('payPeriodStart', v)}
            isBonusActive={isBonusActive}
            setIsBonusActive={(v) => handleSaveSettings('isBonusActive', v)}
            bonusSettings={bonusSettings}
            setBonusSettings={(v) => handleSaveSettings('bonusAmounts', v)}
            onAddShift={onAddShift} 
            onRemoveShift={onRemoveShift}
            onMarkShiftOpen={onMarkShiftOpen}
          />
        ) : (
          <EmployeeDashboard 
            shifts={shifts} 
            employees={employees}
            currentUser={currentUser} 
            clients={clients} 
            expenses={expenses}
            onAddExpense={onAddExpense}
            clientExpenses={clientExpenses}
            onAddClientExpense={onAddClientExpense}
            getClientRemainingBalance={getClientRemainingBalance}
            paystubs={paystubs}
            timeOffLogs={timeOffLogs}
            messages={messages}
            onSendMessage={onSendMessage}
            payPeriodStart={payPeriodStart} 
            onPickupShift={onPickupShift}
            isBonusActive={isBonusActive}
            bonusSettings={bonusSettings}
          />
        )}
      </main>
    </div>
  );
}
