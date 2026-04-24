import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, Trash2, Users, Heart, Coins, Settings, Receipt, MessageSquare, Search, UserMinus, FileText, Wallet, Info, BookOpen, AlertCircle, Phone, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Send, Download, TrendingUp, Trophy, Medal, Award, Activity, Sun, CheckCircle, XCircle } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- UTILS & COMPONENTS ---
import { parseLocal, isBiweeklyPayday, getHoliday, MOCK_EMPLOYEES, MOCK_CLIENTS, INITIAL_SHIFTS, INITIAL_EXPENSES, INITIAL_CLIENT_EXPENSES, INITIAL_PAYSTUBS, INITIAL_TIME_OFF, INITIAL_MESSAGES } from './utils';

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

// --- CUSTOM CAPTAIN HAT ICON ---
const CaptainHatIcon = ({ className }) => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10c-1-4 1-6 6-6s7 2 6 6" />
    <path d="M2 14c0-2.5 2-4 5-4h10c3 0 5 1.5 5 4 0 2-4 3-10 3S2 16.5 2 14z" />
    <circle cx="12" cy="10" r="1.5" />
  </svg>
);

// --- URL CLEANER ---
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

// ==========================================
// SHARED MODALS 
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
  const clientPhotoUrl = cleanPhotoUrl(client.photoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-teal-200 fill-current" />
            <h3 className="text-xl font-bold tracking-wide">Client Care Plan</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-teal-800/50 hover:bg-teal-800 rounded-full transition text-teal-100 hover:text-white">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {clientPhotoUrl ? (
              <img src={clientPhotoUrl} alt={client.name} className="h-24 w-24 rounded-full border-4 border-teal-50 object-cover shadow-sm" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-teal-100 border-4 border-teal-50 flex items-center justify-center shadow-sm">
                <User className="h-12 w-12 text-teal-600" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">{client.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Wallet className="h-3.5 w-3.5 mr-1.5" /> ${Number(remainingBalance || 0).toFixed(2)} Monthly Funds Left
                </span>
                {client.dateOfBirth && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> DOB: {client.dateOfBirth}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2" /> Care Notes & Routine
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {client.notes || 'No specific care notes or routine instructions provided.'}
                </p>
              </div>

              {(client.phone || client.address) && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Client Location & Contact</h4>
                  <div className="space-y-4">
                    {client.phone && (
                      <div className="flex items-center text-sm text-slate-700">
                        <div className="p-2 bg-slate-100 rounded-lg mr-3"><Phone className="h-4 w-4 text-slate-500" /></div>
                        <span className="font-semibold text-lg">{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start text-sm text-slate-700">
                        <div className="p-2 bg-slate-100 rounded-lg mr-3 mt-0.5"><MapPin className="h-4 w-4 text-slate-500" /></div>
                        <span className="font-medium leading-relaxed">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center">
                  <ShieldAlert className="h-5 w-5 mr-2" /> Emergency Contacts
                </h4>
                <div className="space-y-4">
                  {client.emergencyContactName ? (
                    <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-red-500"></div>
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Primary Contact</div>
                      <div className="font-bold text-slate-800 text-base">{client.emergencyContactName}</div>
                      <div className="text-xl font-black text-red-600 mt-1 flex items-center"><Phone className="h-5 w-5 mr-2" /> {client.emergencyContactPhone}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 italic bg-white p-4 rounded-lg border border-red-100">No primary emergency contact listed.</div>
                  )}

                  {client.secondaryEmergencyName && (
                    <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm opacity-90 relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-red-300"></div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Secondary Contact</div>
                      <div className="font-bold text-slate-800">{client.secondaryEmergencyName}</div>
                      <div className="text-lg font-bold text-red-600 mt-1 flex items-center"><Phone className="h-4 w-4 mr-2" /> {client.secondaryEmergencyPhone}</div>
                    </div>
                  )}
                </div>
              </div>

              {client.accountHolderName && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-indigo-500" /> Account Holder
                  </h4>
                  <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-3">
                    <div className="font-extrabold text-slate-800 text-base pb-2 border-b border-indigo-100/50">{client.accountHolderName}</div>
                    {client.accountHolderPhone && <div className="flex items-center text-sm text-slate-700 font-medium"><Phone className="h-4 w-4 mr-2.5 text-indigo-400" /> {client.accountHolderPhone}</div>}
                    {client.accountHolderEmail && <div className="flex items-center text-sm text-slate-700 font-medium"><Mail className="h-4 w-4 mr-2.5 text-indigo-400" /> {client.accountHolderEmail}</div>}
                    {client.accountHolderAddress && <div className="flex items-start text-sm text-slate-700 font-medium mt-1"><MapPin className="h-4 w-4 mr-2.5 text-indigo-400 mt-0.5" /> <span className="leading-relaxed">{client.accountHolderAddress}</span></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition shadow-sm">
            Close Care Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================
function AdminDashboard({ shifts = [], employees = [], clients = [], expenses = [], clientExpenses = [], paystubs = [], timeOffLogs = [], messages = [], documents = [], currentUser, payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings, onAddEmployee, onRemoveEmployee, updateEmployee, onAddClient, onRemoveClient, updateClient, onUpdateExpense, onUpdateClientExpense, onAddPaystub, onRemovePaystub, onAddTimeOffLog, onRemoveTimeOffLog, onAddDocument, onRemoveDocument, onSendMessage, onAddShift, onRemoveShift, onMarkShiftOpen }) {
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
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setIsModalOpen(true);
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const safeShifts = Array.isArray(shifts) ? shifts : [];

  const renderAdminTab = () => {
    switch (activeTab) {
      case 'employees': return <EmployeeManager employees={employees} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />;
      case 'clients': return <ClientManager clients={clients} onAddClient={onAddClient} onRemoveClient={onRemoveClient} updateClient={updateClient} />;
      case 'client-funds': return <AdminClientFundsManager clients={clients} expenses={expenses} clientExpenses={clientExpenses} employees={employees} />;
      case 'expenses': return <ExpenseManager expenses={expenses} clientExpenses={clientExpenses} employees={employees} clients={clients} onUpdateExpense={onUpdateExpense} onUpdateClientExpense={onUpdateClientExpense} />;
      case 'earnings': return <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />;
      case 'timeoff': return <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={onAddTimeOffLog} onRemoveTimeOff={onRemoveTimeOffLog} />;
      case 'paystubs': return <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />;
      case 'documents': return <DocumentManager documents={documents} onAddDocument={onAddDocument} onRemoveDocument={onRemoveDocument} isAdmin={true} />;
      case 'announcements': return <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} /></div>;
      case 'settings': return <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={setPayPeriodStart} isBonusActive={isBonusActive} setIsBonusActive={setIsBonusActive} bonusSettings={bonusSettings} setBonusSettings={setBonusSettings} />;
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
            {scheduleSearch.trim() !== '' && (
              <div className="text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 whitespace-nowrap">Filtered View Active</div>
            )}
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
                  <div key={day} onClick={() => handleDayClick(day)} className={`min-h-[120px] p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
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
                            <div className="absolute right-1 top-1 opacity-0 group-hover/shift:opacity-100 flex space-x-1 bg-white/80 p-0.5 rounded backdrop-blur-sm">
                              {!isOpen && (<button onClick={(e) => { e.stopPropagation(); onMarkShiftOpen(shift.id); }} className="text-amber-600 hover:text-amber-800 transition p-0.5 rounded" title="Mark as Open Shift (Sick Call)"><UserMinus className="h-3 w-3" /></button>)}
                              <button onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }} className="text-red-500 hover:text-red-700 transition p-0.5 rounded" title="Delete Shift"><Trash2 className="h-3 w-3" /></button>
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
    }
  };

  const adminTabs = [
    { id: 'schedule', icon: CalendarIcon, label: 'Schedule' },
    { id: 'employees', icon: Users, label: 'Employees' },
    { id: 'clients', icon: Heart, label: 'Clients' },
    { id: 'client-funds', icon: Wallet, label: 'Client Funds' },
    { id: 'expenses', icon: Receipt, label: 'Reimbursements' },
    { id: 'earnings', icon: Coins, label: 'Earnings' },
    { id: 'timeoff', icon: CalendarDays, label: 'Time Off' },
    { id: 'paystubs', icon: FileText, label: 'Paystubs' },
    { id: 'documents', icon: BookOpen, label: 'Documents' },
    { id: 'announcements', icon: MessageSquare, label: 'Announcements' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Manage schedule and personnel.</p>
        </div>
        {activeTab === 'schedule' && (
          <button onClick={() => handleDayClick(new Date().getDate() || 1)} className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition">
            <Plus className="h-5 w-5" /><span>Add Shift</span>
          </button>
        )}
      </div>

      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
        {adminTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>
      
      {renderAdminTab()}

      {isModalOpen && (
        <AddShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDateStr} employees={employees} clients={clients} onSave={onAddShift} />
      )}
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

  const handleSeedData = async () => {
    if (!firebaseUser || !db) return;
    try {
      const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, String(docId));

      for (const e of MOCK_EMPLOYEES) await setDoc(getDocRef('gn_employees', e.id), e);
      for (const c of MOCK_CLIENTS) await setDoc(getDocRef('gn_clients', c.id), c);
      for (const s of INITIAL_SHIFTS) await setDoc(getDocRef('gn_shifts', s.id.toString()), { ...s, id: s.id.toString() });
      for (const ex of INITIAL_EXPENSES) await setDoc(getDocRef('gn_expenses', ex.id.toString()), { ...ex, id: ex.id.toString() });
      for (const ce of INITIAL_CLIENT_EXPENSES) await setDoc(getDocRef('gn_clientExpenses', ce.id.toString()), { ...ce, id: ce.id.toString() });
      for (const p of INITIAL_PAYSTUBS) await setDoc(getDocRef('gn_paystubs', p.id.toString()), { ...p, id: p.id.toString() });
      for (const t of INITIAL_TIME_OFF) await setDoc(getDocRef('gn_timeOffLogs', t.id.toString()), { ...t, id: t.id.toString() });
      for (const m of INITIAL_MESSAGES) await setDoc(getDocRef('gn_messages', m.id.toString()), { ...m, id: m.id.toString() });
      
      alert("Demo database initialized successfully! You can now log in.");
    } catch (err) {
      console.error("Error seeding data:", err);
      alert("Error seeding data. Check console logs.");
    }
  };

  const handleLogin = (username, password) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const foundEmp = safeEmployees.find(e => e && e.username && String(e.username).toLowerCase() === String(username).toLowerCase() && e.password === password);
    if (foundEmp) {
      setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, timeOffBalances: foundEmp.timeOffBalances, photoUrl: foundEmp.photoUrl });
      setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
    } else { alert("Invalid credentials. Please check your username and password."); }
  };

  const handleLogout = () => { setCurrentUser(null); setViewMode('employee'); };

  const getDocRef = (cName, dId) => doc(db, 'artifacts', appId, 'public', 'data', cName, String(dId));
  
  const runMutation = async (cName, dId, action, data) => {
    if(!firebaseUser) return;
    const ref = getDocRef(cName, dId);
    if(action === 'set') await setDoc(ref, data);
    if(action === 'update') await updateDoc(ref, data);
    if(action === 'delete') await deleteDoc(ref);
  };

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

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={Boolean(isDbReady)} hasData={Boolean(Array.isArray(employees) && employees.length > 0)} onSeedData={handleSeedData} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const showAdminView = isAdmin && viewMode === 'admin';

  const finalCurrentUserPhotoUrl = cleanPhotoUrl(currentUser.photoUrl);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">
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
          <AdminDashboard 
            shifts={shifts} employees={employees} clients={clients} expenses={expenses} clientExpenses={clientExpenses} paystubs={paystubs} timeOffLogs={timeOffLogs} messages={messages} documents={documents} currentUser={currentUser} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} 
            onAddEmployee={(d) => runMutation('gn_employees', d.id, 'set', d)} onRemoveEmployee={(id) => runMutation('gn_employees', id, 'delete')} updateEmployee={(id, d) => runMutation('gn_employees', id, 'update', d)} 
            onAddClient={(d) => runMutation('gn_clients', d.id, 'set', d)} onRemoveClient={(id) => runMutation('gn_clients', id, 'delete')} updateClient={(id, d) => runMutation('gn_clients', id, 'update', d)} 
            onUpdateExpense={(id, s) => runMutation('gn_expenses', id, 'update', { status: s })} onUpdateClientExpense={(id, s) => runMutation('gn_clientExpenses', id, 'update', { status: s })} 
            onAddPaystub={(d) => runMutation('gn_paystubs', Date.now(), 'set', { ...d, id: Date.now() })} onRemovePaystub={(id) => runMutation('gn_paystubs', id, 'delete')} 
            onAddTimeOffLog={(d) => runMutation('gn_timeOffLogs', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveTimeOffLog={(id) => runMutation('gn_timeOffLogs', id, 'delete')} 
            onAddDocument={(d) => runMutation('gn_documents', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveDocument={(id) => runMutation('gn_documents', id, 'delete')} 
            onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now(), 'set', { id: Date.now(), text, senderId, date: new Date().toISOString() })} 
            setPayPeriodStart={(v) => handleSaveSettings('payPeriodStart', v)} setIsBonusActive={(v) => handleSaveSettings('isBonusActive', v)} setBonusSettings={(v) => handleSaveSettings('bonusAmounts', v)} 
            onAddShift={(d) => runMutation('gn_shifts', Date.now(), 'set', { ...d, id: Date.now() })} onRemoveShift={(id) => runMutation('gn_shifts', id, 'delete')} onMarkShiftOpen={(id) => runMutation('gn_shifts', id, 'update', { employeeId: 'unassigned' })}
          />
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
