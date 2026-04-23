import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, Trash2, Users, Heart, Coins, Settings, Receipt, MessageSquare, Search, UserMinus, FileText, Wallet, Info, BookOpen, AlertCircle, Phone, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Send, Download, TrendingUp, Trophy, Medal, Award, Activity, Sun, CheckCircle, XCircle } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

import LoginPage from './components/LoginPage';
import Announcements from './components/Announcements';
import EmployeeManager from './components/EmployeeManager';
import ClientManager from './components/ClientManager';
import AdminClientFundsManager from './components/AdminClientFundsManager';
import AdminEarningsManager from './components/AdminEarningsManager';
import TimeOffManager from './components/TimeOffManager';
import ExpenseManager from './components/ExpenseManager';
import PaystubManager from './components/PaystubManager';
import SettingsManager from './components/SettingsManager';
import DocumentManager from './components/DocumentManager';
import EmployeeDashboard from './components/EmployeePortal'; 
import ClientProfileModal from './components/ClientProfileModal'; 

// --- CUSTOM CAPTAIN HAT ICON ---
const CaptainHatIcon = ({ className }) => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10c-1-4 1-6 6-6s7 2 6 6" />
    <path d="M2 14c0-2.5 2-4 5-4h10c3 0 5 1.5 5 4 0 2-4 3-10 3S2 16.5 2 14z" />
    <circle cx="12" cy="10" r="1.5" />
  </svg>
);

// --- URL CLEANER (Fixes broken markdown URLs from database) ---
const cleanPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('[')) {
    const match = url.match(/\]\((.*?)\)/);
    if (match && match[1]) return match[1];
  }
  return url;
};

