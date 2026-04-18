import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, ShieldAlert, Trash2, Users, Heart, Coins, Star, Settings, Car, Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Coffee, Wallet, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, Bell, PlusCircle, MessageSquare, Send, Download, Sun, Activity } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMhO6iAPDuWJhZLdWZ_orO8-AyWDItnQo",
  authDomain: "good-neighbour-portal.firebaseapp.com",
  projectId: "good-neighbour-portal",
  storageBucket: "good-neighbour-portal.firebasestorage.app",
  messagingSenderId: "570654987529",
  appId: "1:570654987529:web:400f90a7a63a03b6aa6fd8",
  measurementId: "G-C3P8CNHYK9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- ONTARIO COMPLIANCE REQUIREMENTS ---
const ONTARIO_REQUIREMENTS = [
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
const MOCK_EMPLOYEES = [
  { 
    id: 'admin1', 
    name: 'Master Admin', 
    role: 'Administrator',
    username: 'admin',
    password: 'admin',
    phone: '555-0000',
    email: 'admin@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=0f766e',
    requirements: {},
    timeOffBalances: { sick: 5, vacation: 15 }
  },
  { 
    id: 'emp1', 
    name: 'Alice Smith', 
    role: 'Block Captain',
    username: 'alice',
    password: 'password',
    phone: '555-1001',
    email: 'alice.s@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&backgroundColor=0f766e',
    requirements: {
      cpr: { status: 'valid', expiryDate: '2027-01-15' },
      vsc: { status: 'valid', expiryDate: '2028-04-10' },
      whmis: { status: 'valid' }
    },
    timeOffBalances: { sick: 5, vacation: 10 }
  },
  { 
    id: 'emp2', 
    name: 'Bob Jones', 
    role: 'Neighbour',
    username: 'bob',
    password: 'password',
    phone: '555-1002',
    email: 'bob.j@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=0f766e',
    requirements: {
      cpr: { status: 'expired', expiryDate: '2025-12-01' },
      maskFit: { status: 'missing' }
    },
    timeOffBalances: { sick: 5, vacation: 10 }
  },
  { 
    id: 'emp3', 
    name: 'Charlie Davis', 
    role: 'Neighbour',
    username: 'charlie',
    password: 'password',
    phone: '555-1003',
    email: 'charlie.d@goodneighbour.ca',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=0f766e',
    requirements: {
      vsc: { status: 'pending' }
    },
    timeOffBalances: { sick: 5, vacation: 10 }
  },
];

const MOCK_CLIENTS = [
  { 
    id: 'client1', 
    name: 'Eleanor Vance', 
    notes: 'Needs mobility assistance. Please ensure all rugs are flat and walkways are clear. Loves talking about her garden.', 
    emergencyContactName: 'Robert Vance (Son)',
    emergencyContactPhone: '555-0101',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleanor&backgroundColor=0d9488',
    monthlyAllowance: 100
  },
  { 
    id: 'client2', 
    name: 'John Miller', 
    notes: 'Dementia care. Requires patience and gentle redirection. Do not argue if he is confused about the year.', 
    emergencyContactName: 'Sarah Miller (Wife)',
    emergencyContactPhone: '555-0202',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John&backgroundColor=0d9488',
    monthlyAllowance: 50
  },
  { 
    id: 'client3', 
    name: 'Mary Johnson', 
    notes: 'Companionship and light housekeeping. Hard of hearing in left ear, ensure you speak clearly and face her.', 
    emergencyContactName: 'David Johnson (Brother)',
    emergencyContactPhone: '555-0303',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary&backgroundColor=0d9488',
    monthlyAllowance: 150
  },
];

const INITIAL_SHIFTS = [
  { id: 'shift_101', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_102', employeeId: 'emp1', clientId: 'client3', date: '2026-04-12', startTime: '09:00', endTime: '17:00' },
  { id: 'shift_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-15', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_2', employeeId: 'emp2', clientId: 'client2', date: '2026-04-15', startTime: '14:00', endTime: '22:00' },
  { id: 'shift_3', employeeId: 'emp3', clientId: 'client3', date: '2026-04-16', startTime: '09:00', endTime: '17:00' },
  { id: 'shift_4', employeeId: 'emp1', clientId: 'client1', date: '2026-04-18', startTime: '08:00', endTime: '16:00' },
  { id: 'shift_5', employeeId: 'emp2', clientId: 'client2', date: '2026-04-20', startTime: '22:00', endTime: '06:00' },
];

const INITIAL_EXPENSES = [
  { id: 'exp_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', kilometers: 15, description: 'Drove Eleanor to the grocery store and pharmacy.', status: 'approved' },
  { id: 'exp_2', employeeId: 'emp2', clientId: 'client2', date: '2026-04-15', kilometers: 8, description: 'Took John out for a park outing and fresh air.', status: 'pending' },
];

const INITIAL_CLIENT_EXPENSES = [
  { id: 'ce_1', employeeId: 'emp1', clientId: 'client1', date: '2026-04-10', amount: 8.50, description: 'Coffee and a muffin at the cafe.', receiptDetails: 'cafe_receipt.jpg', status: 'approved' },
];

const INITIAL_PAYSTUBS = [
  { id: 'ps_1', employeeId: 'emp1', date: '2026-03-31', fileName: 'paystub_mar31_2026.pdf' },
];

const INITIAL_TIME_OFF = [
  { id: 'to_1', employeeId: 'emp2', type: 'sick', date: '2026-04-05', note: 'Flu' }
];

const INITIAL_MESSAGES = [
  { id: 'msg_1', senderId: 'admin1', text: 'Welcome to the Good Neighbour Portal! Please ensure all client notes are read before arriving for your shift.', date: '2026-04-01T09:00:00Z' },
  { id: 'msg_2', senderId: 'emp1', text: 'Reminder: Team touch-base meeting this Friday at 4 PM via Zoom. Check your emails for the link. See you there!', date: '2026-04-10T14:30:00Z' }
];

// ==========================================
// HELPERS
// ==========================================
const parseLocal = (dateStr) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [cY, cM, cD] = currentDateStr.split('-').map(Number);
  
  const start = Date.UTC(sY, sM - 1, sD);
  const current = Date.UTC(cY, cM - 1, cD);
  
  const diffDays = (current - start) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays % 14 === 0;
};

const getPayPeriodBounds = (anchorDateStr) => {
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

const getPastPayPeriods = (anchorDateStr, numPeriods = 104) => {
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

const getOntarioHolidays = (year) => {
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
const getHoliday = (dateStr) => {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0], 10);
  if (!CACHED_HOLIDAYS[year]) {
    CACHED_HOLIDAYS[year] = getOntarioHolidays(year);
  }
  return CACHED_HOLIDAYS[year].find(h => h.date === dateStr);
};

// ==========================================
// SUBCOMPONENTS (BOTTOM-UP DEFINITION)
// ==========================================

function LoginPage({ onLogin, onSeedData, isDbReady, hasData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-teal-600 p-4 rounded-full shadow-lg border-4 border-white">
            <Briefcase className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Good Neighbour Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your cloud-synced schedule
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-teal-100">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <div className="mt-1">
                <input 
                  type="text" 
                  required 
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={!isDbReady}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input 
                  type="password" 
                  required 
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={!isDbReady}
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={!isDbReady || (!hasData && isDbReady)}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isDbReady ? 'Secure Sign In' : 'Connecting to Server...'}
              </button>
            </div>
          </form>

          {isDbReady && !hasData && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-center shadow-inner">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800 mb-3">
                  The cloud database is currently empty.
                </p>
                <button 
                  onClick={onSeedData}
                  className="px-4 py-2 w-full bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-bold shadow transition"
                >
                  Initialize Demo Database
                </button>
              </div>
            </div>
          )}

          {isDbReady && hasData && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      <strong>Demo Accounts (Ready):</strong><br/>
                      Admin: <code>admin</code> / <code>admin</code><br/>
                      Staff: <code>alice</code> / <code>password</code><br/>
                    </p>
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

function Announcements({ messages, onSendMessage, currentUser, employees }) {
  const [newMsg, setNewMsg] = useState('');
  
  const canSend = currentUser.role === 'Administrator' || currentUser.role === 'admin' || currentUser.role === 'Block Captain';

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    onSendMessage(newMsg, currentUser.id);
    setNewMsg('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
        <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-semibold text-slate-800">Team Announcements</h2>
      </div>
      <div className="p-6 flex flex-col gap-6">
        {canSend && (
          <form onSubmit={handleSend} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-sm font-semibold text-slate-700">Broadcast New Message</label>
            <textarea 
              value={newMsg} 
              onChange={(e) => setNewMsg(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
              placeholder="Write an announcement to share with the whole team..." 
              rows="3" 
              required
            />
            <button 
              type="submit" 
              className="self-end bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 flex items-center text-sm font-medium transition"
            >
              <Send className="h-4 w-4 mr-2" /> Send Announcement
            </button>
          </form>
        )}
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No announcements at this time.</p>
          ) : (
            messages.map(msg => {
              const sender = employees.find(e => e.id === msg.senderId) || 
                            (msg.senderId === 'admin1' ? { name: 'Master Admin', role: 'Administrator' } : { name: 'Unknown', role: 'Staff' });
              return (
                <div key={msg.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow transition">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                    <div className="font-semibold text-slate-800 text-sm flex items-center">
                      <User className="h-4 w-4 mr-1.5 text-slate-400" />
                      {sender.name} 
                      <span className={`ml-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                        sender.role === 'Administrator' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {sender.role}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                      {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AddShiftModal({ isOpen, onClose, selectedDate, employees, clients, onSave }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newShifts = [];
    const baseDate = parseLocal(selectedDate);

    if (isRecurring) {
      for (let i = 0; i < recurrenceWeeks; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + (i * 7));
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        
        if (getHoliday(dateStr)) {
          continue;
        }
        
        newShifts.push({ employeeId, clientId, date: dateStr, startTime, endTime });
      }
    } else {
      newShifts.push({ employeeId, clientId, date: selectedDate, startTime, endTime });
    }

    onSave(newShifts);
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              readOnly 
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select 
              value={clientId} 
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={isRecurring} 
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span>Repeat Weekly</span>
            </label>
            
            {isRecurring && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">For how many weeks?</label>
                  <select 
                    value={recurrenceWeeks}
                    onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value={4}>4 Weeks (1 Month)</option>
                    <option value={12}>12 Weeks (3 Months)</option>
                    <option value={26}>26 Weeks (6 Months)</option>
                    <option value={52}>52 Weeks (1 Year)</option>
                  </select>
                </div>
                <div className="flex items-start text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200">
                  <Info className="h-4 w-4 mr-1.5 shrink-0 mt-0.5" />
                  <p>Shifts falling on Ontario Public Holidays will be automatically skipped.</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition"
            >
              Save Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: employee.name || '',
    username: employee.username || '',
    password: employee.password || '',
    role: employee.role || 'Neighbour',
    phone: employee.phone || '',
    email: employee.email || '',
    address: employee.address || '',
    emergencyContactName: employee.emergencyContactName || '',
    emergencyContactPhone: employee.emergencyContactPhone || '',
    requirements: employee.requirements || {},
    timeOffBalances: employee.timeOffBalances || { sick: 5, vacation: 10 }
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); 

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleTimeOffChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      timeOffBalances: {
        ...prev.timeOffBalances,
        [type]: Number(value)
      }
    }));
  };

  const handleReqChange = (reqKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [reqKey]: {
          ...(prev.requirements[reqKey] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const updatedData = { ...formData };
    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }
    onSave(employee.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white">
          <h3 className="text-lg font-bold flex items-center">
            <User className="h-5 w-5 mr-2 text-teal-200" />
            Edit Employee: {employee.name}
          </h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Personal & Contact Profile
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Certificates & Clearances (Ontario)
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                      <input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                      <input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                      <option value="Neighbour">Neighbour</option>
                      <option value="Block Captain">Block Captain</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
                    <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('edit-emp-photo-upload').click()}>
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                        <div className="flex text-xs text-slate-600 justify-center">
                          <span className="relative font-medium text-teal-600">{photoFile ? photoFile.name : <span>Upload a new photo</span>}</span>
                        </div>
                      </div>
                      <input id="edit-emp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                    <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Time Off Allocation (Annual)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Sick Days / Yr</label>
                    <input type="number" min="0" value={formData.timeOffBalances.sick} onChange={(e) => handleTimeOffChange('sick', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Vacation Days / Yr</label>
                    <input type="number" min="0" value={formData.timeOffBalances.vacation} onChange={(e) => handleTimeOffChange('vacation', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><Phone className="h-4 w-4 mr-1.5 text-slate-500"/> Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name / Relation</label>
                    <input type="text" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. John Doe (Husband)" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                    <input type="text" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm p-4 rounded-xl mb-6 flex items-start">
                <Info className="h-5 w-5 mr-2 shrink-0 mt-0.5 text-blue-600"/>
                <p>Track mandatory employer requirements for Ontario. Set status to "Missing" or "Expired" to flag this employee on the main dashboard.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '' };
                  return (
                    <div key={req.key} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{req.label}</label>
                        <select 
                          value={currentData.status} 
                          onChange={(e) => handleReqChange(req.key, 'status', e.target.value)}
                          className={`mt-1 xl:mt-0 text-xs font-medium rounded border-slate-300 focus:ring-teal-500 px-2 py-1 ${
                            currentData.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            currentData.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="missing">Missing / Required</option>
                          <option value="pending">Pending Verification</option>
                          <option value="valid">Valid / Verified</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 w-16">Expiry:</span>
                        <input 
                          type="date" 
                          value={currentData.expiryDate || ''} 
                          onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition">
            Save Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeManager({ employees, onAddEmployee, onRemoveEmployee, updateEmployee, currentUser }) {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Neighbour');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    
    const newEmp = {
      id: `emp_${Date.now()}`,
      name: newName,
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
      phone: newPhone,
      email: newEmail,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}&backgroundColor=0f766e`,
      requirements: {},
      timeOffBalances: { sick: 5, vacation: 10 }
    };
    onAddEmployee(newEmp);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewPhone('');
    setNewEmail('');
    setNewPhotoFile(null);
  };

  const getComplianceIssues = (emp) => {
    let issues = 0;
    ONTARIO_REQUIREMENTS.forEach(req => {
      const status = emp.requirements?.[req.key]?.status;
      if (!status || status === 'missing' || status === 'expired') {
        issues++;
      }
    });
    return issues;
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2>
          </div>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 bg-slate-50/50 flex-1 overflow-y-auto">
          {filteredEmployees.map(emp => {
            const issuesCount = getComplianceIssues(emp);
            const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
            
            return (
              <div key={emp.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative">
                {!isProtected && (
                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button 
                      onClick={() => setEditingEmployee(emp)}
                      className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Edit Profile & Compliance"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {emp.id !== 'admin1' && (
                      <button 
                        onClick={() => onRemoveEmployee(emp.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Remove Employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3 mb-3 pr-16">
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{emp.name}</h3>
                    <div className="flex flex-col mt-0.5">
                      <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block w-fit">{emp.role}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2">
                  <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100 space-y-1">
                    {emp.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1.5" />{emp.phone}</div>}
                    {emp.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1.5" />{emp.email}</div>}
                    {!emp.phone && !emp.email && <span className="italic text-slate-400">No contact info provided</span>}
                  </div>
                  
                  {issuesCount > 0 ? (
                    <div className="flex items-center justify-center text-xs font-semibold bg-red-50 text-red-700 p-2 rounded border border-red-100">
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      {issuesCount} Requirement{issuesCount !== 1 ? 's' : ''} Missing/Expired
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-xs font-semibold bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Fully Compliant
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500">No employees found matching "{searchTerm}".</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add Employee</h2>
        </div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="e.g. janedoe"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Secure password"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="Neighbour">Neighbour</option>
              <option value="Block Captain">Block Captain</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input 
                type="text" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="555-0000"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('emp-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input 
                id="emp-photo-upload" 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                onChange={(e) => setNewPhotoFile(e.target.files[0])}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee Profile</span>
          </button>
        </form>
      </div>

      {editingEmployee && (
        <EditEmployeeModal 
          employee={editingEmployee} 
          onClose={() => setEditingEmployee(null)} 
          onSave={(id, data) => {
            updateEmployee(id, data);
            setEditingEmployee(null);
          }} 
        />
      )}
    </div>
  );
}

function EditClientModal({ client, onClose, onSave }) {
  const [name, setName] = useState(client.name);
  const [notes, setNotes] = useState(client.notes || '');
  const [emergencyName, setEmergencyName] = useState(client.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(client.emergencyContactPhone || '');
  const [monthlyAllowance, setMonthlyAllowance] = useState(client.monthlyAllowance.toString());
  const [photoFile, setPhotoFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const updatedData = {
      name,
      notes,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      monthlyAllowance: Number(monthlyAllowance) || 0
    };

    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }

    onSave(client.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Edit Client Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-2xl leading-none">&times;</button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label>
              <input 
                type="number" 
                min="0"
                value={monthlyAllowance} 
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
              <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('edit-client-photo-upload').click()}>
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                      {photoFile ? photoFile.name : <span>Upload a new photo</span>}
                    </span>
                  </div>
                </div>
                <input 
                  id="edit-client-photo-upload" 
                  type="file" 
                  accept="image/*" 
                  className="sr-only" 
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
                <input 
                  type="text" 
                  value={emergencyName} 
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                <input 
                  type="text" 
                  value={emergencyPhone} 
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Care Plan / Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                rows="4"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-client-form"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientManager({ clients, onAddClient, onRemoveClient, updateClient }) {
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newMonthlyAllowance, setNewMonthlyAllowance] = useState('100');
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const newClient = {
      id: `client_${Date.now()}`,
      name: newName,
      notes: newNotes,
      emergencyContactName: newEmergencyName,
      emergencyContactPhone: newEmergencyPhone,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}&backgroundColor=0d9488`,
      monthlyAllowance: Number(newMonthlyAllowance) || 0
    };
    onAddClient(newClient);
    setNewName('');
    setNewNotes('');
    setNewEmergencyName('');
    setNewEmergencyPhone('');
    setNewPhotoFile(null);
    setNewMonthlyAllowance('100');
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Current Clients</h2>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or care notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 flex-1 overflow-y-auto">
          {filteredClients.map(client => (
            <div key={client.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative">
              <div className="absolute top-3 right-3 flex space-x-1">
                <button 
                  onClick={() => setEditingClient(client)}
                  className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                  title="Edit Client"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => onRemoveClient(client.id)}
                  className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                  title="Remove Client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3 mb-3 pr-16">
                {client.photoUrl ? (
                  <img src={client.photoUrl} alt={client.name} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{client.name}</h3>
                  <div className="flex items-center mt-0.5 space-x-2">
                    <span className="text-xs text-slate-500 line-clamp-1">{client.notes || 'No notes'}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100">
                  <div className="font-semibold text-slate-700 mb-1 flex items-center">
                    <Phone className="h-3 w-3 mr-1" /> Emergency Contact
                  </div>
                  {client.emergencyContactName ? (
                    <div>
                      {client.emergencyContactName}
                      <br/>
                      <span className="text-teal-700 font-medium">{client.emergencyContactPhone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Not provided</span>
                  )}
                </div>
                <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100">
                  <div className="font-semibold text-slate-700 mb-1 flex items-center">
                    <Wallet className="h-3 w-3 mr-1" /> Monthly Allowance
                  </div>
                  <div className="text-teal-700 font-bold text-sm">
                    ${client.monthlyAllowance}/mo
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500">No clients found matching "{searchTerm}".</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Client</h2>
        </div>
        <form onSubmit={handleAddClient} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Eleanor Vance"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label>
            <input 
              type="number" 
              min="0"
              value={newMonthlyAllowance} 
              onChange={(e) => setNewMonthlyAllowance(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="e.g. 100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('client-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input 
                id="client-photo-upload" 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                onChange={(e) => setNewPhotoFile(e.target.files[0])}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input 
                type="text" 
                value={newEmergencyName} 
                onChange={(e) => setNewEmergencyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Name (e.g. Son)"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
              <input 
                type="text" 
                value={newEmergencyPhone} 
                onChange={(e) => setNewEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="555-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Care Plan / Notes</label>
            <textarea 
              value={newNotes} 
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="List mobility needs, allergies, routines..."
              rows="3"
            />
          </div>
          <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client Profile</span>
          </button>
        </form>
      </div>

      {editingClient && (
        <EditClientModal 
          client={editingClient} 
          onClose={() => setEditingClient(null)} 
          onSave={(id, data) => {
            updateClient(id, data);
            setEditingClient(null);
          }} 
        />
      )}
    </div>
  );
}

function TimeOffManager({ employees, timeOffLogs, onAddTimeOff, onRemoveTimeOff }) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('sick'); // 'sick' or 'vacation'
  const [note, setNote] = useState('');
  
  const currentYear = new Date().getFullYear();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !date) return;
    onAddTimeOff({ employeeId, date, type, note });
    setEmployeeId('');
    setDate('');
    setNote('');
  };

  const employeeBalances = useMemo(() => {
    return employees.map(emp => {
      const empLogs = timeOffLogs.filter(l => l.employeeId === emp.id && parseLocal(l.date).getFullYear() === currentYear);
      const usedSick = empLogs.filter(l => l.type === 'sick').length;
      const usedVacation = empLogs.filter(l => l.type === 'vacation').length;
      const allowedSick = emp.timeOffBalances?.sick || 0;
      const allowedVacation = emp.timeOffBalances?.vacation || 0;

      return {
        ...emp,
        usedSick,
        remainingSick: allowedSick - usedSick,
        allowedSick,
        usedVacation,
        remainingVacation: allowedVacation - usedVacation,
        allowedVacation
      };
    });
  }, [employees, timeOffLogs, currentYear]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <CalendarDays className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Log Time Off</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            >
              <option value="" disabled>Select an employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            >
              <option value="sick">Sick Day</option>
              <option value="vacation">Vacation Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="Reason for time off"
            />
          </div>
          <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Time Off</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Staff Time Off Balances ({currentYear})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Sick Left</th>
                  <th className="px-4 py-3 font-medium">Sick Used</th>
                  <th className="px-4 py-3 font-medium">Vacation Left</th>
                  <th className="px-4 py-3 font-medium">Vacation Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeBalances.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No employees found.</td>
                  </tr>
                ) : (
                  employeeBalances.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${emp.remainingSick <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingSick}</span> / {emp.allowedSick}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.usedSick} days</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${emp.remainingVacation <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingVacation}</span> / {emp.allowedVacation}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.usedVacation} days</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
            <h2 className="text-lg font-semibold text-slate-800">Recent Time Off Logs</h2>
          </div>
          <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
            {timeOffLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No time off logged yet.</p>
            ) : (
              timeOffLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => {
                const emp = employees.find(e => e.id === log.employeeId);
                const isSick = log.type === 'sick';
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 transition hover:shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${isSick ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isSick ? <Activity className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {emp?.name || 'Unknown'} <span className="font-normal text-slate-500 ml-1">took a {isSick ? 'Sick' : 'Vacation'} Day</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <span>{parseLocal(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {log.note && <span className="hidden sm:inline">&bull;</span>}
                          {log.note && <span className="italic">"{log.note}"</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveTimeOff(log.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition"
                      title="Delete Log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminClientFundsManager({ clients, expenses, clientExpenses, employees }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedClientId, setExpandedClientId] = useState(null);

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

  const [yearStr, monthStr] = selectedMonth.split('-');
  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed

  const clientFundsData = useMemo(() => {
    return clients.map(client => {
      const cMileage = expenses.filter(e => {
        if(e.clientId !== client.id || e.status !== 'approved') return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const mileageCost = cMileage.reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);

      const cOOP = clientExpenses.filter(e => {
        if(e.clientId !== client.id || e.status !== 'approved') return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const oopCost = cOOP.reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        ...client,
        mileageCost,
        oopCost,
        totalSpent: mileageCost + oopCost,
        remaining: client.monthlyAllowance - (mileageCost + oopCost),
        transactions: [
          ...cMileage.map(m => ({ ...m, type: 'mileage', cost: Number(m.kilometers) * 0.68 })),
          ...cOOP.map(o => ({ ...o, type: 'oop', cost: Number(o.amount) }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });
  }, [clients, expenses, clientExpenses, targetYear, targetMonth]);

  const handleToggleExpand = (clientId) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Monthly Allowances</h2>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Billing Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Monthly Limit</th>
              <th className="px-6 py-3 font-medium">Used (Mileage)</th>
              <th className="px-6 py-3 font-medium">Used (Out-of-Pocket)</th>
              <th className="px-6 py-3 font-medium text-right text-slate-800">Remaining Balance</th>
              <th className="px-6 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientFundsData.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No clients to display.</td>
              </tr>
            ) : (
              clientFundsData.map(client => (
                <React.Fragment key={`cf_${client.id}`}>
                  <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => handleToggleExpand(client.id)}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center">
                        {client.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      ${client.monthlyAllowance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      ${client.mileageCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      ${client.oopCost.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-base ${client.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${client.remaining.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium transition"
                      >
                        {expandedClientId === client.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedClientId === client.id && (
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan="6" className="px-6 py-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Itemized Deductions ({selectedMonth})</h4>
                        {client.transactions.length === 0 ? (
                          <div className="text-sm text-slate-500 italic">No approved transactions for this month.</div>
                        ) : (
                          <div className="space-y-2">
                            {client.transactions.map((tx, idx) => {
                              const emp = employees.find(e => e.id === tx.employeeId);
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 text-sm">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${tx.type === 'mileage' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {tx.type === 'mileage' ? <Car className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-700">
                                        {parseLocal(tx.date).toLocaleDateString()} &bull; {emp?.name || 'Unknown Staff'}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {tx.type === 'mileage' ? `${tx.kilometers}km: ` : ''}{tx.description}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="font-bold text-slate-700">
                                    -${tx.cost.toFixed(2)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseManager({ expenses, clientExpenses, employees, clients, onUpdateExpense, onUpdateClientExpense }) {
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const sortedClientExpenses = [...clientExpenses].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <Coffee className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Expense Receipts (Out-of-Pocket)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Item/Description</th>
                <th className="px-6 py-3 font-medium">Receipt</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClientExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No client expense receipts submitted.</td>
                </tr>
              ) : (
                sortedClientExpenses.map(expense => {
                  const emp = employees.find(e => e.id === expense.employeeId);
                  const client = clients.find(c => c.id === expense.clientId);
                  
                  return (
                    <tr key={`ce_${expense.id}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-700">{emp?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">for {client?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={expense.description}>{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {expense.receiptDetails ? (
                          <div className="flex items-center text-teal-600">
                            <FileText className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-[100px]" title={expense.receiptDetails}>{expense.receiptDetails}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No attachment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${expense.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateClientExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => onUpdateClientExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject">
                              <XCircle className="h-5 w-5" />
                            </button>
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
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <Car className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Mileage Approvals</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Description</th>
                <th className="px-6 py-3 font-medium">Kilometers</th>
                <th className="px-6 py-3 font-medium">Reimbursement ($0.68/km)</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No mileage logs submitted.</td>
                </tr>
              ) : (
                sortedExpenses.map(expense => {
                  const emp = employees.find(e => e.id === expense.employeeId);
                  const client = clients.find(c => c.id === expense.clientId);
                  const amount = (expense.kilometers * 0.68).toFixed(2);
                  
                  return (
                    <tr key={`mil_${expense.id}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-700">{emp?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">for {client?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={expense.description}>{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.kilometers} km</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${amount}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => onUpdateExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject">
                              <XCircle className="h-5 w-5" />
                            </button>
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

function AdminEarningsManager({ employees, shifts, expenses, clientExpenses, payPeriodStart }) {
  const shiftRate = 45;
  const kmRate = 0.68;
  
  const allPeriods = useMemo(() => getPastPayPeriods(payPeriodStart, 104), [payPeriodStart]);
  
  const availableYears = useMemo(() => {
    const years = allPeriods.map(p => p.end.getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [allPeriods]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0].toString());
  const [selectedPeriodTime, setSelectedPeriodTime] = useState('');

  const filteredPeriods = useMemo(() => {
    return allPeriods.filter(p => p.end.getFullYear().toString() === selectedYear);
  }, [allPeriods, selectedYear]);

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
    return employees.map(emp => {
      const empShifts = shifts.filter(s => {
        const d = parseLocal(s.date);
        return s.employeeId === emp.id && 
               new Date(`${s.date}T${s.endTime}`) <= now &&
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const shiftEarnings = empShifts.length * shiftRate;

      const empMileage = expenses.filter(e => {
        const d = parseLocal(e.date);
        return e.employeeId === emp.id && 
               e.status === 'approved' && 
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const totalKms = empMileage.reduce((sum, e) => sum + Number(e.kilometers), 0);
      const kmEarnings = totalKms * kmRate;

      const empClientExp = clientExpenses.filter(e => {
        const d = parseLocal(e.date);
        return e.employeeId === emp.id && 
               e.status === 'approved' && 
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const clientExpenseEarnings = empClientExp.reduce((sum, e) => sum + Number(e.amount), 0);

      const totalEarnings = shiftEarnings + kmEarnings + clientExpenseEarnings;

      return {
        ...emp,
        shiftCount: empShifts.length,
        shiftEarnings,
        totalKms,
        kmEarnings,
        clientExpenseEarnings,
        totalEarnings
      };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [employees, shifts, expenses, clientExpenses, currentPeriodStart, currentPeriodEnd]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center">
          <Coins className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Team Earnings Overview</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Pay Period:</label>
          <div className="flex space-x-2 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-1/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={activePeriod.start.getTime().toString()}
              onChange={(e) => setSelectedPeriodTime(e.target.value)}
              className="w-2/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
            >
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
              <th className="px-6 py-3 font-medium text-right text-slate-800">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeEarnings.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No active employees to display.</td>
              </tr>
            ) : (
              employeeEarnings.map(emp => (
                <tr key={`earning_${emp.id}`} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-500">{emp.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.shiftEarnings.toFixed(2)} <span className="text-xs text-slate-400">({emp.shiftCount} shifts)</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.kmEarnings.toFixed(2)} <span className="text-xs text-slate-400">({emp.totalKms} km)</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.clientExpenseEarnings.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-bold text-base">
                    ${emp.totalEarnings.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsManager({ payPeriodStart, setPayPeriodStart }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-lg">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-semibold text-slate-800">System Settings</h2>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period Start Date</label>
          <p className="text-xs text-slate-500 mb-3">The employee earnings tracker will reset and calculate from this date onward.</p>
          <input
            type="date"
            value={payPeriodStart}
            onChange={(e) => setPayPeriodStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ shifts, employees, setEmployees, updateEmployee, clients, setClients, updateClient, expenses, onUpdateExpense, clientExpenses, onUpdateClientExpense, paystubs, onAddPaystub, onRemovePaystub, timeOffLogs, onAddTimeOffLog, onRemoveTimeOffLog, messages, onSendMessage, currentUser, payPeriodStart, setPayPeriodStart, onAddShift, onRemoveShift, onMarkShiftOpen }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
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
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><CalendarIcon className="h-4 w-4"/><span>Schedule</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'employees' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><Users className="h-4 w-4"/><span>Employees</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('clients')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'clients' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><Heart className="h-4 w-4"/><span>Clients</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('client-funds')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'client-funds' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><Wallet className="h-4 w-4"/><span>Client Funds</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><Receipt className="h-4 w-4"/><span>Reimbursements</span></div>
        </button>
        {isMasterAdmin && (
          <button 
            onClick={() => setActiveTab('earnings')}
            className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'earnings' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center space-x-2"><Coins className="h-4 w-4"/><span>Earnings</span></div>
          </button>
        )}
        <button 
          onClick={() => setActiveTab('timeoff')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'timeoff' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><CalendarDays className="h-4 w-4"/><span>Time Off</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('paystubs')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><FileText className="h-4 w-4"/><span>Paystubs</span></div>
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center space-x-2"><MessageSquare className="h-4 w-4"/><span>Announcements</span></div>
        </button>
        {isMasterAdmin && (
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-1 font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center space-x-2"><Settings className="h-4 w-4"/><span>Settings</span></div>
          </button>
        )}
      </div>

      {activeTab === 'employees' ? (
        <EmployeeManager employees={employees} setEmployees={setEmployees} updateEmployee={updateEmployee} currentUser={currentUser} />
      ) : activeTab === 'clients' ? (
        <ClientManager clients={clients} setClients={setClients} updateClient={updateClient} />
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
        <AdminEarningsManager
          employees={employees}
          shifts={shifts}
          expenses={expenses}
          clientExpenses={clientExpenses}
          payPeriodStart={payPeriodStart}
        />
      ) : activeTab === 'timeoff' ? (
        <TimeOffManager 
          employees={employees} 
          timeOffLogs={timeOffLogs} 
          onAddTimeOff={onAddTimeOffLog} 
          onRemoveTimeOff={onRemoveTimeOffLog} 
        />
      ) : activeTab === 'paystubs' ? (
        <PaystubManager 
          paystubs={paystubs} 
          employees={employees} 
          onAddPaystub={onAddPaystub} 
          onRemovePaystub={onRemovePaystub} 
        />
      ) : activeTab === 'announcements' ? (
        <div className="max-w-4xl">
          <Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} />
        </div>
      ) : activeTab === 'settings' && isMasterAdmin ? (
        <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={setPayPeriodStart} />
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
                
                const filteredShifts = shifts.filter(s => {
                  if (!scheduleSearch.trim()) return true;
                  
                  const emp = employees.find(e => e.id === s.employeeId);
                  const client = clients.find(c => c.id === s.clientId);
                  const searchLower = scheduleSearch.toLowerCase();
                  
                  return (
                    (emp && emp.name.toLowerCase().includes(searchLower)) ||
                    (client && client.name.toLowerCase().includes(searchLower))
                  );
                });
                
                const dayShifts = filteredShifts.filter(s => s.date === dateStr);
                
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
                          <div key={shift.id} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`} title={`${isOpen ? 'OPEN SHIFT' : emp?.name || 'Unknown'} with ${client?.name || 'Unknown'}: ${shift.startTime}-${shift.endTime}`}>
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

function EmployeeDashboard({ shifts, employees, currentUser, clients, expenses, onAddExpense, clientExpenses, onAddClientExpense, getClientRemainingBalance, paystubs, timeOffLogs, messages, onSendMessage, payPeriodStart, onPickupShift }) {
  const [viewingClient, setViewingClient] = useState(null);
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));

  const myShifts = useMemo(() => {
    return shifts
      .filter(s => s.employeeId === currentUser.id)
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
  }, [shifts, currentUser.id]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const pastShifts = myShifts.filter(s => new Date(`${s.date}T${s.endTime}`) <= now);
  const upcomingShifts = myShifts.filter(s => new Date(`${s.date}T${s.endTime}`) > now);
  const nextShift = upcomingShifts[0];

  const openShifts = useMemo(() => {
    return shifts
      .filter(s => s.employeeId === 'unassigned' && new Date(`${s.date}T${s.startTime}`) >= now)
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
  }, [shifts, now]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const shiftRate = 45;
  const kmRate = 0.68;
  
  const { start: currentPeriodStart, end: currentPeriodEnd } = getPayPeriodBounds(payPeriodStart);
  
  const currentPayPeriodShifts = pastShifts.filter(s => {
    const d = parseLocal(s.date);
    return d >= currentPeriodStart && d <= currentPeriodEnd;
  });
  const shiftEarnings = currentPayPeriodShifts.length * shiftRate;

  const myExpenses = expenses.filter(e => e.employeeId === currentUser.id);
  const currentPayPeriodExpenses = myExpenses.filter(e => {
    const d = parseLocal(e.date);
    return e.status === 'approved' && d >= currentPeriodStart && d <= currentPeriodEnd;
  });
  const totalKms = currentPayPeriodExpenses.reduce((sum, e) => sum + Number(e.kilometers), 0);
  const kmEarnings = totalKms * kmRate;

  const myClientExpenses = clientExpenses.filter(e => e.employeeId === currentUser.id);
  const currentPayPeriodClientExpenses = myClientExpenses.filter(e => {
    const d = parseLocal(e.date);
    return e.status === 'approved' && d >= currentPeriodStart && d <= currentPeriodEnd;
  });
  const clientExpenseEarnings = currentPayPeriodClientExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalEarnings = shiftEarnings + kmEarnings + clientExpenseEarnings;

  const ytdShifts = pastShifts.filter(s => parseLocal(s.date).getFullYear() === currentYear);
  const ytdShiftEarnings = ytdShifts.length * shiftRate;
  
  const ytdExpenses = myExpenses.filter(e => e.status === 'approved' && parseLocal(e.date).getFullYear() === currentYear);
  const ytdKmEarnings = ytdExpenses.reduce((sum, e) => sum + Number(e.kilometers), 0) * kmRate;

  const ytdClientExpenses = myClientExpenses.filter(e => e.status === 'approved' && parseLocal(e.date).getFullYear() === currentYear);
  const ytdClientExpenseEarnings = ytdClientExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const ytdTotalEarnings = ytdShiftEarnings + ytdKmEarnings + ytdClientExpenseEarnings;

  const myTimeOffLogs = timeOffLogs.filter(l => l.employeeId === currentUser.id && parseLocal(l.date).getFullYear() === currentYear);
  const usedSick = myTimeOffLogs.filter(l => l.type === 'sick').length;
  const usedVacation = myTimeOffLogs.filter(l => l.type === 'vacation').length;
  const allowedSick = currentUser.timeOffBalances?.sick || 0;
  const allowedVacation = currentUser.timeOffBalances?.vacation || 0;
  const remSick = allowedSick - usedSick;
  const remVacation = allowedVacation - usedVacation;

  const handleViewProfile = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) setViewingClient(client);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-md border border-emerald-400 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
          <Coins className="w-64 h-64 -mr-12" />
        </div>
        <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold flex items-center mb-1">
              <Star className="h-5 w-5 mr-2 text-yellow-300" fill="currentColor" /> Current Pay Period
            </h2>
            <p className="text-emerald-50 text-sm">
              {currentPeriodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
              <span className="text-5xl sm:text-6xl font-extrabold leading-none">${totalEarnings.toFixed(2)}</span>
              <div className="flex flex-col gap-1.5 flex-wrap pb-1">
                <span className="text-emerald-100 font-medium bg-black/10 px-2.5 py-1 rounded text-xs inline-flex items-center w-fit">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" /> 
                  Shifts: ${shiftEarnings.toFixed(2)}
                </span>
                <span className="text-emerald-100 font-medium bg-black/10 px-2.5 py-1 rounded text-xs inline-flex items-center w-fit">
                  <Car className="h-3.5 w-3.5 mr-1.5" /> 
                  Mileage: ${kmEarnings.toFixed(2)}
                </span>
                <span className="text-emerald-100 font-medium bg-black/10 px-2.5 py-1 rounded text-xs inline-flex items-center w-fit">
                  <Receipt className="h-3.5 w-3.5 mr-1.5" /> 
                  Client Exp: ${clientExpenseEarnings.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/10 border border-white/20 p-5 rounded-xl shrink-0 text-left md:text-right flex flex-col justify-center">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">YTD Earnings ({currentYear})</span>
            <span className="text-3xl font-bold text-white">${ytdTotalEarnings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-semibold mb-3 flex items-center"><Activity className="w-5 h-5 mr-2 text-teal-600"/> Sick Days ({currentYear})</h3>
          <div className="text-3xl font-bold text-slate-800 flex items-end gap-2">
            <span className={remSick <= 0 ? 'text-red-500' : 'text-slate-800'}>{remSick}</span>
            <span className="text-lg font-medium text-slate-400 mb-0.5">remaining</span>
          </div>
          <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">{usedSick} used out of {allowedSick} total allocated</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-semibold mb-3 flex items-center"><Sun className="w-5 h-5 mr-2 text-teal-600"/> Vacation Days ({currentYear})</h3>
          <div className="text-3xl font-bold text-slate-800 flex items-end gap-2">
            <span className={remVacation <= 0 ? 'text-red-500' : 'text-slate-800'}>{remVacation}</span>
            <span className="text-lg font-medium text-slate-400 mb-0.5">remaining</span>
          </div>
          <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">{usedVacation} used out of {allowedVacation} total allocated</p>
        </div>
      </div>

      {openShifts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-amber-100/50 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center text-amber-800">
              <Bell className="h-5 w-5 mr-2 animate-bounce" />
              <h2 className="text-lg font-bold">Available Shifts Board</h2>
            </div>
            <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">{openShifts.length} Open</span>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {openShifts.map(shift => {
              const shiftDate = new Date(shift.date);
              const client = clients.find(c => c.id === shift.clientId);
              return (
                <div key={shift.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-amber-700">
                        {shiftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                        +${shiftRate}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-800 mb-1 flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-slate-400" />
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <div className="text-sm text-slate-600 mb-4 flex items-start">
                      <Heart className="h-4 w-4 mr-1.5 text-teal-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client?.name} {client?.notes ? `- ${client.notes}` : ''}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onPickupShift(shift.id, currentUser.id)}
                    className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg flex items-center justify-center transition"
                  >
                    <PlusCircle className="h-4 w-4 mr-1.5" /> Claim Shift
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
          <p className="text-slate-500 text-lg">Here is an overview of your upcoming schedule.</p>
        </div>
        
        {nextShift && (
          <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl shrink-0 w-full md:w-auto">
            <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1"/> Next Upcoming Shift</span>
            </h3>
            <div className="text-slate-800 font-semibold text-lg">
              {new Date(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div className="text-teal-700 flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1.5" />
              {nextShift.startTime} - {nextShift.endTime}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-teal-200 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700 font-medium">
                  {clients.find(c => c.id === nextShift.clientId)?.name || 'Unknown Client'}
                </div>
                <button 
                  onClick={() => handleViewProfile(nextShift.clientId)}
                  className="text-xs bg-white text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200 px-2.5 py-1.5 rounded-md transition-colors font-medium flex items-center"
                >
                  <Info className="h-3.5 w-3.5 mr-1" />
                  Profile
                </button>
              </div>
              <div className="text-xs font-medium bg-teal-100/50 text-teal-800 px-2 py-1 rounded flex items-center w-fit">
                <Wallet className="h-3 w-3 mr-1" />
                Remaining Expense Funds: ${getClientRemainingBalance(nextShift.clientId).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      <Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-4">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Your Schedule</h2>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
            <button
              onClick={() => setScheduleView('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              List View
            </button>
            <button
              onClick={() => setScheduleView('calendar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Calendar View
            </button>
          </div>
        </div>
        
        {scheduleView === 'list' ? (
          myShifts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              You currently have no scheduled shifts.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myShifts.map((shift, idx) => {
                const shiftDate = new Date(shift.date);
                const client = clients.find(c => c.id === shift.clientId);
                const remainingBalance = getClientRemainingBalance(shift.clientId);
                
                return (
                  <div key={shift.id} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50 ${idx === 0 ? 'bg-teal-50/30' : ''}`}>
                    <div className="flex items-start space-x-4">
                      <div className="bg-teal-100 text-teal-800 rounded-lg p-3 text-center min-w-[70px]">
                        <div className="text-xs font-bold uppercase">{shiftDate.toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div className="text-2xl font-bold leading-none mt-1">{shiftDate.getDate()}</div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-800">
                          {client?.name || 'Unknown Client'}
                        </h4>
                        <p className="text-slate-500 flex items-center mt-1">
                           <Clock className="h-4 w-4 mr-1.5" />
                           {shift.startTime} - {shift.endTime}
                        </p>
                        <div className="mt-2 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded inline-flex items-center">
                          <Wallet className="h-3 w-3 mr-1" />
                          Client Funds: ${remainingBalance.toFixed(2)} left
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:text-right text-sm flex flex-col sm:items-end gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-800 self-start sm:self-end w-fit">
                        Confirmed
                      </span>
                      <button 
                        onClick={() => handleViewProfile(shift.clientId)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center transition"
                      >
                        <Info className="h-3.5 w-3.5 mr-1" /> View Care Profile
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
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
                <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
              {blanksArray.map(blank => (
                <div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>
              ))}
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayShifts = myShifts.filter(s => s.date === dateStr);
                const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
                const holiday = getHoliday(dateStr);
                
                return (
                  <div 
                    key={day} 
                    className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}
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
                        const client = clients.find(c => c.id === shift.clientId);
                        return (
                          <div 
                            key={shift.id} 
                            onClick={() => handleViewProfile(shift.clientId)}
                            className="text-xs p-1.5 rounded bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer hover:bg-teal-200 transition shadow-sm"
                            title={`Shift: ${shift.startTime}-${shift.endTime} with ${client?.name || 'Unknown'}`}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <EmployeeMileageLog 
          myExpenses={myExpenses} 
          clients={clients} 
          getClientRemainingBalance={getClientRemainingBalance}
          onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} 
        />
        <EmployeeClientExpenseLog 
          myClientExpenses={myClientExpenses} 
          clients={clients} 
          getClientRemainingBalance={getClientRemainingBalance}
          onAddClientExpense={(exp) => onAddClientExpense({ ...exp, employeeId: currentUser.id })} 
        />
      </div>

      <EmployeePaystubs myPaystubs={paystubs.filter(p => p.employeeId === currentUser.id)} />

      {viewingClient && (
        <ClientProfileModal client={viewingClient} remainingBalance={getClientRemainingBalance(viewingClient.id)} onClose={() => setViewingClient(null)} />
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

    return () => unsubs.forEach(unsub => unsub());
  }, [firebaseUser]);

  // Firestore DB Seed Function
  const handleSeedData = async () => {
    if (!firebaseUser || !db) return;
    try {
      const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId.toString());

      for (const e of MOCK_EMPLOYEES) await setDoc(getDocRef('gn_employees', e.id), e);
      for (const c of MOCK_CLIENTS) await setDoc(getDocRef('gn_clients', c.id), c);
      for (const s of INITIAL_SHIFTS) await setDoc(getDocRef('gn_shifts', s.id.toString()), { ...s, id: s.id.toString() });
      for (const ex of INITIAL_EXPENSES) await setDoc(getDocRef('gn_expenses', ex.id.toString()), { ...ex, id: ex.id.toString() });
      for (const ce of INITIAL_CLIENT_EXPENSES) await setDoc(getDocRef('gn_clientExpenses', ce.id.toString()), { ...ce, id: ce.id.toString() });
      for (const p of INITIAL_PAYSTUBS) await setDoc(getDocRef('gn_paystubs', p.id.toString()), { ...p, id: p.id.toString() });
      for (const t of INITIAL_TIME_OFF) await setDoc(getDocRef('gn_timeOffLogs', t.id.toString()), { ...t, id: t.id.toString() });
      for (const m of INITIAL_MESSAGES) await setDoc(getDocRef('gn_messages', m.id.toString()), { ...m, id: m.id.toString() });
      
      console.log("Demo database initialized successfully!");
    } catch (err) {
      console.error("Error seeding data:", err);
    }
  };

  // App Authentication
  const handleLogin = (username, password) => {
    const foundEmp = employees.find(e => 
      e.username && e.username.toLowerCase() === username.toLowerCase() && e.password === password
    );
    
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role, timeOffBalances: foundEmp.timeOffBalances });
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

  const getClientRemainingBalance = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const spentThisMonth = clientExpenses
      .filter(e => e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    const mileageThisMonth = expenses
      .filter(e => e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);
      
    return client.monthlyAllowance - spentThisMonth - mileageThisMonth;
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} isDbReady={isDbReady} hasData={employees.length > 0} onSeedData={handleSeedData} />;
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
            setPayPeriodStart={setPayPeriodStart}
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
          />
        )}
      </main>
    </div>
  );
}