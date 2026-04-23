import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, Trash2, Users, Heart, Coins, Settings, Receipt, MessageSquare, Search, UserMinus, FileText, Wallet, Info, BookOpen } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- UTILS & COMPONENTS ---
import { parseLocal, isBiweeklyPayday, getHoliday } from './utils';

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
                  <Wallet className="h-3 w-3 mr-1" /> ${Number(remainingBalance).toFixed(2)} Funds Left
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

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { 
      try { 
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); 
        else await signInAnonymously(auth); 
      } catch (e) { 
        console.error(e); 
      } 
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, user => setFirebaseUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !db) return;
    const getCol = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubs = [];
    unsubs.push(onSnapshot(getCol('gn_employees'), snap => { setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id }))); setIsDbReady(true); }));
    unsubs.push(onSnapshot(getCol('gn_shifts'), snap => setShifts(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_clients'), snap => setClients(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_expenses'), snap => setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_clientExpenses'), snap => setClientExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_paystubs'), snap => setPaystubs(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_timeOffLogs'), snap => setTimeOffLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_messages'), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    unsubs.push(onSnapshot(getCol('gn_documents'), snap => setDocuments(snap.docs.map(d => ({ ...d.data(), id: d.id })))));
    
    unsubs.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'gn_settings', 'global'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payPeriodStart) setPayPeriodStart(data.payPeriodStart);
        if (data.isBonusActive !== undefined) setIsBonusActive(data.isBonusActive);
        if (data.bonusAmounts) setBonusSettings(data.bonusAmounts);
      }
    }));
    return () => unsubs.forEach(unsub => unsub());
  }, [firebaseUser]);

  const handleLogin = (username, password) => {
    const foundEmp = employees.find(e => String(e.username).toLowerCase() === String(username).toLowerCase() && e.password === password);
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, timeOffBalances: foundEmp.timeOffBalances });
      setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
    } else alert("Invalid credentials.");
  };

  const getDocRef = (cName, dId) => doc(db, 'artifacts', appId, 'public', 'data', cName, String(dId));
  
  const runMutation = async (cName, dId, action, data) => {
    if(!firebaseUser) return;
    const ref = getDocRef(cName, dId);
    if(action === 'set') await setDoc(ref, data);
    if(action === 'update') await updateDoc(ref, data);
    if(action === 'delete') await deleteDoc(ref);
  };

  // UPDATE: Propagate the getClientRemainingBalance function so components can use it
  const getClientRemainingBalance = (clientId) => {
    const client = clients.find(c => c && c.id === clientId);
    if (!client) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const oopSpent = clientExpenses
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = parseLocal(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
    const kmSpent = expenses
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = parseLocal(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
      
    return (client.monthlyAllowance || 0) - oopSpent - kmSpent;
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={isDbReady} hasData={employees.length > 0} onSeedData={() => {}} />;

  const isAdmin = String(currentUser.role).includes('Admin');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (<button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">{viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}</button>)}
          <div className="flex items-center text-sm hidden sm:flex"><User className="mr-1 h-4 w-4"/> {currentUser.name}</div>
          <button onClick={() => setCurrentUser(null)} className="p-2 rounded-full hover:bg-teal-600 transition" title="Logout"><LogOut className="h-5 w-5"/></button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {isAdmin && viewMode === 'admin' ? (
          <div className="space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
              {[ {id: 'schedule', icon: CalendarIcon, label: 'Schedule'}, {id: 'employees', icon: Users, label: 'Employees'}, {id: 'clients', icon: Heart, label: 'Clients'}, {id: 'client-funds', icon: Wallet, label: 'Client Funds'}, {id: 'expenses', icon: Receipt, label: 'Reimbursements'}, {id: 'earnings', icon: Coins, label: 'Earnings'}, {id: 'timeoff', icon: CalendarDays, label: 'Time Off'}, {id: 'paystubs', icon: FileText, label: 'Paystubs'}, {id: 'documents', icon: BookOpen, label: 'Documents'}, {id: 'announcements', icon: MessageSquare, label: 'Announcements'}, {id: 'settings', icon: Settings, label: 'Settings'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveAdminTab(tab.id)} className={`px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeAdminTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
                </button>
              ))}
            </div>
            {activeAdminTab === 'employees' && <EmployeeManager employees={employees} onAddEmployee={(d) => runMutation('gn_employees', d.id, 'set', d)} onRemoveEmployee={(id) => runMutation('gn_employees', id, 'delete')} updateEmployee={(id, d) => runMutation('gn_employees', id, 'update', d)} currentUser={currentUser} />}
            {activeAdminTab === 'clients' && <ClientManager clients={clients} onAddClient={(d) => runMutation('gn_clients', d.id, 'set', d)} onRemoveClient={(id) => runMutation('gn_clients', id, 'delete')} updateClient={(id, d) => runMutation('gn_clients', id, 'update', d)} />}
            {activeAdminTab === 'client-funds' && <AdminClientFundsManager clients={clients} expenses={expenses} clientExpenses={clientExpenses} />}
            {activeAdminTab === 'expenses' && <ExpenseManager expenses={expenses} clientExpenses={clientExpenses} employees={employees} clients={clients} onUpdateExpense={(id, s) => runMutation('gn_expenses', id, 'update', { status: s })} onUpdateClientExpense={(id, s) => runMutation('gn_clientExpenses', id, 'update', { status: s })} />}
            {activeAdminTab === 'earnings' && <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />}
            {activeAdminTab === 'timeoff' && <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={(d) => runMutation('gn_timeOffLogs', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveTimeOff={(id) => runMutation('gn_timeOffLogs', id, 'delete')} />}
            {activeAdminTab === 'paystubs' && <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={(d) => runMutation('gn_paystubs', Date.now(), 'set', { ...d, id: Date.now() })} onRemovePaystub={(id) => runMutation('gn_paystubs', id, 'delete')} />}
            {activeAdminTab === 'documents' && <DocumentManager documents={documents} onAddDocument={(d) => runMutation('gn_documents', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveDocument={(id) => runMutation('gn_documents', id, 'delete')} isAdmin={true} />}
            {activeAdminTab === 'announcements' && <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now(), 'set', { id: Date.now(), text, senderId, date: new Date().toISOString() })} currentUser={currentUser} employees={employees} /></div>}
            {activeAdminTab === 'settings' && <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={(v) => { setPayPeriodStart(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart: v, isBonusActive, bonusAmounts: bonusSettings }); }} isBonusActive={isBonusActive} setIsBonusActive={(v) => { setIsBonusActive(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart, isBonusActive: v, bonusAmounts: bonusSettings }); }} bonusSettings={bonusSettings} setBonusSettings={(v) => { setBonusSettings(v); runMutation('gn_settings', 'global', 'set', { payPeriodStart, isBonusActive, bonusAmounts: v }); }} />}
            {activeAdminTab === 'schedule' && <div className="p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200"><CalendarIcon className="mx-auto h-12 w-12 text-slate-300 mb-4" />Schedule Management is active.</div>}
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
            setSelectedClient={setSelectedClient}
            getClientRemainingBalance={getClientRemainingBalance} // UPDATE: Prop passed safely!
          />
        )}
      </main>
      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={0} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}
