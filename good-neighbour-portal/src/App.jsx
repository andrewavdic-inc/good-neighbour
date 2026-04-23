import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, 
  Briefcase, CalendarDays, Trash2, Users, Heart, Coins, Star, Settings, Car, 
  Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Wallet, 
  Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, 
  MessageSquare, Send, Download, TrendingUp, Trophy, Medal, Award, Activity, Camera 
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// ==========================================
// FIREBASE INITIALIZATION
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
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'good-neighbour-portal';
  appId = rawAppId.replace(/\//g, '-');
} catch (e) {
  console.error("Firebase init error:", e);
}

// ==========================================
// MOCK DATA & CONSTANTS
// ==========================================
const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' }, { key: 'whmis', label: 'WHMIS' }, { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check (VSC)' }, { key: 'prc', label: 'Police Record Check (PRC)' }, 
  { key: 'immunization', label: 'Immunization Records' }, { key: 'skills', label: 'Skills Verification' }, 
  { key: 'driverLicense', label: "Driver's License" }, { key: 'autoInsurance', label: 'Auto Insurance' },
  { key: 'references', label: 'Professional References' }
];

const MOCK_EMPLOYEES = [
  { id: 'admin1', name: 'Master Admin', role: 'Administrator', username: 'admin', password: 'admin', phone: '555-0000', email: 'admin@goodneighbour.ca', photoUrl: '', requirements: {}, timeOffBalances: { sick: 5, vacation: 15 } },
  { id: 'emp1', name: 'Alice Smith', role: 'Block Captain', username: 'alice', password: 'password', phone: '555-1001', email: 'alice.s@goodneighbour.ca', photoUrl: '', requirements: { cpr: { status: 'valid', expiryDate: '2027-01-15' }, vsc: { status: 'valid', expiryDate: '2028-04-10' }, whmis: { status: 'valid' } }, timeOffBalances: { sick: 5, vacation: 10 } }
];

const MOCK_CLIENTS = [
  { id: 'client1', name: 'Eleanor Vance', notes: 'Needs mobility assistance.', emergencyContactName: 'Robert Vance', emergencyContactPhone: '555-0101', photoUrl: '', monthlyAllowance: 100 },
  { id: 'client2', name: 'John Miller', notes: 'Dementia care.', emergencyContactName: 'Sarah Miller', emergencyContactPhone: '555-0202', photoUrl: '', monthlyAllowance: 50 }
];

const INITIAL_SHIFTS = [
  { id: 'shift_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-15', startTime: '08:00', endTime: '16:00' }
];
const INITIAL_EXPENSES = [];
const INITIAL_CLIENT_EXPENSES = [];
const INITIAL_PAYSTUBS = [];
const INITIAL_TIME_OFF = [];
const INITIAL_MESSAGES = [];

// ==========================================
// UTILS & HELPERS
// ==========================================
const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
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
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [cY, cM, cD] = currentDateStr.split('-').map(Number);
  const diffDays = (Date.UTC(cY, cM - 1, cD) - Date.UTC(sY, sM - 1, sD)) / 86400000;
  return diffDays > 0 && diffDays % 14 === 0;
};

const getPayPeriodBounds = (anchorDateStr) => {
  const now = new Date();
  const anchor = parseLocalSafe(anchorDateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < anchor) {
    const end = new Date(anchor); end.setDate(end.getDate() + 13);
    return { start: anchor, end };
  }
  const diffDays = Math.floor((today - anchor) / 86400000);
  const cycles = Math.floor(diffDays / 14);
  const start = new Date(anchor.getTime() + cycles * 14 * 86400000);
  const end = new Date(start.getTime() + 13 * 86400000);
  return { start, end };
};

const getPastPayPeriods = (anchorDateStr, numPeriods = 10) => {
  const { start: currentStart, end: currentEnd } = getPayPeriodBounds(anchorDateStr);
  const periods = [{ start: currentStart, end: currentEnd, isCurrent: true }];
  let prevStart = new Date(currentStart);
  for (let i = 1; i <= numPeriods; i++) {
    prevStart = new Date(prevStart.getTime() - 14 * 86400000);
    periods.push({ start: new Date(prevStart), end: new Date(prevStart.getTime() + 13 * 86400000), isCurrent: false });
  }
  return periods;
};

const getHoliday = (dateStr) => {
  const holidays = { '2026-01-01': { name: "New Year's Day" }, '2026-02-16': { name: 'Family Day' }, '2026-04-03': { name: 'Good Friday' }, '2026-05-18': { name: 'Victoria Day' }, '2026-07-01': { name: 'Canada Day' }, '2026-08-03': { name: 'Civic Holiday' }, '2026-09-07': { name: 'Labour Day' }, '2026-10-12': { name: 'Thanksgiving Day' }, '2026-12-25': { name: 'Christmas Day' }, '2026-12-26': { name: 'Boxing Day' } };
  return holidays[String(dateStr)] || null;
};

const cleanPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('[')) {
    const match = url.match(/\]\((.*?)\)/);
    if (match && match[1]) return match[1];
  }
  return url;
};

