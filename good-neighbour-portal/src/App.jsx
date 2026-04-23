import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, ShieldAlert, Trash2, Users, Heart, Coins, Star, Settings, Car, Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Wallet, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, Bell, MessageSquare, Send, Download, TrendingUp, Trophy, Medal, Award, Activity } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// ==========================================
// 1. MOCK DATA & UTILITIES
// ==========================================
const MOCK_EMPLOYEES = [
  { id: 'admin1', name: 'Master Admin', username: 'admin', password: 'password', role: 'Administrator', payType: 'hourly', hourlyWage: 25, perVisitRate: 45, timeOffBalances: { sick: 5, vacation: 10 }, requirements: {}, availability: [] },
  { id: 'emp1', name: 'Jane Employee', username: 'jane', password: 'password', role: 'Neighbour', payType: 'per_visit', hourlyWage: 22.50, perVisitRate: 45, timeOffBalances: { sick: 5, vacation: 10 }, requirements: {}, availability: [] }
];
const MOCK_CLIENTS = [
  { id: 'client1', name: 'Alice Smith', monthlyAllowance: 500, phone: '555-0101', address: '123 Main St' },
  { id: 'client2', name: 'Bob Jones', monthlyAllowance: 300, phone: '555-0202', address: '456 Oak Ave' }
];
const INITIAL_SHIFTS = [];
const INITIAL_EXPENSES = [];
const INITIAL_CLIENT_EXPENSES = [];
const INITIAL_PAYSTUBS = [];
const INITIAL_TIME_OFF = [];
const INITIAL_MESSAGES = [];

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
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) { return new Date(); }
};