// --- FIREBASE INITIALIZATION ---
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
// HELPERS
// ==========================================
const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
  } catch (e) { return new Date(); }
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
// SHARED MODALS (Used by Admin Dashboard)
// ==========================================
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

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [viewMode, setViewMode] = useState('employee');
  const [activeAdminTab, setActiveAdminTab] = useState('schedule');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleSearch, setScheduleSearch] = useState('');
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
  const [documents, setDocuments] = useState([]);
  
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
      } catch (error) { console.error('Firebase Auth Error:', error); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, user => { setFirebaseUser(user); });
    return () => unsubscribe();
  }, []);

  // Setup Firestore Listeners
  useEffect(() => {
    if (!firebaseUser || !db) return;

    const getCol = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubs = [];
    const handleError = (err) => console.error("Firestore Error:", err);

    unsubs.push(onSnapshot(getCol('gn_employees'), snap => { setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id }))); setIsDbReady(true); }, handleError));
    unsubs.push(onSnapshot(getCol('gn_shifts'), snap => setShifts(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clients'), snap => setClients(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_expenses'), snap => setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clientExpenses'), snap => setClientExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_paystubs'), snap => setPaystubs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_timeOffLogs'), snap => setTimeOffLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_messages'), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_documents'), snap => setDocuments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    
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

  const handleLogin = (username, password) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const foundEmp = safeEmployees.find(e => e && e.username && String(e.username).toLowerCase() === String(username).toLowerCase() && e.password === password);
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, timeOffBalances: foundEmp.timeOffBalances, photoUrl: foundEmp.photoUrl });
      setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
      setActiveAdminTab('schedule');
    } else { alert("Invalid credentials. Please check your username and password."); }
  };

  const handleLogout = () => { setCurrentUser(null); setViewMode('employee'); setActiveAdminTab('schedule'); };

  const getDocRef = (cName, dId) => doc(db, 'artifacts', appId, 'public', 'data', cName, String(dId));
  
  const runMutation = async (cName, dId, action, data) => {
    if(!firebaseUser) return;
    const ref = getDocRef(cName, dId);
    if(action === 'set') await setDoc(ref, data);
    if(action === 'update') await updateDoc(ref, data);
    if(action === 'delete') await deleteDoc(ref);
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
        const d = parseLocalSafe(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
    const safeExp = Array.isArray(expenses) ? expenses : [];
    const mileageThisMonth = safeExp
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = parseLocalSafe(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
      
    return (client.monthlyAllowance || 0) - spentThisMonth - mileageThisMonth;
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={Boolean(isDbReady)} hasData={Boolean(Array.isArray(employees) && employees.length > 0)} onSeedData={() => {}} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const showAdminView = isAdmin && viewMode === 'admin';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Clean the URL before trying to render it to prevent broken image icons
  const finalCurrentUserPhotoUrl = cleanPhotoUrl(currentUser.photoUrl);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); setActiveAdminTab('schedule'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">
              {viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}
            </button>
          )}
          <div className="flex items-center text-sm hidden sm:flex">
            {finalCurrentUserPhotoUrl ? (
              <img src={finalCurrentUserPhotoUrl} alt="Avatar" className="h-6 w-6 rounded-full mr-2 object-cover border border-teal-500 bg-white" />
            ) : (
              String(currentUser.role).includes('Admin') ? <CaptainHatIcon className="mr-1.5 h-5 w-5"/> : <User className="mr-1.5 h-4 w-4"/> 
            )}
            {String(currentUser.name)}
          </div>
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
              {activeAdminTab === 'schedule' && (
                <button onClick={() => { setSelectedDateStr(`${year}-${String(month + 1).padStart(2, '0')}-01`); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition">
                  <Plus className="h-5 w-5" /><span>Add Shift</span>
                </button>
              )}
            </div>

            <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
              {[ {id: 'schedule', icon: CalendarIcon, label: 'Schedule'}, {id: 'employees', icon: Users, label: 'Employees'}, {id: 'clients', icon: Heart, label: 'Clients'}, {id: 'client-funds', icon: Wallet, label: 'Client Funds'}, {id: 'expenses', icon: Receipt, label: 'Reimbursements'}, {id: 'earnings', icon: Coins, label: 'Earnings'}, {id: 'timeoff', icon: CalendarDays, label: 'Time Off'}, {id: 'paystubs', icon: FileText, label: 'Paystubs'}, {id: 'documents', icon: BookOpen, label: 'Documents'}, {id: 'announcements', icon: MessageSquare, label: 'Announcements'}, {id: 'settings', icon: Settings, label: 'Settings'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveAdminTab(tab.id)} className={`px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeAdminTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
                </button>
              ))}
            </div>

            {activeAdminTab === 'employees' && <EmployeeManager employees={employees} onAddEmployee={(d) => runMutation('gn_employees', d.id, 'set', d)} onRemoveEmployee={(id) => runMutation('gn_employees', id, 'delete')} updateEmployee={(id, d) => runMutation('gn_employees', id, 'update', d)} currentUser={currentUser} />}
            {activeAdminTab === 'clients' && <ClientManager clients={clients} onAddClient={(d) => runMutation('gn_clients', d.id, 'set', d)} onRemoveClient={(id) => runMutation('gn_clients', id, 'delete')} updateClient={(id, d) => runMutation('gn_clients', id, 'update', d)} />}
            {activeAdminTab === 'client-funds' && <AdminClientFundsManager clients={clients} expenses={expenses} clientExpenses={clientExpenses} employees={employees} />}
            {activeAdminTab === 'expenses' && <ExpenseManager expenses={expenses} clientExpenses={clientExpenses} employees={employees} clients={clients} onUpdateExpense={(id, s) => runMutation('gn_expenses', id, 'update', { status: s })} onUpdateClientExpense={(id, s) => runMutation('gn_clientExpenses', id, 'update', { status: s })} />}
            {activeAdminTab === 'earnings' && <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />}
            {activeAdminTab === 'timeoff' && <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={(d) => runMutation('gn_timeOffLogs', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveTimeOff={(id) => runMutation('gn_timeOffLogs', id, 'delete')} />}
            {activeAdminTab === 'paystubs' && <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={(d) => runMutation('gn_paystubs', Date.now(), 'set', { ...d, id: Date.now() })} onRemovePaystub={(id) => runMutation('gn_paystubs', id, 'delete')} />}
            {activeAdminTab === 'documents' && <DocumentManager documents={documents} onAddDocument={(d) => runMutation('gn_documents', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveDocument={(id) => runMutation('gn_documents', id, 'delete')} isAdmin={true} />}
            {activeAdminTab === 'announcements' && <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now(), 'set', { id: Date.now(), text, senderId, date: new Date().toISOString() })} currentUser={currentUser} employees={employees} /></div>}
            {activeAdminTab === 'settings' && <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={(v) => { setPayPeriodStart(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart: v, isBonusActive, bonusAmounts: bonusSettings }); }} isBonusActive={isBonusActive} setIsBonusActive={(v) => { setIsBonusActive(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart, isBonusActive: v, bonusAmounts: bonusSettings }); }} bonusSettings={bonusSettings} setBonusSettings={(v) => { setBonusSettings(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart, isBonusActive, bonusAmounts: v }); }} />}
            
            {activeAdminTab === 'schedule' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <label htmlFor="schedule-search" className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter Schedule:</label>
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                      <input type="text" placeholder="Search employee or client..." value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition" />
                    </div>
                  </div>
                  {scheduleSearch.trim() !== '' && (
                    <div className="text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 whitespace-nowrap">Filtered View Active</div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />{String(monthNames[month])} {year}</h2>
                    <div className="flex space-x-2">
                      <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                      <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>))}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                    {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>))}
                    {daysArray.map(day => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
                      const holiday = getHoliday(dateStr);
                      const filteredShifts = shifts.filter(s => {
                        if (!scheduleSearch.trim()) return true;
                        const emp = employees.find(e => e.id === s.employeeId);
                        const client = clients.find(c => c.id === s.clientId);
                        const searchLower = scheduleSearch.toLowerCase();
                        return ((emp && emp.name && String(emp.name).toLowerCase().includes(searchLower)) || (client && client.name && String(client.name).toLowerCase().includes(searchLower)));
                      });
                      const dayShifts = filteredShifts.filter(s => s && s.date === dateStr);
                      
                      return (
                        <div key={day} onClick={() => { setSelectedDateStr(dateStr); setIsModalOpen(true); }} className={`min-h-[120px] p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
                          <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                            <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                            <div className="flex flex-col items-end gap-1">
                              {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {String(holiday.name).toUpperCase()}</span>)}
                              {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {dayShifts.map(shift => {
                              const isOpen = shift.employeeId === 'unassigned';
                              const emp = isOpen ? null : employees.find(e => e.id === shift.employeeId);
                              const client = clients.find(c => c.id === shift.clientId);
                              return (
                                <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`}>
                                  <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>{isOpen ? '🚨 OPEN SHIFT' : String(emp?.name?.split(' ')[0] || 'Unknown')}</div>
                                  <div className={`text-[10px] truncate flex items-center mt-0.5 ${isOpen ? 'text-amber-700' : 'text-teal-700'}`}><Heart className="h-2.5 w-2.5 mr-1 shrink-0" /><span className="truncate">{String(client?.name?.split(' ')[0] || 'Unknown Client')}</span></div>
                                  <div className="text-[10px] mt-0.5 opacity-90">{String(shift.startTime)}-{String(shift.endTime)}</div>
                                  <div className="absolute right-1 top-1 opacity-0 group-hover/shift:opacity-100 flex space-x-1 bg-white/80 p-0.5 rounded backdrop-blur-sm">
                                    {!isOpen && (<button onClick={(e) => { e.stopPropagation(); runMutation('gn_shifts', shift.id, 'update', { employeeId: 'unassigned' }); }} className="text-amber-600 hover:text-amber-800 transition p-0.5 rounded" title="Mark as Open Shift"><UserMinus className="h-3 w-3" /></button>)}
                                    <button onClick={(e) => { e.stopPropagation(); runMutation('gn_shifts', shift.id, 'delete'); }} className="text-red-500 hover:text-red-700 transition p-0.5 rounded" title="Delete Shift"><Trash2 className="h-3 w-3" /></button>
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
          </div>
        ) : (
          <EmployeeDashboard 
            shifts={shifts} employees={employees} currentUser={currentUser} clients={clients} expenses={expenses} 
            onAddExpense={(d) => runMutation('gn_expenses', Date.now(), 'set', { ...d, id: Date.now(), status: 'pending' })} 
            clientExpenses={clientExpenses} 
            onAddClientExpense={(d) => runMutation('gn_clientExpenses', Date.now(), 'set', { ...d, id: Date.now(), status: 'pending' })} 
            paystubs={paystubs} timeOffLogs={timeOffLogs} messages={messages} documents={documents} 
            onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now(), 'set', { id: Date.now(), text, senderId, date: new Date().toISOString() })} 
            payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} 
            onPickupShift={(shiftId, empId) => runMutation('gn_shifts', shiftId, 'update', { employeeId: empId })} 
            setSelectedClient={setSelectedClient}
            getClientRemainingBalance={getClientRemainingBalance}
            onUpdateProfile={(id, d) => {
              runMutation('gn_employees', id, 'update', d);
              setCurrentUser(prev => ({ ...prev, ...d })); 
            }}
          />
        )}
      </main>

      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={getClientRemainingBalance(selectedClient.id)} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}