const calculateEarnings = (emp, start, end, shifts, expenses, clientExpenses) => {
  if(!emp || !Array.isArray(shifts)) return { shiftCount: 0, totalHours: 0, shiftEarnings: 0, kmEarnings: 0, oop: 0, total: 0 };
  const empShifts = shifts.filter(s => {
    if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
    const shiftDate = new Date(`${s.date}T${s.endTime}`);
    return shiftDate >= start && shiftDate <= end && shiftDate <= new Date();
  });
  
  let shiftEarnings = 0, totalHours = 0;
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
  let results = employees.map(emp => ({ emp, ...calculateEarnings(emp, start, end, shifts, expenses, clientExpenses) }));
  return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total).slice(0, 3);
};

// ==========================================
// COMPONENTS
// ==========================================
function LoginPage({ onLogin, onSeedData, isDbReady, hasData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen bg-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <form onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }} className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <div className="flex justify-center mb-6"><div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center"><Briefcase className="h-8 w-8 text-teal-700"/></div></div>
          <h2 className="text-2xl font-black text-slate-800 text-center mb-2">Good Neighbour</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">Sign in to access your portal</p>
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-2 border rounded-md" required /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-md" required /></div>
            <button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-md transition shadow-sm mt-4">Log In</button>
            {!hasData && isDbReady && (<button type="button" onClick={onSeedData} className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-md transition">Load Demo Data</button>)}
          </div>
        </form>
      </div>
    </div>
  );
}

function Announcements({ messages = [], onSendMessage, currentUser, employees = [] }) {
  const [text, setText] = useState('');
  const canSend = currentUser?.role === 'Administrator' || currentUser?.role === 'admin' || currentUser?.role === 'Block Captain';
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><MessageSquare className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Team Announcements</h2></div>
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.length === 0 ? <div className="text-center text-slate-500 py-8">No announcements yet.</div> : 
          safeSortByDateDesc(messages).map(m => {
            const sender = employees.find(e => e.id === m.senderId);
            return (
              <div key={m.id} className="bg-white border rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3 border-b pb-3">
                  <div className="text-sm font-bold flex items-center"><User className="h-4 w-4 mr-1.5 text-slate-400" />{String(sender?.name || 'Unknown')}</div>
                  <div className="text-xs text-slate-500">{m.date ? new Date(m.date).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}) : ''}</div>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{String(m.text || '')}</div>
              </div>
            );
          })
        }
      </div>
      {canSend && (
        <form onSubmit={e => { e.preventDefault(); if(text.trim()) { onSendMessage(text, currentUser.id); setText(''); } }} className="p-5 border-t bg-slate-50 flex flex-col gap-3">
          <label className="text-sm font-semibold">Broadcast New Announcement</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-3 border rounded-lg text-sm resize-none" placeholder="Write an announcement..." rows="3" />
          <button type="submit" disabled={!text.trim()} className="self-end bg-teal-600 text-white rounded-md px-5 py-2 flex items-center"><Send className="h-4 w-4 mr-2" /> Broadcast</button>
        </form>
      )}
    </div>
  );
}