const safeSortByDateDesc = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  try {
    return [...arr].filter(Boolean).sort((a, b) => {
      const dA = parseLocalSafe(a.date).getTime();
      const dB = parseLocalSafe(b.date).getTime();
      return dB - dA;
    });
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
  const isHourly = emp.payType === 'hourly';
  empShifts.forEach(s => {
    const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number);
    const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
    if(isNaN(sH) || isNaN(eH)) return;
    let h = (eH + eM/60) - (sH + sM/60);
    if (h < 0) h += 24;
    totalHours += h;
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


// ==========================================
// 2. FIREBASE CONFIGURATION
// ==========================================
let firebaseApp, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
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
  
  // Sanitize the App ID to ensure it doesn't create invalid collection paths
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'good-neighbour-portal';
  appId = String(rawAppId).replace(/\//g, '-'); 
} catch (e) {
  console.error("Firebase init error:", e);
}


// ==========================================
// 3. INLINE COMPONENTS
// ==========================================

function LoginPage({ onLogin, isDbReady, hasData, onSeedData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center"><Briefcase className="h-8 w-8 text-teal-700"/></div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 text-center mb-2">Good Neighbour</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">Sign in to access your portal</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none" required />
          </div>
          <button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-md transition shadow-sm mt-4">Log In</button>
          {!hasData && isDbReady && (
            <button type="button" onClick={onSeedData} className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-md transition">
              Load Demo Data
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Announcements({ messages = [], onSendMessage, currentUser, employees = [] }) {
  const [text, setText] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if(text.trim()) { onSendMessage(text, currentUser.id); setText(''); }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><MessageSquare className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Team Feed</h2></div>
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.length === 0 ? <div className="text-center text-slate-500 py-8">No announcements yet.</div> : 
          safeSortByDateDesc(messages).map(m => {
            const sender = employees.find(e => e.id === m.senderId);
            const isMe = m.senderId === currentUser.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${isMe ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                  <div className={`text-xs font-bold mb-1 ${isMe ? 'text-teal-100' : 'text-teal-700'}`}>{String(sender?.name || 'Unknown')}</div>
                  <div className="text-sm">{String(m.text || '')}</div>
                </div>
              </div>
            );
          })
        }
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white flex gap-3">
        <input type="text" value={text} onChange={e=>setText(e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm" placeholder="Post a message to the team..." />
        <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition"><Send className="h-4 w-4 ml-0.5"/></button>
      </form>
    </div>
  );
}

function ClientManager({ clients = [], onAddClient, onRemoveClient, updateClient }) {
  const [newClientName, setNewClientName] = useState('');
  const [newAllowance, setNewAllowance] = useState('500');
  
  const handleAdd = (e) => {
    e.preventDefault();
    if(!newClientName.trim()) return;
    onAddClient({ id: `client_${Date.now()}`, name: newClientName, monthlyAllowance: Number(newAllowance) || 0 });
    setNewClientName(''); setNewAllowance('500');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><Heart className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Client Roster</h2></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.length === 0 ? <div className="col-span-full p-8 text-center text-slate-500">No clients in roster.</div> : 
            clients.map(c => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative">
                <button onClick={() => onRemoveClient(c.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4"/></button>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-5 w-5"/></div>
                  <div><h3 className="font-bold text-slate-800 leading-tight">{String(c.name || 'Unnamed')}</h3></div>
                </div>
                <div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-600 border border-slate-100 flex justify-between items-center">
                  <span className="font-medium">Monthly Allowance:</span>
                  <span className="font-bold text-teal-700">${Number(c.monthlyAllowance || 0).toFixed(2)}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Add Client</h2></div>
        <form onSubmit={handleAdd} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Client Name *</label><input type="text" value={newClientName} onChange={e=>setNewClientName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required/></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Monthly Allowance ($)</label><input type="number" value={newAllowance} onChange={e=>setNewAllowance(e.target.value)} className="w-full px-3 py-2 border rounded-md" required/></div>
          <button type="submit" className="w-full flex items-center justify-center bg-teal-600 text-white font-medium py-2 rounded-md hover:bg-teal-700"><Plus className="h-4 w-4 mr-1"/> Add Client</button>
        </form>
      </div>
    </div>
  );
}

function AdminClientFundsManager({ clients = [], expenses = [], clientExpenses = [] }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const fundData = clients.map(client => {
    const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
    const safeExp = Array.isArray(expenses) ? expenses : [];
    
    const oopSpent = safeCE.filter(e => e && e.clientId === client.id && e.status === 'approved' && parseLocalSafe(e.date).getMonth() === currentMonth && parseLocalSafe(e.date).getFullYear() === currentYear).reduce((s, e) => s + Number(e.amount || 0), 0);
    const kmSpent = safeExp.filter(e => e && e.clientId === client.id && e.status === 'approved' && parseLocalSafe(e.date).getMonth() === currentMonth && parseLocalSafe(e.date).getFullYear() === currentYear).reduce((s, e) => s + (Number(e.kilometers || 0) * 0.68), 0);
    
    const totalSpent = oopSpent + kmSpent;
    const allowance = Number(client.monthlyAllowance || 0);
    const remaining = allowance - totalSpent;
    return { ...client, allowance, oopSpent, kmSpent, totalSpent, remaining };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><Wallet className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Client Funds Tracker (Current Month)</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Monthly Allowance</th>
              <th className="px-6 py-3 font-medium">Spent on Receipts</th>
              <th className="px-6 py-3 font-medium">Spent on Mileage</th>
              <th className="px-6 py-3 font-medium text-right">Remaining Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fundData.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500">No client data.</td></tr> : 
              fundData.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-800">{String(c.name)}</td>
                  <td className="px-6 py-4 text-slate-600">${c.allowance.toFixed(2)}</td>
                  <td className="px-6 py-4 text-amber-600 font-medium">${c.oopSpent.toFixed(2)}</td>
                  <td className="px-6 py-4 text-blue-600 font-medium">${c.kmSpent.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-right font-black ${c.remaining < 0 ? 'text-red-600' : c.remaining < 50 ? 'text-amber-500' : 'text-emerald-600'}`}>${c.remaining.toFixed(2)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimeOffManager({ employees = [], timeOffLogs = [], onAddTimeOff, onRemoveTimeOff }) {
  const [empId, setEmpId] = useState('');
  const [type, setType] = useState('sick');
  const [date, setDate] = useState('');
  
  const handleAdd = e => {
    e.preventDefault();
    if(!empId || !date) return;
    onAddTimeOff({ employeeId: empId, type, date });
    setEmpId(''); setDate('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-bold">Time Off Logs</h2></div>
        <div className="p-4 space-y-3">
          {timeOffLogs.length === 0 ? <div className="text-center p-8 text-slate-500">No time off logs.</div> : 
            safeSortByDateDesc(timeOffLogs).map(log => {
              const emp = employees.find(e => e.id === log.employeeId);
              return (
                <div key={log.id} className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm">
                  <div>
                    <div className="font-bold text-slate-800">{String(emp?.name || 'Unknown')}</div>
                    <div className="text-sm text-slate-500">{String(log.date || '')} &bull; <span className="uppercase text-xs font-bold">{String(log.type || '')}</span></div>
                  </div>
                  <button onClick={() => onRemoveTimeOff(log.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="h-4 w-4"/></button>
                </div>
              );
            })
          }
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-bold">Log Time Off</h2></div>
        <form onSubmit={handleAdd} className="p-6 space-y-4">
          <div><label className="block text-sm mb-1">Employee</label><select value={empId} onChange={e=>setEmpId(e.target.value)} className="w-full border rounded p-2" required><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{String(e.name)}</option>)}</select></div>
          <div><label className="block text-sm mb-1">Type</label><select value={type} onChange={e=>setType(e.target.value)} className="w-full border rounded p-2"><option value="sick">Sick Day</option><option value="vacation">Vacation Day</option></select></div>
          <div><label className="block text-sm mb-1">Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border rounded p-2" required/></div>
          <button type="submit" className="w-full bg-teal-600 text-white rounded py-2 font-bold">Log Record</button>
        </form>
      </div>
    </div>
  );
}

function PaystubManager({ paystubs = [], employees = [], onAddPaystub, onRemovePaystub }) {
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);

  const handleAdd = e => {
    e.preventDefault();
    if(!empId || !date || !file) return;
    onAddPaystub({ employeeId: empId, date, fileName: file.name });
    setEmpId(''); setDate(''); setFile(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-bold">Distributed Paystubs</h2></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paystubs.length === 0 ? <div className="col-span-full text-center p-8 text-slate-500">No paystubs.</div> : 
            safeSortByDateDesc(paystubs).map(ps => {
              const emp = employees.find(e => e.id === ps.employeeId);
              return (
                <div key={ps.id} className="border rounded-lg p-4 flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <div className="font-bold text-slate-800">{String(emp?.name || 'Unknown')}</div>
                    <div className="text-xs text-slate-500 mt-1">{String(ps.date || '')} &bull; {String(ps.fileName || '')}</div>
                  </div>
                  <button onClick={() => onRemovePaystub(ps.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="h-4 w-4"/></button>
                </div>
              );
            })
          }
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-bold">Upload Paystub</h2></div>
        <form onSubmit={handleAdd} className="p-6 space-y-4">
          <div><label className="block text-sm mb-1">Employee</label><select value={empId} onChange={e=>setEmpId(e.target.value)} className="w-full border rounded p-2" required><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{String(e.name)}</option>)}</select></div>
          <div><label className="block text-sm mb-1">Pay Period Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border rounded p-2" required/></div>
          <div><label className="block text-sm mb-1">Document</label><input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full text-sm" required/></div>
          <button type="submit" className="w-full bg-teal-600 text-white rounded py-2 font-bold">Upload Paystub</button>
        </form>
      </div>
    </div>
  );
}

function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };

  const handleUpdateBonus = (category, index, value) => {
    const updated = { ...safeBonusSettings, [category]: [...safeBonusSettings[category]] };
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
          <input type="date" value={payPeriodStart} onChange={(e) => setPayPeriodStart(e.target.value)} className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
          <p className="text-xs text-slate-500 mt-1">This date is used to calculate bi-weekly pay cycles.</p>
        </div>
        
        <div className="border-t border-slate-200 pt-5">
          <label className="flex items-center space-x-3 cursor-pointer group w-fit">
            <div className="relative flex items-center justify-center">
              <input type="checkbox" checked={isBonusActive || false} onChange={(e) => setIsBonusActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" />
            </div>
            <span className="font-bold text-slate-800 flex items-center group-hover:text-teal-700 transition">
              <Award className="h-5 w-5 mr-1.5 text-amber-500"/> Enable Performance Bonus System
            </span>
          </label>
          <div className="mt-2 ml-8 text-xs text-slate-500 leading-relaxed max-w-xl">
            When active, top earning employees with a minimum of 10 completed shifts will receive automated cash bonuses on their paycheck each month. Annual trophies track total badges won.
          </div>

          {isBonusActive && safeBonusSettings && (
            <div className="mt-4 ml-8 p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-5">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Bonus Payout Configurations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5"/> Monthly Leaderboard</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[0]} onChange={(e)=>handleUpdateBonus('monthly', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[1]} onChange={(e)=>handleUpdateBonus('monthly', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[2]} onChange={(e)=>handleUpdateBonus('monthly', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center"><Trophy className="h-4 w-4 mr-1.5"/> Annual Grand Prizes</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[0]} onChange={(e)=>handleUpdateBonus('annual', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[1]} onChange={(e)=>handleUpdateBonus('annual', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span><div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[2]} onChange={(e)=>handleUpdateBonus('annual', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div></div>
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

function ExpenseManager({ expenses = [], clientExpenses = [], employees = [], clients = [], onUpdateExpense, onUpdateClientExpense }) {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const [expenseSort, setExpenseSort] = useState({ key: 'date', direction: 'desc' });
  const [clientExpSort, setClientExpSort] = useState({ key: 'date', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleExpSort = (key) => setExpenseSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  const handleClientExpSort = (key) => setClientExpSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const filteredExpenses = safeExpenses.filter(e => { if (!selectedMonth) return true; return String(e.date || '').startsWith(selectedMonth); });
  const filteredClientExpenses = safeClientExpenses.filter(e => { if (!selectedMonth) return true; return String(e.date || '').startsWith(selectedMonth); });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let valA = a[expenseSort.key], valB = b[expenseSort.key];
    if (expenseSort.key === 'date') { valA = parseLocalSafe(a.date).getTime(); valB = parseLocalSafe(b.date).getTime(); }
    if (valA < valB) return expenseSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return expenseSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedClientExpenses = [...filteredClientExpenses].sort((a, b) => {
    let valA = a[clientExpSort.key], valB = b[clientExpSort.key];
    if (clientExpSort.key === 'date') { valA = parseLocalSafe(a.date).getTime(); valB = parseLocalSafe(b.date).getTime(); }
    if (valA < valB) return clientExpSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return clientExpSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Reimbursement Approvals</h2>
          <p className="text-sm text-slate-500">Review and approve employee out-of-pocket expenses and mileage.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter by Month:</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
          {selectedMonth && <button onClick={() => setSelectedMonth('')} className="text-xs text-slate-500 hover:text-red-500 underline whitespace-nowrap">Clear</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Client Expense Receipts (Out-of-Pocket)</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th onClick={() => handleClientExpSort('date')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Date ↕</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Item/Description</th>
                <th className="px-6 py-3 font-medium">Receipt</th>
                <th onClick={() => handleClientExpSort('amount')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Amount ↕</th>
                <th onClick={() => handleClientExpSort('status')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Status ↕</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClientExpenses.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">{selectedMonth ? `No client expenses submitted for ${selectedMonth}.` : "No client expense receipts submitted."}</td></tr>
              ) : (
                sortedClientExpenses.map(expense => {
                  if (!expense) return null;
                  const emp = safeEmployees.find(e => e.id === expense.employeeId);
                  const client = safeClients.find(c => c.id === expense.clientId);
                  return (
                    <tr key={`ce_${expense.id}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{expense.date ? parseLocalSafe(expense.date).toLocaleDateString() : 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm"><div className="font-medium text-slate-700">{String(emp?.name || 'Unknown')}</div><div className="text-xs text-slate-500 mt-0.5">for {String(client?.name || 'Unknown')}</div></td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={String(expense.description || '')}>{String(expense.description || '')}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.receiptDetails ? (<div className="flex items-center text-teal-600"><FileText className="h-4 w-4 mr-1" /><span className="truncate max-w-[100px]" title={String(expense.receiptDetails)}>{String(expense.receiptDetails)}</span></div>) : (<span className="text-slate-400 italic">No attachment</span>)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${Number(expense.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateClientExpense && onUpdateClientExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                            <button onClick={() => onUpdateClientExpense && onUpdateClientExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject"><XCircle className="h-5 w-5" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Mileage Approvals</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th onClick={() => handleExpSort('date')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Date ↕</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Description</th>
                <th onClick={() => handleExpSort('kilometers')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Kilometers ↕</th>
                <th className="px-6 py-3 font-medium">Reimbursement ($0.68/km)</th>
                <th onClick={() => handleExpSort('status')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Status ↕</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">{selectedMonth ? `No mileage logs submitted for ${selectedMonth}.` : "No mileage logs submitted."}</td></tr>
              ) : (
                sortedExpenses.map(expense => {
                  if (!expense) return null;
                  const emp = safeEmployees.find(e => e.id === expense.employeeId);
                  const client = safeClients.find(c => c.id === expense.clientId);
                  const amount = (Number(expense.kilometers || 0) * 0.68).toFixed(2);
                  return (
                    <tr key={`mil_${expense.id}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{expense.date ? parseLocalSafe(expense.date).toLocaleDateString() : 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm"><div className="font-medium text-slate-700">{String(emp?.name || 'Unknown')}</div><div className="text-xs text-slate-500 mt-0.5">for {String(client?.name || 'Unknown')}</div></td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={String(expense.description || '')}>{String(expense.description || '')}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{String(expense.kilometers || 0)} km</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${amount}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateExpense && onUpdateExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                            <button onClick={() => onUpdateExpense && onUpdateExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject"><XCircle className="h-5 w-5" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminEarningsManager({ employees = [], shifts = [], expenses = [], clientExpenses = [], payPeriodStart, isBonusActive, bonusSettings }) {
  const kmRate = 0.68;
  const safeEmps = Array.isArray(employees) ? employees : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];
  const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  
  const allPeriods = useMemo(() => getPastPayPeriods(payPeriodStart || '2026-04-01', 104), [payPeriodStart]);
  const availableYears = useMemo(() => {
    const years = allPeriods.map(p => p.end.getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [allPeriods]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]?.toString() || new Date().getFullYear().toString());
  const [selectedPeriodTime, setSelectedPeriodTime] = useState('');

  const filteredPeriods = useMemo(() => allPeriods.filter(p => p.end.getFullYear().toString() === selectedYear), [allPeriods, selectedYear]);

  const activePeriod = useMemo(() => {
    if (selectedPeriodTime) {
      const found = filteredPeriods.find(p => p.start.getTime().toString() === selectedPeriodTime);
      if (found) return found;
    }
    return filteredPeriods[0] || allPeriods[0];
  }, [filteredPeriods, selectedPeriodTime, allPeriods]);

  const currentPeriodStart = activePeriod.start;
  const currentPeriodEnd = activePeriod.end;
  
  const employeeEarnings = useMemo(() => {
    const now = new Date();
    const monthlyWinners = getMonthlyLeaderboard(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth(), safeShifts, safeExp, safeCE, safeEmps);

    return safeEmps.map(emp => {
      if(!emp) return null;
      const empShifts = safeShifts.filter(s => {
        if(!s || !s.date) return false;
        const d = parseLocalSafe(s.date);
        return s.employeeId === emp.id && new Date(`${s.date}T${s.endTime || '23:59'}`) <= now && d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      
      const isHourly = emp.payType === 'hourly';
      let totalHours = 0;
      empShifts.forEach(s => {
        const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
        if(isNaN(sH) || isNaN(eH)) return;
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24; 
        totalHours += hours;
      });

      let shiftEarnings = 0;
      let displayRate = '';
      if (isHourly) {
        const hourlyWage = Number(emp.hourlyWage) || 22.50;
        shiftEarnings = totalHours * hourlyWage;
        displayRate = `${totalHours.toFixed(1)} hrs @ $${hourlyWage.toFixed(2)}/hr`;
      } else {
        const visitRate = Number(emp.perVisitRate) || 45;
        shiftEarnings = empShifts.length * visitRate;
        displayRate = `${empShifts.length} shifts @ $${visitRate}/visit`;
      }

      const empMileage = safeExp.filter(e => {
        if(!e || !e.date) return false;
        const d = parseLocalSafe(e.date);
        return e.employeeId === emp.id && e.status === 'approved' && d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const kmEarnings = empMileage.reduce((sum, e) => sum + (Number(e.kilometers) || 0), 0) * kmRate;

      const empClientExp = safeCE.filter(e => {
        if(!e || !e.date) return false;
        const d = parseLocalSafe(e.date);
        return e.employeeId === emp.id && e.status === 'approved' && d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const clientExpenseEarnings = empClientExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      let bonusEarnings = 0;
      if (isBonusActive) {
        if (monthlyWinners[0]?.emp.id === emp.id) bonusEarnings = Number(safeBonusSettings.monthly[0] || 0);
        else if (monthlyWinners[1]?.emp.id === emp.id) bonusEarnings = Number(safeBonusSettings.monthly[1] || 0);
        else if (monthlyWinners[2]?.emp.id === emp.id) bonusEarnings = Number(safeBonusSettings.monthly[2] || 0);
      }

      const totalEarnings = shiftEarnings + kmEarnings + clientExpenseEarnings + bonusEarnings;

      return { ...emp, shiftCount: empShifts.length, totalHours, isHourly, displayRate, shiftEarnings, kmEarnings, clientExpenseEarnings, bonusEarnings, totalEarnings };
    }).filter(Boolean).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [safeEmps, safeShifts, safeExp, safeCE, currentPeriodStart, currentPeriodEnd, isBonusActive, safeBonusSettings]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center"><Coins className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Team Earnings Overview</h2></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Pay Period:</label>
          <div className="flex space-x-2 w-full sm:w-auto">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-1/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm">
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={activePeriod.start.getTime().toString()} onChange={(e) => setSelectedPeriodTime(e.target.value)} className="w-2/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm">
              {filteredPeriods.map((period) => (
                <option key={period.start.getTime()} value={period.start.getTime().toString()}>
                  {period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {period.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Shift Earnings</th>
              <th className="px-6 py-3 font-medium">Mileage</th>
              <th className="px-6 py-3 font-medium">Out-of-Pocket</th>
              {isBonusActive && <th className="px-6 py-3 font-medium text-amber-600">Bonuses</th>}
              <th className="px-6 py-3 font-medium text-right text-slate-800">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeEarnings.length === 0 ? <tr><td colSpan={isBonusActive ? "6" : "5"} className="px-6 py-8 text-center text-slate-500">No active employees to display.</td></tr> : 
              employeeEarnings.map(emp => (
                <tr key={`earning_${emp.id}`} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4"><div className="font-semibold text-slate-800">{String(emp.name)}</div><div className="text-xs text-slate-500">{String(emp.role)}</div></td>
                  <td className="px-6 py-4 text-sm text-slate-600">${emp.shiftEarnings.toFixed(2)} <span className="text-xs text-slate-400 block mt-0.5">({String(emp.displayRate)})</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">${emp.kmEarnings.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">${emp.clientExpenseEarnings.toFixed(2)}</td>
                  {isBonusActive && <td className="px-6 py-4 text-sm font-semibold text-amber-600">{emp.bonusEarnings > 0 ? `+$${emp.bonusEarnings}` : '-'}</td>}
                  <td className="px-6 py-4 text-right text-emerald-600 font-bold text-base">${emp.totalEarnings.toFixed(2)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Ontario Requirements mapping for EmployeeManager
const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' }, 
  { key: 'whmis', label: 'WHMIS' }, 
  { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check' }, 
  { key: 'prc', label: 'Police Record Check' }, 
  { key: 'immunization', label: 'Immunization Records' },
  { key: 'skills', label: 'Skills Verification' }, 
  { key: 'driverLicense', label: "Driver's License" }, 
  { key: 'autoInsurance', label: 'Auto Insurance' },
  { key: 'references', label: 'Professional References' }
];

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    username: employee?.username || '',
    password: employee?.password || '',
    role: employee?.role || 'Neighbour',
    phone: employee?.phone || '',
    email: employee?.email || '',
    address: employee?.address || '',
    payType: employee?.payType || 'per_visit',
    hourlyWage: employee?.hourlyWage || 22.50,
    perVisitRate: employee?.perVisitRate || 45,
    emergencyContactName: employee?.emergencyContactName || '',
    emergencyContactPhone: employee?.emergencyContactPhone || '',
    requirements: employee?.requirements || {},
    timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 },
    availability: employee?.availability || []
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); 

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleAvailability = (dayPart) => setFormData(prev => ({ ...prev, availability: (prev.availability||[]).includes(dayPart) ? prev.availability.filter(d => d !== dayPart) : [...(prev.availability||[]), dayPart] }));
  const handleTimeOffChange = (type, value) => setFormData(prev => ({ ...prev, timeOffBalances: { ...prev.timeOffBalances, [type]: Number(value) } }));
  const handleReqChange = (reqKey, field, value) => setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [reqKey]: { ...(prev.requirements[reqKey] || {}), [field]: value } } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const updatedData = { ...formData, payType: formData.payType || 'per_visit', hourlyWage: Number(formData.hourlyWage) || 22.50, perVisitRate: Number(formData.perVisitRate) || 45 };
    if (photoFile) updatedData.photoUrl = URL.createObjectURL(photoFile);
    if (onSave && employee?.id) onSave(employee.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white"><h3 className="text-lg font-bold flex items-center"><User className="h-5 w-5 mr-2 text-teal-200" /> Edit Employee: {String(employee.name)}</h3><button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button></div>
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6">
          <button type="button" onClick={() => setActiveTab('profile')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Personal & Contact Profile</button>
          <button type="button" onClick={() => setActiveTab('compliance')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Certificates & Clearances</button>
        </div>
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-md bg-white">
                    <div className="col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label><select value={formData.payType} onChange={(e) => handleChange('payType', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold text-teal-800 bg-teal-50"><option value="per_visit">Per Visit Rate</option><option value="hourly">Hourly Rate</option></select></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Per Visit Rate ($)</label><input type="number" min="0" step="1" value={formData.perVisitRate} onChange={(e) => handleChange('perVisitRate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Hourly Wage ($)</label><input type="number" min="0" step="0.50" value={formData.hourlyWage} onChange={(e) => handleChange('hourlyWage', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"><option value="Neighbour">Neighbour</option><option value="Block Captain">Block Captain</option><option value="Administrator">Administrator</option></select></div>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label><input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                </div>
              </div>
            </div>
            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '', fileUrl: null };
                  return (
                    <div key={req.key} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{req.label}</label>
                        <select value={currentData.status} onChange={(e) => handleReqChange(req.key, 'status', e.target.value)} className="mt-1 xl:mt-0 text-xs font-medium rounded border-slate-300 px-2 py-1"><option value="missing">Missing</option><option value="valid">Valid</option><option value="expired">Expired</option><option value="not_applicable">N/A</option></select>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                         <span className="text-xs text-slate-500">Expiry:</span><input type="date" value={currentData.expiryDate || ''} onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)} disabled={currentData.status === 'not_applicable'} className="w-32 px-2 py-1 border rounded text-xs"/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0"><button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md">Cancel</button><button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md">Save Profile</button></div>
      </div>
    </div>
  );
}

function EmployeeManager({ employees = [], onAddEmployee, onRemoveEmployee, updateEmployee, currentUser }) {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Neighbour');
  const [newPayType, setNewPayType] = useState('per_visit');
  const [newHourlyWage, setNewHourlyWage] = useState('22.50');
  const [newPerVisitRate, setNewPerVisitRate] = useState('45');
  const [editingEmployee, setEditingEmployee] = useState(null);

  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    const newEmp = { id: `emp_${Date.now()}`, name: newName, username: newUsername.trim(), password: newPassword, role: newRole, payType: newPayType, hourlyWage: Number(newHourlyWage) || 22.50, perVisitRate: Number(newPerVisitRate) || 45, requirements: {}, timeOffBalances: { sick: 5, vacation: 10 }, availability: [] };
    if (onAddEmployee) onAddEmployee(newEmp);
    setNewName(''); setNewUsername(''); setNewPassword('');
  };

  const getComplianceIssues = (emp) => {
    let issues = 0;
    ONTARIO_REQUIREMENTS.forEach(req => {
      const status = emp?.requirements?.[req.key]?.status || 'missing';
      if (status === 'missing' || status === 'expired') issues++;
    });
    return issues;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><div className="flex items-center"><Users className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2></div></div>
        <div className="divide-y divide-slate-100 p-4 gap-4 bg-slate-50/50 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2">
          {safeEmployees.map(emp => {
            const issuesCount = getComplianceIssues(emp);
            const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
            return (
              <div key={emp.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white relative">
                {!isProtected && (
                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button onClick={() => setEditingEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition"><Edit className="h-4 w-4" /></button>
                    {emp.id !== 'admin1' && <button onClick={() => onRemoveEmployee && onRemoveEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                )}
                <div className="flex items-center space-x-3 mb-3 pr-16"><div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-6 w-6" /></div><div><h3 className="font-bold text-slate-800">{String(emp.name)}</h3><span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block">{String(emp.role)}</span></div></div>
                <div className="mt-auto space-y-2">
                  {issuesCount > 0 ? <div className="flex items-center justify-center text-xs font-semibold bg-red-50 text-red-700 p-2 rounded border border-red-100"><AlertCircle className="h-3.5 w-3.5 mr-1.5" />{issuesCount} Requirement(s) Missing/Expired</div> : <div className="flex items-center justify-center text-xs font-semibold bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Fully Compliant</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Add Employee</h2></div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div>
          </div>
          <button type="submit" className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4" /><span>Add Employee</span></button>
        </form>
      </div>
      {editingEmployee && <EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSave={(id, data) => { if (updateEmployee) updateEmployee(id, data); setEditingEmployee(null); }} />}
    </div>
  );
}

function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], onSendMessage, payPeriodStart, onPickupShift, isBonusActive, bonusSettings }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClient, setSelectedClient] = useState(null);
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleSearch, setScheduleSearch] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const myExpenses = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myClientExpenses = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myPaystubs = (Array.isArray(paystubs) ? paystubs : []).filter(p => p && p.employeeId === currentUser.id);
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

  const renderSchedule = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label htmlFor="schedule-search" className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter Schedule:</label>
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
              <input type="text" placeholder="Search employee or client..." value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
            {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>))}
            {daysArray.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
              const holiday = getHoliday(dateStr);
              const filteredShifts = myShifts.filter(s => {
                if (!s || !scheduleSearch.trim()) return true;
                const emp = employees.find(e => e.id === s.employeeId);
                const client = clients.find(c => c.id === s.clientId);
                const searchLower = scheduleSearch.toLowerCase();
                return ((emp && emp.name && String(emp.name).toLowerCase().includes(searchLower)) || (client && client.name && String(client.name).toLowerCase().includes(searchLower)));
              });
              const dayShifts = filteredShifts.filter(s => s && s.date === dateStr);
              return (
                <div key={day} className={`min-h-[120px] p-2 hover:bg-teal-50 transition group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                    <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                    <div className="flex flex-col items-end gap-1">
                      {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {holiday.name.toUpperCase()}</span>)}
                      {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayShifts.map(shift => {
                      const client = clients.find(c => c.id === shift.clientId);
                      return (
                        <div key={shift.id || Math.random()} onClick={() => setSelectedClient(client)} className="text-xs p-1.5 rounded bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer hover:bg-teal-200 transition shadow-sm">
                          <div className="font-semibold truncate flex items-center">
                            <Heart className="h-2.5 w-2.5 mr-1 shrink-0 text-teal-600" />
                            {String(client?.name?.split(' ')[0] || 'Unknown')}
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-4"><User className="h-10 w-10" /></div>
            <h2 className="text-xl font-bold text-slate-800">{String(currentUser.name)}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
              <span className="text-xs font-semibold text-slate-500">{currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}</span>
            </div>
          </div>

          <EmployeePayTracker currentUser={currentUser} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} employees={employees} bonusSettings={bonusSettings} />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><Clock className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Next Shift</h2></div>
            <div className="p-6">
              {nextShift ? (
                <div className="space-y-4">
                  <div className="flex items-center text-slate-700"><CalendarDays className="h-5 w-5 mr-3 text-slate-400" /><span className="font-medium">{parseLocalSafe(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                  <div className="flex items-center text-slate-700"><Clock className="h-5 w-5 mr-3 text-slate-400" /><span className="font-medium">{nextShift.startTime} - {nextShift.endTime}</span></div>
                  <div className="flex items-center text-slate-700"><Heart className="h-5 w-5 mr-3 text-slate-400" /><span className="font-medium">{String(safeClients.find(c => c && c.id === nextShift.clientId)?.name || 'Unknown Client')}</span></div>
                  <button onClick={() => setSelectedClient(safeClients.find(c => c && c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded transition text-sm flex items-center justify-center"><Info className="h-4 w-4 mr-2" /> View Client Plan</button>
                </div>
              ) : (<div className="text-center text-slate-500 py-4">No upcoming shifts scheduled.</div>)}
            </div>
          </div>

          {openShifts.length > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-center text-amber-800 font-bold mb-2"><AlertCircle className="h-5 w-5 mr-2" /> Open Shifts Available!</div>
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
              {isBonusActive && (<button onClick={() => setActiveTab('awards')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'awards' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Awards</button>)}
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
                      {upcomingShifts.length === 0 ? <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div> :
                        upcomingShifts.map(shift => {
                          if(!shift) return null;
                          const client = safeClients.find(c => c && c.id === shift.clientId);
                          const d = parseLocalSafe(shift.date);
                          const isInvalid = isNaN(d.getTime());
                          return (
                            <div key={shift.id || Math.random()} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start space-x-4">
                                <div className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px]">
                                  <div className="text-xs font-bold text-teal-600 uppercase">{!isInvalid ? d.toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                                  <div className="text-xl font-extrabold text-teal-800">{!isInvalid ? d.getDate() : ''}</div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800">{String(client?.name || 'Unknown Client')}</h4>
                                  <div className="text-sm text-slate-600 flex items-center mt-1"><Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}</div>
                                </div>
                              </div>
                              <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">Care Plan</button>
                            </div>
                          );
                        })
                      }
                    </div>
                  ) : renderSchedule()}
                </div>
              )}
              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                  <EmployeeMileageLog myExpenses={myExpenses} clients={safeClients} onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} />
                  <EmployeeClientExpenseLog myClientExpenses={myClientExpenses} clients={safeClients} onAddClientExpense={(exp) => onAddClientExpense({ ...exp, employeeId: currentUser.id })} />
                </div>
              )}
              {activeTab === 'awards' && isBonusActive && <div className="p-6"><AwardsLeaderboard employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} isBonusActive={isBonusActive} bonusSettings={bonusSettings} /></div>}
              {activeTab === 'paystubs' && <EmployeePaystubs myPaystubs={myPaystubs} />}
              {activeTab === 'announcements' && <Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} />}
              {activeTab === 'open-shifts' && (
                <div className="bg-amber-50/30 p-4">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Shifts Needing Coverage</h3>
                  <div className="space-y-3">
                    {openShifts.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No open shifts at this time.</p> :
                      openShifts.map(shift => {
                        if(!shift) return null;
                        const client = safeClients.find(c => c && c.id === shift.clientId);
                        return (
                          <div key={shift.id || Math.random()} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <div className="font-bold text-slate-800">{shift.date ? parseLocalSafe(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}</div>
                              <div className="text-sm text-slate-600 mt-1">{shift.startTime} - {shift.endTime} &bull; {String(client?.name || '')}</div>
                            </div>
                            <button onClick={() => { if(onPickupShift) onPickupShift(shift.id, currentUser.id); }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded transition w-full sm:w-auto">Pick Up Shift</button>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={getClientRemainingBalance ? getClientRemainingBalance(selectedClient.id) : 0} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}

// ==========================================
// 5. MAIN APP RENDERER
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [viewMode, setViewMode] = useState('employee');
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  
  // App State
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clientExpenses, setClientExpenses] = useState([]);
  const [paystubs, setPaystubs] = useState([]);
  const [timeOffLogs, setTimeOffLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Settings State
  const [payPeriodStart, setPayPeriodStart] = useState('2026-04-01');
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [bonusSettings, setBonusSettings] = useState({ monthly: [100, 50, 20], annual: [3000, 2000, 1000] });

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

  const handleSeedData = async () => {
    if (!firebaseUser || !db) return;
    try {
      const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId.toString());
      for (const e of MOCK_EMPLOYEES) await setDoc(getDocRef('gn_employees', e.id), e);
      for (const c of MOCK_CLIENTS) await setDoc(getDocRef('gn_clients', c.id), c);
      console.log("Demo database initialized successfully!");
    } catch (err) {
      console.error("Error seeding data:", err);
    }
  };

  const handleLogin = (username, password) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const foundEmp = safeEmployees.find(e => e && e.username && String(e.username).toLowerCase() === String(username).toLowerCase() && e.password === password);
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, timeOffBalances: foundEmp.timeOffBalances });
      setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
      setActiveTab('schedule');
    } else {
      alert("Invalid credentials. Please check your username and password.");
    }
  };

  const handleLogout = () => { setCurrentUser(null); setViewMode('employee'); setActiveTab('schedule'); };

  const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId.toString());

  const onAddShift = async (newShifts) => {
    if (!firebaseUser) return;
    const arr = Array.isArray(newShifts) ? newShifts : [newShifts];
    for (const s of arr) { const id = Date.now().toString() + Math.random().toString(36).substring(2, 7); await setDoc(getDocRef('gn_shifts', id), { ...s, id }); }
  };
  const onRemoveShift = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_shifts', id));
  const onMarkShiftOpen = async (id) => firebaseUser && await updateDoc(getDocRef('gn_shifts', id), { employeeId: 'unassigned' });
  const onPickupShift = async (shiftId, empId) => firebaseUser && await updateDoc(getDocRef('gn_shifts', shiftId), { employeeId: empId });

  const onAddExpense = async (newExpense) => { if (!firebaseUser) return; const id = Date.now().toString(); await setDoc(getDocRef('gn_expenses', id), { ...newExpense, id, status: 'pending' }); };
  const onUpdateExpense = async (id, status) => firebaseUser && await updateDoc(getDocRef('gn_expenses', id), { status });

  const onAddClientExpense = async (newExpense) => { if (!firebaseUser) return; const id = Date.now().toString(); await setDoc(getDocRef('gn_clientExpenses', id), { ...newExpense, id, status: 'pending' }); };
  const onUpdateClientExpense = async (id, status) => firebaseUser && await updateDoc(getDocRef('gn_clientExpenses', id), { status });

  const onAddPaystub = async (newPaystub) => { if (!firebaseUser) return; const id = Date.now().toString(); await setDoc(getDocRef('gn_paystubs', id), { ...newPaystub, id }); };
  const onRemovePaystub = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_paystubs', id));

  const onAddTimeOffLog = async (log) => { if (!firebaseUser) return; const id = Date.now().toString(); await setDoc(getDocRef('gn_timeOffLogs', id), { ...log, id }); };
  const onRemoveTimeOffLog = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_timeOffLogs', id));

  const onAddClient = async (newClient) => firebaseUser && await setDoc(getDocRef('gn_clients', newClient.id), newClient);
  const onRemoveClient = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_clients', id));
  const updateClient = async (id, updatedData) => firebaseUser && await updateDoc(getDocRef('gn_clients', id), updatedData);

  const onAddEmployee = async (newEmp) => firebaseUser && await setDoc(getDocRef('gn_employees', newEmp.id), newEmp);
  const onRemoveEmployee = async (id) => firebaseUser && await deleteDoc(getDocRef('gn_employees', id));
  const updateEmployee = async (id, updatedData) => {
    if (!firebaseUser) return;
    await updateDoc(getDocRef('gn_employees', id), updatedData);
    if (currentUser && currentUser.id === id) setCurrentUser(prev => ({ ...prev, ...updatedData }));
  };

  const onSendMessage = async (text, senderId) => { if (!firebaseUser) return; const id = Date.now().toString(); await setDoc(getDocRef('gn_messages', id), { id, text, senderId, date: new Date().toISOString() }); };

  const handleSaveSettings = async (field, value) => {
    if (!firebaseUser) return;
    if (field === 'payPeriodStart') setPayPeriodStart(value);
    if (field === 'isBonusActive') setIsBonusActive(value);
    if (field === 'bonusAmounts') setBonusSettings(value);
    await setDoc(getDocRef('gn_settings', 'global'), { payPeriodStart: field === 'payPeriodStart' ? value : payPeriodStart, isBonusActive: field === 'isBonusActive' ? value : isBonusActive, bonusAmounts: field === 'bonusAmounts' ? value : bonusSettings }, { merge: true });
  };

  const getClientRemainingBalance = (clientId) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const client = safeClients.find(c => c && c.id === clientId);
    if (!client) return 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
    const spentThisMonth = safeCE.filter(e => e && e.clientId === clientId && e.status === 'approved').filter(e => { const d = parseLocalSafe(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const safeExp = Array.isArray(expenses) ? expenses : [];
    const mileageThisMonth = safeExp.filter(e => e && e.clientId === clientId && e.status === 'approved').filter(e => { const d = parseLocalSafe(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
    return (client.monthlyAllowance || 0) - spentThisMonth - mileageThisMonth;
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={Boolean(isDbReady)} hasData={Boolean(Array.isArray(employees) && employees.length > 0)} onSeedData={handleSeedData} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const showAdminView = isAdmin && viewMode === 'admin';

  // Shared Calendar/Schedule logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const handleDayClick = (day) => { const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; setSelectedDateStr(formattedDate); setIsModalOpen(true); };

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const renderSchedule = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label htmlFor="schedule-search" className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter Schedule:</label>
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
              <input type="text" placeholder="Search employee or client..." value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
            {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>))}
            {daysArray.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
              const holiday = getHoliday(dateStr);
              const filteredShifts = safeShifts.filter(s => {
                if (!s || !scheduleSearch.trim()) return true;
                const emp = employees.find(e => e.id === s.employeeId);
                const client = clients.find(c => c.id === s.clientId);
                const searchLower = scheduleSearch.toLowerCase();
                return ((emp && emp.name && String(emp.name).toLowerCase().includes(searchLower)) || (client && client.name && String(client.name).toLowerCase().includes(searchLower)));
              });
              const dayShifts = filteredShifts.filter(s => s && s.date === dateStr);
              return (
                <div key={day} onClick={() => { if(showAdminView) handleDayClick(day); }} className={`min-h-[120px] p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                    <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                    <div className="flex flex-col items-end gap-1">
                      {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {holiday.name.toUpperCase()}</span>)}
                      {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayShifts.map(shift => {
                      const isOpen = shift.employeeId === 'unassigned';
                      const emp = isOpen ? null : employees.find(e => e.id === shift.employeeId);
                      const client = clients.find(c => c.id === shift.clientId);
                      return (
                        <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`} title={`${isOpen ? 'OPEN SHIFT' : String(emp?.name || 'Unknown')} with ${String(client?.name || 'Unknown')}: ${shift.startTime}-${shift.endTime}`}>
                          <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>{isOpen ? '🚨 OPEN SHIFT' : String(emp?.name?.split(' ')[0] || 'Unknown')}</div>
                          <div className={`text-[10px] truncate flex items-center mt-0.5 ${isOpen ? 'text-amber-700' : 'text-teal-700'}`}><Heart className="h-2.5 w-2.5 mr-1 shrink-0" /><span className="truncate">{String(client?.name?.split(' ')[0] || 'Unknown Client')}</span></div>
                          <div className="text-[10px] mt-0.5 opacity-90">{shift.startTime} - {shift.endTime}</div>
                          {showAdminView && (
                            <div className="absolute right-1 top-1 opacity-0 group-hover/shift:opacity-100 flex space-x-1 bg-white/80 p-0.5 rounded backdrop-blur-sm">
                              {!isOpen && (<button onClick={(e) => { e.stopPropagation(); onMarkShiftOpen(shift.id); }} className="text-amber-600 hover:text-amber-800 transition p-0.5 rounded" title="Mark as Open Shift (Sick Call)"><UserMinus className="h-3 w-3" /></button>)}
                              <button onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }} className="text-red-500 hover:text-red-700 transition p-0.5 rounded" title="Delete Shift"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          )}
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
    );
  };

  const renderAdminTab = () => {
    switch (activeTab) {
      case 'employees': return <EmployeeManager employees={employees} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />;
      case 'clients': return <ClientManager clients={clients} onAddClient={onAddClient} onRemoveClient={onRemoveClient} updateClient={updateClient} />;
      case 'expenses': return <ExpenseManager expenses={expenses} clientExpenses={clientExpenses} employees={employees} clients={clients} onUpdateExpense={onUpdateExpense} onUpdateClientExpense={onUpdateClientExpense} />;
      case 'earnings': return <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />;
      case 'settings': return <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={(v) => handleSaveSettings('payPeriodStart', v)} isBonusActive={isBonusActive} setIsBonusActive={(v) => handleSaveSettings('isBonusActive', v)} bonusSettings={bonusSettings} setBonusSettings={(v) => handleSaveSettings('bonusAmounts', v)} />;
      case 'client-funds': return <AdminClientFundsManager clients={clients} expenses={expenses} clientExpenses={clientExpenses} employees={employees} />;
      case 'timeoff': return <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={onAddTimeOffLog} onRemoveTimeOff={onRemoveTimeOffLog} />;
      case 'paystubs': return <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />;
      case 'announcements': return <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} /></div>;
      default: return renderSchedule();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); setActiveTab('schedule'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">
              {viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}
            </button>
          )}
          <div className="flex items-center text-sm hidden sm:flex"><User className="mr-1 h-4 w-4"/> {String(currentUser.name)}</div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-teal-600 transition" title="Logout"><LogOut className="h-5 w-5"/></button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {showAdminView ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500">Manage schedule and personnel.</p>
              </div>
              {activeTab === 'schedule' && (
                <button onClick={() => handleDayClick(new Date().getDate() || 1)} className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition"><Plus className="h-5 w-5" /><span>Add Shift</span></button>
              )}
            </div>
            <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
              {[ {id: 'schedule', icon: CalendarIcon, label: 'Schedule'}, {id: 'employees', icon: Users, label: 'Employees'}, {id: 'clients', icon: Heart, label: 'Clients'}, {id: 'client-funds', icon: Wallet, label: 'Client Funds'}, {id: 'expenses', icon: Receipt, label: 'Reimbursements'}, {id: 'earnings', icon: Coins, label: 'Earnings'}, {id: 'timeoff', icon: CalendarDays, label: 'Time Off'}, {id: 'paystubs', icon: FileText, label: 'Paystubs'}, {id: 'announcements', icon: MessageSquare, label: 'Announcements'}, {id: 'settings', icon: Settings, label: 'Settings'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
                </button>
              ))}
            </div>
            {renderAdminTab()}
          </div>
        ) : (
          <EmployeeDashboard 
            shifts={shifts} employees={employees} currentUser={currentUser} clients={clients} expenses={expenses} onAddExpense={onAddExpense} clientExpenses={clientExpenses} onAddClientExpense={onAddClientExpense} getClientRemainingBalance={getClientRemainingBalance} paystubs={paystubs} timeOffLogs={timeOffLogs} messages={messages} onSendMessage={onSendMessage} payPeriodStart={payPeriodStart} onPickupShift={onPickupShift} isBonusActive={isBonusActive} bonusSettings={bonusSettings}
          />
        )}
      </main>

      {isModalOpen && (
        <AddShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDateStr} employees={employees} clients={clients} onSave={onAddShift} />
      )}
      {selectedClient && (
        <ClientProfileModal client={selectedClient} remainingBalance={getClientRemainingBalance(selectedClient.id)} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