function DocumentManager({ documents = [], onAddDocument, onRemoveDocument, isAdmin }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [file, setFile] = useState(null);
  const handleSubmit = (e) => { e.preventDefault(); if (title && file && onAddDocument) { onAddDocument({ title, description, fileName: file.name, uploadDate: new Date().toISOString() }); setTitle(''); setDescription(''); setFile(null); } };
  const sortedDocs = [...documents].sort((a, b) => (b.uploadDate ? new Date(b.uploadDate).getTime() : 0) - (a.uploadDate ? new Date(a.uploadDate).getTime() : 0));
  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><BookOpen className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Upload Company Document</h2></div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
              <div className="mt-1 flex justify-center px-4 py-3 border-2 border-dashed rounded-md hover:bg-slate-50 cursor-pointer bg-white" onClick={() => document.getElementById('doc-upload').click()}>
                <div className="space-y-1 text-center"><FileText className="mx-auto h-6 w-6 text-slate-400" /><div className="text-sm text-teal-600 font-medium">{file ? file.name : <span>Click to select PDF or Document</span>}</div></div>
                <input id="doc-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </div>
            <div className="flex justify-end pt-2"><button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-md font-medium flex items-center"><Plus className="h-4 w-4 mr-2"/> Upload Document</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Company Documents</h2></div>
        <div className="p-6 bg-slate-50/30">
          {sortedDocs.length === 0 ? (<div className="text-center text-slate-500 py-8">No documents available.</div>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDocs.map(doc => (
                <div key={doc.id} className="border rounded-xl p-4 flex items-center justify-between bg-white shadow-sm">
                  <div className="flex items-center space-x-4 overflow-hidden pr-4">
                    <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0"><BookOpen className="h-6 w-6" /></div>
                    <div className="truncate"><h3 className="font-bold text-slate-800 truncate leading-tight">{doc.title}</h3>{doc.description && <p className="text-xs text-slate-500 truncate mt-0.5">{doc.description}</p>}<p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">{doc.fileName} &bull; {new Date(doc.uploadDate).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button className="text-teal-600 hover:bg-teal-50 p-2 rounded"><Download className="h-5 w-5" /></button>
                    {isAdmin && <button onClick={() => onRemoveDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 className="h-5 w-5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  const handleUpdateBonus = (category, index, value) => { const updated = { ...safeBonusSettings, [category]: [...safeBonusSettings[category]] }; updated[category][index] = Number(value) || 0; setBonusSettings(updated); };
  return (
    <div className="bg-white rounded-xl shadow-sm border max-w-2xl overflow-hidden">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center"><Settings className="h-5 w-5 mr-2 text-teal-600" /><h2 className="font-semibold text-slate-800">System Settings</h2></div>
      <div className="p-6 space-y-6">
        <div><label className="block text-sm font-bold text-slate-700 mb-1">Pay Period Anchor Date</label><input type="date" value={payPeriodStart} onChange={(e) => setPayPeriodStart(e.target.value)} className="w-full max-w-sm px-3 py-2 border rounded-md" /></div>
        <div className="border-t pt-5">
          <label className="flex items-center space-x-3 cursor-pointer group w-fit"><input type="checkbox" checked={isBonusActive || false} onChange={(e) => setIsBonusActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-teal-600" /><span className="font-bold text-slate-800 flex items-center"><Award className="h-5 w-5 mr-1.5 text-amber-500"/> Enable Performance Bonus System</span></label>
          {isBonusActive && (
            <div className="mt-4 ml-8 p-5 bg-slate-50 border rounded-lg space-y-5">
              <h4 className="text-sm font-bold border-b pb-2">Bonus Payout Configurations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div><h5 className="text-xs font-semibold uppercase mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5"/> Monthly Leaderboard</h5><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-yellow-600">1st Place</span><input type="number" min="0" value={safeBonusSettings.monthly[0]} onChange={(e)=>handleUpdateBonus('monthly', 0, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">2nd Place</span><input type="number" min="0" value={safeBonusSettings.monthly[1]} onChange={(e)=>handleUpdateBonus('monthly', 1, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div><div className="flex items-center justify-between"><span className="text-sm font-bold text-amber-700">3rd Place</span><input type="number" min="0" value={safeBonusSettings.monthly[2]} onChange={(e)=>handleUpdateBonus('monthly', 2, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div></div></div>
                <div><h5 className="text-xs font-semibold uppercase mb-3 flex items-center"><Trophy className="h-4 w-4 mr-1.5"/> Annual Grand Prizes</h5><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-yellow-600">1st Place</span><input type="number" min="0" value={safeBonusSettings.annual[0]} onChange={(e)=>handleUpdateBonus('annual', 0, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">2nd Place</span><input type="number" min="0" value={safeBonusSettings.annual[1]} onChange={(e)=>handleUpdateBonus('annual', 1, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div><div className="flex items-center justify-between"><span className="text-sm font-bold text-amber-700">3rd Place</span><input type="number" min="0" value={safeBonusSettings.annual[2]} onChange={(e)=>handleUpdateBonus('annual', 2, e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></div></div></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminClientFundsManager({ clients = [], expenses = [], clientExpenses = [] }) {
  const currentMonth = new Date().getMonth(); const currentYear = new Date().getFullYear();
  const fundData = clients.map(client => {
    const oopSpent = clientExpenses.filter(e => e && e.clientId === client.id && e.status === 'approved' && parseLocalSafe(e.date).getMonth() === currentMonth && parseLocalSafe(e.date).getFullYear() === currentYear).reduce((s, e) => s + Number(e.amount || 0), 0);
    const kmSpent = expenses.filter(e => e && e.clientId === client.id && e.status === 'approved' && parseLocalSafe(e.date).getMonth() === currentMonth && parseLocalSafe(e.date).getFullYear() === currentYear).reduce((s, e) => s + (Number(e.kilometers || 0) * 0.68), 0);
    const totalSpent = oopSpent + kmSpent; const allowance = Number(client.monthlyAllowance || 0); const remaining = allowance - totalSpent;
    return { ...client, allowance, oopSpent, kmSpent, totalSpent, remaining };
  });
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50 flex items-center"><Wallet className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Client Funds Tracker</h2></div><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 text-slate-500 text-sm border-b"><th className="px-6 py-3 font-medium">Client</th><th className="px-6 py-3 font-medium">Allowance</th><th className="px-6 py-3 font-medium">Receipts</th><th className="px-6 py-3 font-medium">Mileage</th><th className="px-6 py-3 font-medium text-right">Remaining</th></tr></thead><tbody className="divide-y divide-slate-100">{fundData.map(c => (<tr key={c.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-bold text-slate-800">{String(c.name)}</td><td className="px-6 py-4 text-slate-600">${c.allowance.toFixed(2)}</td><td className="px-6 py-4 text-amber-600 font-medium">${c.oopSpent.toFixed(2)}</td><td className="px-6 py-4 text-blue-600 font-medium">${c.kmSpent.toFixed(2)}</td><td className={`px-6 py-4 text-right font-black ${c.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>${c.remaining.toFixed(2)}</td></tr>))}</tbody></table></div></div>
  );
}

function TimeOffManager({ employees = [], timeOffLogs = [], onAddTimeOff, onRemoveTimeOff }) {
  const [empId, setEmpId] = useState(''); const [type, setType] = useState('sick'); const [date, setDate] = useState('');
  const handleAdd = e => { e.preventDefault(); if(!empId || !date) return; onAddTimeOff({ employeeId: empId, type, date }); setEmpId(''); setDate(''); };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-bold">Time Off Logs</h2></div><div className="p-4 space-y-3">{safeSortByDateDesc(timeOffLogs).map(log => { const emp = employees.find(e => e.id === log.employeeId); return (<div key={log.id} className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm"><div><div className="font-bold text-slate-800">{String(emp?.name || 'Unknown')}</div><div className="text-sm text-slate-500">{String(log.date || '')} &bull; <span className="uppercase text-xs font-bold">{String(log.type || '')}</span></div></div><button onClick={() => onRemoveTimeOff(log.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="h-4 w-4"/></button></div>); })}</div></div>
      <div className="bg-white rounded-xl shadow-sm border h-fit"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-bold">Log Time Off</h2></div><form onSubmit={handleAdd} className="p-6 space-y-4"><div><label className="block text-sm mb-1">Employee</label><select value={empId} onChange={e=>setEmpId(e.target.value)} className="w-full border rounded p-2" required><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{String(e.name)}</option>)}</select></div><div><label className="block text-sm mb-1">Type</label><select value={type} onChange={e=>setType(e.target.value)} className="w-full border rounded p-2"><option value="sick">Sick Day</option><option value="vacation">Vacation Day</option></select></div><div><label className="block text-sm mb-1">Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border rounded p-2" required/></div><button type="submit" className="w-full bg-teal-600 text-white rounded py-2 font-bold">Log Record</button></form></div>
    </div>
  );
}

function PaystubManager({ paystubs = [], employees = [], onAddPaystub, onRemovePaystub }) {
  const [empId, setEmpId] = useState(''); const [date, setDate] = useState(''); const [file, setFile] = useState(null);
  const handleAdd = e => { e.preventDefault(); if(!empId || !date || !file) return; onAddPaystub({ employeeId: empId, date, fileName: file.name }); setEmpId(''); setDate(''); setFile(null); };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-bold">Distributed Paystubs</h2></div><div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">{safeSortByDateDesc(paystubs).map(ps => { const emp = employees.find(e => e.id === ps.employeeId); return (<div key={ps.id} className="border rounded-lg p-4 flex justify-between items-center bg-white shadow-sm"><div><div className="font-bold text-slate-800">{String(emp?.name || 'Unknown')}</div><div className="text-xs text-slate-500 mt-1">{String(ps.date || '')} &bull; {String(ps.fileName || '')}</div></div><button onClick={() => onRemovePaystub(ps.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="h-4 w-4"/></button></div>); })}</div></div>
      <div className="bg-white rounded-xl shadow-sm border h-fit"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-bold">Upload Paystub</h2></div><form onSubmit={handleAdd} className="p-6 space-y-4"><div><label className="block text-sm mb-1">Employee</label><select value={empId} onChange={e=>setEmpId(e.target.value)} className="w-full border rounded p-2" required><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{String(e.name)}</option>)}</select></div><div><label className="block text-sm mb-1">Pay Period Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border rounded p-2" required/></div><div><label className="block text-sm mb-1">Document</label><input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full text-sm" required/></div><button type="submit" className="w-full bg-teal-600 text-white rounded py-2 font-bold">Upload Paystub</button></form></div>
    </div>
  );
}

function ExpenseManager({ expenses = [], clientExpenses = [], employees = [], clients = [], onUpdateExpense, onUpdateClientExpense }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const filteredExp = expenses.filter(e => { if (!selectedMonth) return true; return String(e.date || '').startsWith(selectedMonth); });
  const filteredCE = clientExpenses.filter(e => { if (!selectedMonth) return true; return String(e.date || '').startsWith(selectedMonth); });
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center"><div><h2 className="text-lg font-bold">Reimbursements</h2></div><div className="flex items-center"><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded-md px-2 py-1 text-sm"/></div></div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Client Expenses (Out-of-Pocket)</h2></div><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 text-slate-500 text-sm border-b"><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Staff / Client</th><th className="px-6 py-3 font-medium">Amount</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{safeSortByDateDesc(filteredCE).map(e => (<tr key={e.id} className="hover:bg-slate-50"><td className="px-6 py-4 text-sm">{e.date}</td><td className="px-6 py-4 text-sm">{employees.find(em=>em.id===e.employeeId)?.name} <br/><span className="text-xs text-slate-500">for {clients.find(c=>c.id===e.clientId)?.name}</span></td><td className="px-6 py-4 text-sm font-semibold">${Number(e.amount||0).toFixed(2)}</td><td className="px-6 py-4 text-sm">{e.status}</td><td className="px-6 py-4 text-right">{e.status === 'pending' && (<><button onClick={() => onUpdateClientExpense(e.id, 'approved')} className="text-green-600 p-1"><CheckCircle className="h-5 w-5"/></button><button onClick={() => onUpdateClientExpense(e.id, 'rejected')} className="text-red-600 p-1"><XCircle className="h-5 w-5"/></button></>)}</td></tr>))}</tbody></table></div></div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Mileage Approvals</h2></div><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 text-slate-500 text-sm border-b"><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Staff / Client</th><th className="px-6 py-3 font-medium">KM</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{safeSortByDateDesc(filteredExp).map(e => (<tr key={e.id} className="hover:bg-slate-50"><td className="px-6 py-4 text-sm">{e.date}</td><td className="px-6 py-4 text-sm">{employees.find(em=>em.id===e.employeeId)?.name} <br/><span className="text-xs text-slate-500">for {clients.find(c=>c.id===e.clientId)?.name}</span></td><td className="px-6 py-4 text-sm font-semibold">{e.kilometers} km</td><td className="px-6 py-4 text-sm">{e.status}</td><td className="px-6 py-4 text-right">{e.status === 'pending' && (<><button onClick={() => onUpdateExpense(e.id, 'approved')} className="text-green-600 p-1"><CheckCircle className="h-5 w-5"/></button><button onClick={() => onUpdateExpense(e.id, 'rejected')} className="text-red-600 p-1"><XCircle className="h-5 w-5"/></button></>)}</td></tr>))}</tbody></table></div></div>
    </div>
  );
}

function AdminEarningsManager({ employees = [], shifts = [], expenses = [], clientExpenses = [], payPeriodStart, isBonusActive, bonusSettings }) {
  const allPeriods = useMemo(() => getPastPayPeriods(payPeriodStart || '2026-04-01', 10), [payPeriodStart]);
  const [selectedPeriodTime, setSelectedPeriodTime] = useState(allPeriods[0].start.getTime().toString());
  const activePeriod = allPeriods.find(p => p.start.getTime().toString() === selectedPeriodTime) || allPeriods[0];
  
  const employeeEarnings = employees.map(emp => {
    const data = calculateEarnings(emp, activePeriod.start, activePeriod.end, shifts, expenses, clientExpenses);
    return { ...emp, ...data, totalEarnings: data.total };
  }).sort((a, b) => b.totalEarnings - a.totalEarnings);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-semibold flex items-center"><Coins className="h-5 w-5 mr-2 text-teal-600" /> Team Earnings Overview</h2><select value={selectedPeriodTime} onChange={(e) => setSelectedPeriodTime(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">{allPeriods.map((period) => (<option key={period.start.getTime()} value={period.start.getTime().toString()}>{period.start.toLocaleDateString()} - {period.end.toLocaleDateString()}</option>))}</select></div><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 text-slate-500 text-sm border-b"><th className="px-6 py-3 font-medium">Employee</th><th className="px-6 py-3 font-medium">Shift Earnings</th><th className="px-6 py-3 font-medium">Mileage</th><th className="px-6 py-3 font-medium">Out-of-Pocket</th><th className="px-6 py-3 font-medium text-right">Total Due</th></tr></thead><tbody className="divide-y divide-slate-100">{employeeEarnings.map(emp => (<tr key={emp.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="font-semibold text-slate-800">{emp.name}</div></td><td className="px-6 py-4 text-sm text-slate-600">${emp.shiftEarnings.toFixed(2)}</td><td className="px-6 py-4 text-sm text-slate-600">${emp.kmEarnings.toFixed(2)}</td><td className="px-6 py-4 text-sm text-slate-600">${emp.oop.toFixed(2)}</td><td className="px-6 py-4 text-right text-emerald-600 font-bold">${emp.totalEarnings.toFixed(2)}</td></tr>))}</tbody></table></div></div>
  );
}

function ClientManager({ clients = [], onAddClient, onRemoveClient, updateClient }) {
  const [newClientName, setNewClientName] = useState(''); const [newAllowance, setNewAllowance] = useState('500');
  const handleAdd = (e) => { e.preventDefault(); if(!newClientName.trim()) return; onAddClient({ id: `client_${Date.now()}`, name: newClientName, monthlyAllowance: Number(newAllowance) || 0 }); setNewClientName(''); setNewAllowance('500'); };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden"><div className="px-6 py-4 border-b bg-slate-50 flex items-center"><Heart className="h-5 w-5 mr-2 text-teal-600"/><h2 className="text-lg font-bold text-slate-800">Client Roster</h2></div><div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">{clients.map(c => (<div key={c.id} className="border rounded-xl p-4 flex flex-col justify-between bg-white relative"><button onClick={() => onRemoveClient(c.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-600"><Trash2 className="h-4 w-4"/></button><div className="flex items-center space-x-3 mb-3"><div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-5 w-5"/></div><div><h3 className="font-bold text-slate-800 leading-tight">{String(c.name || '')}</h3></div></div><div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-600 border flex justify-between items-center"><span className="font-medium">Monthly Allowance:</span><span className="font-bold text-teal-700">${Number(c.monthlyAllowance || 0).toFixed(2)}</span></div></div>))}</div></div>
      <div className="bg-white rounded-xl shadow-sm border h-fit"><div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Add Client</h2></div><form onSubmit={handleAdd} className="p-6 space-y-4"><div><label className="block text-sm font-medium mb-1">Client Name *</label><input type="text" value={newClientName} onChange={e=>setNewClientName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required/></div><div><label className="block text-sm font-medium mb-1">Monthly Allowance ($)</label><input type="number" value={newAllowance} onChange={e=>setNewAllowance(e.target.value)} className="w-full px-3 py-2 border rounded-md" required/></div><button type="submit" className="w-full flex items-center justify-center bg-teal-600 text-white font-medium py-2 rounded-md hover:bg-teal-700"><Plus className="h-4 w-4 mr-1"/> Add Client</button></form></div>
    </div>
  );
}

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '', username: employee?.username || '', password: employee?.password || '', role: employee?.role || 'Neighbour', phone: employee?.phone || '', email: employee?.email || '', address: employee?.address || '', payType: employee?.payType || 'per_visit', hourlyWage: employee?.hourlyWage || 22.50, perVisitRate: employee?.perVisitRate || 45, emergencyContactName: employee?.emergencyContactName || '', emergencyContactPhone: employee?.emergencyContactPhone || '', requirements: employee?.requirements || {}, timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 }, availability: employee?.availability || []
  });
  const [photoFile, setPhotoFile] = useState(null); 
  const [activeTab, setActiveTab] = useState('profile'); 
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6"><button type="button" onClick={() => setActiveTab('profile')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>Personal & Contact</button><button type="button" onClick={() => setActiveTab('compliance')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>Certificates & Clearances</button></div>
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div></div>
                  <div className="grid grid-cols-3 gap-3 border p-3 rounded-md bg-white">
                    <div className="col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label><select value={formData.payType} onChange={(e) => handleChange('payType', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-teal-50"><option value="per_visit">Per Visit</option><option value="hourly">Hourly</option></select></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Per Visit Rate ($)</label><input type="number" min="0" step="1" value={formData.perVisitRate} onChange={(e) => handleChange('perVisitRate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Hourly Wage ($)</label><input type="number" min="0" step="0.50" value={formData.hourlyWage} onChange={(e) => handleChange('hourlyWage', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm"><option value="Neighbour">Neighbour</option><option value="Block Captain">Block Captain</option><option value="Administrator">Administrator</option></select></div>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Update Photo</label><input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="w-full text-sm" /></div>
                </div>
              </div>
            </div>
            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '', fileUrl: null };
                  return (
                    <div key={req.key} className="bg-white border p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{req.label}</label>
                        <select value={currentData.status} onChange={(e) => handleReqChange(req.key, 'status', e.target.value)} className="mt-1 xl:mt-0 text-xs font-medium rounded border px-2 py-1"><option value="missing">Missing</option><option value="valid">Valid</option><option value="expired">Expired</option><option value="not_applicable">N/A</option></select>
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button><button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm text-white bg-teal-600 rounded-md">Save Profile</button></div>
      </div>
    </div>
  );
}

function EmployeeManager({ employees = [], onAddEmployee, onRemoveEmployee, updateEmployee, currentUser }) {
  const [newName, setNewName] = useState(''); const [newUsername, setNewUsername] = useState(''); const [newPassword, setNewPassword] = useState(''); const [newRole, setNewRole] = useState('Neighbour'); const [newPayType, setNewPayType] = useState('per_visit'); const [newHourlyWage, setNewHourlyWage] = useState('22.50'); const [newPerVisitRate, setNewPerVisitRate] = useState('45'); const [editingEmployee, setEditingEmployee] = useState(null);
  const handleAddEmployee = (e) => { e.preventDefault(); if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return; const newEmp = { id: `emp_${Date.now()}`, name: newName, username: newUsername.trim(), password: newPassword, role: newRole, payType: newPayType, hourlyWage: Number(newHourlyWage) || 22.50, perVisitRate: Number(newPerVisitRate) || 45, requirements: {}, timeOffBalances: { sick: 5, vacation: 10 }, availability: [] }; if (onAddEmployee) onAddEmployee(newEmp); setNewName(''); setNewUsername(''); setNewPassword(''); };
  const getComplianceIssues = (emp) => { let issues = 0; ONTARIO_REQUIREMENTS.forEach(req => { const status = emp?.requirements?.[req.key]?.status || 'missing'; if (status === 'missing' || status === 'expired') issues++; }); return issues; };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between"><div className="flex items-center"><Users className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2></div></div>
        <div className="divide-y divide-slate-100 p-4 gap-4 bg-slate-50/50 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2">
          {employees.map(emp => {
            const issuesCount = getComplianceIssues(emp); 
            // Allow admin to edit themselves, prevent others from editing admin1
            const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
            const finalPhotoUrl = cleanPhotoUrl(emp.photoUrl);
            return (
              <div key={emp.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white relative">
                {!isProtected && (<div className="absolute top-3 right-3 flex space-x-1"><button onClick={() => setEditingEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit className="h-4 w-4" /></button>{emp.id !== 'admin1' && <button onClick={() => onRemoveEmployee && onRemoveEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>)}
                <div className="flex items-center space-x-3 mb-3 pr-16">
                  <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 overflow-hidden border-2 border-teal-50">
                    {finalPhotoUrl ? <img src={finalPhotoUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-6 w-6" />}
                  </div>
                  <div><h3 className="font-bold text-slate-800">{String(emp.name)}</h3><span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block">{String(emp.role)}</span></div>
                </div>
                <div className="mt-auto space-y-2">{issuesCount > 0 ? <div className="flex items-center justify-center text-xs font-semibold bg-red-50 text-red-700 p-2 rounded border border-red-100"><AlertCircle className="h-3.5 w-3.5 mr-1.5" />{issuesCount} Issue(s)</div> : <div className="flex items-center justify-center text-xs font-semibold bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Compliant</div>}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border h-fit">
        <div className="px-6 py-4 border-b bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Add Employee</h2></div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Username *</label><input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div><div><label className="block text-sm font-medium mb-1">Password *</label><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required /></div></div>
          <button type="submit" className="w-full flex items-center justify-center space-x-2 py-2 px-4 border rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 mr-2" />Add Employee</button>
        </form>
      </div>
      {editingEmployee && <EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSave={(id, data) => { if (updateEmployee) updateEmployee(id, data); setEditingEmployee(null); }} />}
    </div>
  );
}

function ClientProfileModal({ client, remainingBalance, onClose }) {
  if (!client) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0"><h3 className="text-lg font-bold flex items-center"><Heart className="h-5 w-5 mr-2 text-teal-200" /> Client Profile</h3><button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button></div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center space-x-4">
            {client.photoUrl ? <img src={client.photoUrl} alt={client.name} className="h-16 w-16 rounded-full border-2 border-teal-100 object-cover" /> : <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-8 w-8" /></div>}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><Wallet className="h-3 w-3 mr-1" /> ${Number(remainingBalance).toFixed(2)} Funds Left</div>
                {client.dateOfBirth && <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><CalendarDays className="h-3 w-3 mr-1" /> DOB: {client.dateOfBirth}</div>}
              </div>
            </div>
          </div>
          {(client.phone || client.address) && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              {client.phone && <div className="text-sm text-slate-700 flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400" /> {client.phone}</div>}
              {client.address && <div className="text-sm text-slate-700 flex items-center"><MapPin className="h-4 w-4 mr-2 text-slate-400" /> {client.address}</div>}
            </div>
          )}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Info className="h-4 w-4 mr-1.5" /> Care Notes & Routine</h4><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{client.notes || 'No special instructions provided.'}</p></div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">Close</button></div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], documents = [], onSendMessage, payPeriodStart, onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const myShifts = shifts.filter(s => s && s.employeeId === currentUser.id);
  const openShifts = shifts.filter(s => s && s.employeeId === 'unassigned');
  const now = new Date();
  const upcomingShifts = safeShiftsSort(myShifts.filter(s => s && s.date && s.endTime && new Date(`${s.date}T${s.endTime}`) > now));
  const nextShift = upcomingShifts[0];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const finalPhotoUrl = cleanPhotoUrl(currentUser.photoUrl);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file && onUpdateProfile) {
      const photoUrl = URL.createObjectURL(file);
      onUpdateProfile(currentUser.id, { photoUrl });
    }
  };

  const renderSchedule = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />{monthNames[month]} {year}</h2>
        <div className="flex space-x-2">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
        {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>))}
        {daysArray.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
          const holiday = getHoliday(dateStr);
          const dayShifts = myShifts.filter(s => s && s.date === dateStr);
          return (
            <div key={day} className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative ${holiday ? 'bg-purple-50/50' : ''}`}>
              <div className="font-medium text-sm text-slate-600 mb-1">{day}</div>
              <div className="space-y-1">
                {dayShifts.map(shift => {
                  const client = clients.find(c => c && c.id === shift.clientId);
                  return (
                    <div key={shift.id} onClick={() => setSelectedClient(client)} className="text-xs p-1.5 rounded bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer hover:bg-teal-200 transition shadow-sm">
                      <div className="font-semibold truncate flex items-center"><Heart className="h-2.5 w-2.5 mr-1 shrink-0 text-teal-600" />{client?.name?.split(' ')[0] || 'Unknown'}</div>
                      <div className="text-[10px] mt-0.5 opacity-90 flex items-center"><Clock className="h-2.5 w-2.5 mr-1 shrink-0" />{shift.startTime}-{shift.endTime}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="h-24 w-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-4 border-teal-50 shadow-sm overflow-hidden">
                {finalPhotoUrl ? <img src={finalPhotoUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-10 w-10" />}
              </div>
              <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-teal-600 p-1.5 rounded-full text-white cursor-pointer shadow-md hover:bg-teal-700 transition opacity-80 group-hover:opacity-100">
                <Camera className="h-4 w-4" />
                <input id="profile-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
              </label>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{String(currentUser.name)}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
              <span className="text-xs font-semibold text-slate-500">{currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}</span>
            </div>
          </div>
        </div>
        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>My Schedule</button>
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
                      {upcomingShifts.length === 0 ? (<div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>) : (
                        upcomingShifts.map(shift => {
                          const client = clients.find(c => c && c.id === shift.clientId);
                          const d = parseLocalSafe(shift.date);
                          return (
                            <div key={shift.id || Math.random()} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start space-x-4">
                                <div className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px]">
                                  <div className="text-xs font-bold text-teal-600 uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                                  <div className="text-xl font-extrabold text-teal-800">{d.getDate()}</div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800">{client?.name || 'Unknown Client'}</h4>
                                  <div className="text-sm text-slate-600 flex items-center mt-1"><Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}</div>
                                </div>
                              </div>
                              <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">Care Plan</button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : ( renderSchedule() )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================
function AdminDashboard({ shifts, employees, clients, currentUser, onAddEmployee, onRemoveEmployee, updateEmployee, onAddShift, onRemoveShift, onMarkShiftOpen }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const renderAdminTab = () => {
    switch (activeTab) {
      case 'employees': return <EmployeeManager employees={employees} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />;
      case 'schedule':
      default: return (
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
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
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
                const holiday = getHoliday(dateStr);
                const dayShifts = shifts.filter(s => s && s.date === dateStr);
                return (
                  <div key={day} onClick={() => { setSelectedDateStr(dateStr); setIsModalOpen(true); }} className={`min-h-[120px] p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-1 gap-1 flex-wrap"><span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{day}</span></div>
                    <div className="space-y-1">
                      {dayShifts.map(shift => {
                        const isOpen = shift.employeeId === 'unassigned';
                        const emp = isOpen ? null : employees.find(e => e.id === shift.employeeId);
                        const client = clients.find(c => c.id === shift.clientId);
                        return (
                          <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`}>
                            <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>{isOpen ? '🚨 OPEN SHIFT' : String(emp?.name?.split(' ')[0] || 'Unknown')}</div>
                            <div className="text-[10px] mt-0.5 opacity-90">{shift.startTime} - {shift.endTime}</div>
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
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1><p className="text-slate-500">Manage schedule and personnel.</p></div>
        {activeTab === 'schedule' && (<button onClick={() => { setSelectedDateStr(`${year}-${String(month + 1).padStart(2, '0')}-01`); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition"><Plus className="h-5 w-5" /><span>Add Shift</span></button>)}
      </div>
      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
        {[ {id: 'schedule', icon: CalendarIcon, label: 'Schedule'}, {id: 'employees', icon: Users, label: 'Employees'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}><tab.icon className="h-4 w-4 mr-2" /> {tab.label}</button>
        ))}
      </div>
      {renderAdminTab()}
      {isModalOpen && (<AddShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDateStr} employees={employees} clients={clients} onSave={onAddShift} />)}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [viewMode, setViewMode] = useState('employee');
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clientExpenses, setClientExpenses] = useState([]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error('Firebase Auth Error:', error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, user => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !db) return;
    const getCol = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubs = [];
    const handleError = (err) => console.error("Firestore Error:", err);
    unsubs.push(onSnapshot(getCol('gn_employees'), snap => { setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id }))); setIsDbReady(true); }, handleError));
    unsubs.push(onSnapshot(getCol('gn_shifts'), snap => setShifts(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clients'), snap => setClients(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    return () => unsubs.forEach(unsub => unsub());
  }, [firebaseUser]);

  const handleLogin = (username, password) => {
    const foundEmp = employees.find(e => String(e.username).toLowerCase() === String(username).toLowerCase() && e.password === password);
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', photoUrl: foundEmp.photoUrl });
      setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
    } else { alert("Invalid credentials."); }
  };

  const handleLogout = () => { setCurrentUser(null); setViewMode('employee'); };

  const runMutation = async (cName, dId, action, data) => {
    if(!firebaseUser) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', cName, String(dId));
    if(action === 'set') await setDoc(ref, data);
    if(action === 'update') await updateDoc(ref, data);
    if(action === 'delete') await deleteDoc(ref);
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={isDbReady} hasData={employees.length > 0} onSeedData={() => {}} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const finalCurrentUserPhotoUrl = cleanPhotoUrl(currentUser.photoUrl);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (<button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">{viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}</button>)}
          <div className="flex items-center text-sm hidden sm:flex">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border border-teal-500 overflow-hidden mr-2">
              {finalCurrentUserPhotoUrl ? <img src={finalCurrentUserPhotoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" /> : <User className="h-4 w-4"/>}
            </div>
            {String(currentUser.name)}
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-teal-600 transition" title="Logout"><LogOut className="h-5 w-5"/></button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {isAdmin && viewMode === 'admin' ? (
          <AdminDashboard shifts={shifts} employees={employees} clients={clients} currentUser={currentUser} onAddEmployee={(d) => runMutation('gn_employees', d.id, 'set', d)} onRemoveEmployee={(id) => runMutation('gn_employees', id, 'delete')} updateEmployee={(id, d) => runMutation('gn_employees', id, 'update', d)} onAddShift={(d) => runMutation('gn_shifts', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveShift={(id) => runMutation('gn_shifts', id, 'delete')} onMarkShiftOpen={(id) => runMutation('gn_shifts', id, 'update', { employeeId: 'unassigned' })} />
        ) : (
          <EmployeeDashboard shifts={shifts} employees={employees} currentUser={currentUser} clients={clients} expenses={expenses} onAddExpense={(d) => runMutation('gn_expenses', Date.now(), 'set', { ...d, id: Date.now(), status: 'pending' })} clientExpenses={clientExpenses} onAddClientExpense={(d) => runMutation('gn_clientExpenses', Date.now(), 'set', { ...d, id: Date.now(), status: 'pending' })} setSelectedClient={setSelectedClient} onUpdateProfile={(id, d) => { runMutation('gn_employees', id, 'update', d); setCurrentUser(prev => ({ ...prev, ...d })); }} />
        )}
      </main>

      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={0} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}
