import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, ShieldAlert, Trash2, Users, Heart, Coins, Star, Settings, Car, Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Coffee, Wallet, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, Bell, PlusCircle, MessageSquare, Send, Download, Sun, Activity, File, BookOpen } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- UTILS & COMPONENTS ---
import { MOCK_EMPLOYEES, MOCK_CLIENTS, INITIAL_SHIFTS, INITIAL_EXPENSES, INITIAL_CLIENT_EXPENSES, INITIAL_PAYSTUBS, INITIAL_TIME_OFF, INITIAL_MESSAGES, parseLocal, isBiweeklyPayday, getHoliday, getPayPeriodBounds } from './utils';

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
import AdminDesk from './components/AdminDesk';

// --- PHOTO CLEANER ---
const getValidPhoto = (url) => {
  if (!url || typeof url !== 'string' || url.includes('dicebear.com')) return null;
  return url.startsWith('[') ? (url.match(/\]\((.*?)\)/)?.[1] || null) : url;
};

// --- FIREBASE INITIALIZATION ---
let firebaseApp, auth, db, storage, appId;
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
  storage = getStorage(firebaseApp);
  appId = 'good-neighbour-portal';
} catch (e) {
  console.error("Firebase init error:", e);
}

const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
  } catch (e) {
    return new Date();
  }
};

function AddShiftModal({ isOpen, onClose, selectedDate, employees = [], clients = [], onSave }) {
  const safeEmps = Array.isArray(employees) ? employees.filter(Boolean).filter(e => e.isActive !== false) : [];
  const safeClients = Array.isArray(clients) ? clients.filter(Boolean).filter(c => c.isActive !== false) : [];
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
              {safeEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
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

function AdminDashboard({ 
  shifts = [], employees = [], setEmployees, updateEmployee, clients = [], setClients, updateClient, 
  expenses = [], onUpdateExpense, clientExpenses = [], onUpdateClientExpense, paystubs = [], 
  onAddPaystub, onRemovePaystub, timeOffLogs = [], onAddTimeOffLog, onRemoveTimeOffLog, 
  documents = [], onAddDocument, onRemoveDocument, messages = [], onSendMessage, currentUser, 
  payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings, 
  officeLocation, setOfficeLocation, onAddShift, onRemoveShift, onMarkShiftOpen, onAddEmployee, 
  onRemoveEmployee, onAddClient, onRemoveClient, onApproveTimeOff, onRejectTimeOff, onClientFileUpload,
  onAddClientExpense, onEmployeeFileUpload, notes = [], businessExpenses = [], adminDrawer = [], cabinetDocuments = [],
  appointments = [], onAddAppointment, onUpdateAppointment, onRemoveAppointment,
  onAddNote, onUpdateNote, onRemoveNote, onAddBusinessExpense, onRemoveBusinessExpense, onAddDrawerFile, onRemoveDrawerFile, onUpdateDeskPicture,
  onAddCabinetDocument, onRemoveCabinetDocument, onUpdateDeskBoard
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('desk');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [calendarView, setCalendarView] = useState('month'); 

  // --- NEW: Global Banner Mute State ---
  const [isDeskPingMuted, setIsDeskPingMuted] = useState(false);

  const isMasterAdmin = currentUser.role === 'Master Admin' || currentUser.id === 'admin1';

  // Urgent Notification Ping Logic
  const todayStr = new Date().toISOString().split('T')[0];
  
  // --- BUG FIX: Strict `isUrgent` checking ---
  const urgentNotes = notes.filter(n => n.authorId === currentUser.id && n.isUrgent === true);
  const todayAppts = appointments.filter(a => a.authorId === currentUser.id && a.date === todayStr);
  const hasUrgentDeskItem = urgentNotes.length > 0 || todayAppts.length > 0;

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (calendarView === 'day') newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (calendarView === 'day') newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const jumpToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day) => {
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setIsModalOpen(true);
  };

  const handleDayObjectClick = (d) => {
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setIsModalOpen(true);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate() || 30;
  const firstDayOfMonth = new Date(year, month, 1).getDay() || 0; 
  
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const formatFullDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  let displayHeader = '';
  if (calendarView === 'month') displayHeader = formatMonthYear(currentDate);
  if (calendarView === 'week') displayHeader = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  if (calendarView === 'day') displayHeader = formatFullDate(currentDate);

  const monthDaysArray = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const weekDaysArray = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const safeEmployees = Array.isArray(employees) ? employees.filter(Boolean) : [];
  const safeClients = Array.isArray(clients) ? clients.filter(Boolean) : [];
  const safeShifts = Array.isArray(shifts) ? shifts.filter(Boolean) : [];
  
  const filteredShifts = safeShifts.filter(s => {
    if (!s) return false;
    if (!scheduleSearch.trim()) return true;
    const emp = safeEmployees.find(e => e && e.id === s.employeeId);
    const client = safeClients.find(c => c && c.id === s.clientId);
    const searchLower = scheduleSearch.toLowerCase();
    const empMatch = emp && emp.name && String(emp.name).toLowerCase().includes(searchLower);
    const clientMatch = client && client.name && String(client.name).toLowerCase().includes(searchLower);
    return empMatch || clientMatch;
  });

  let dayViewShifts = [];
  if (calendarView === 'day') {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    dayViewShifts = filteredShifts
      .filter(s => s && s.date === dateStr)
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
  }

  const renderCalendarCell = (d, minHeight = "min-h-[120px]") => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
    const holiday = getHoliday(dateStr);
    
    const dayShifts = filteredShifts
      .filter(s => s && s.date === dateStr)
      .sort((a,b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));

    const cellTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
    
    const dayTimeOff = safeTimeOffLogs.filter(log => {
      if (log.status !== 'approved') return false;
      if (!log.startDate || !log.endDate) return false;
      const start = parseLocalSafe(log.startDate);
      const end = parseLocalSafe(log.endDate);
      const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return cellTime >= sTime && cellTime <= eTime;
    });
    
    return (
      <div key={dateStr} onClick={() => handleDayObjectClick(d)} className={`bg-white ${minHeight} p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'}`}>
        <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
          <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : 'text-slate-600'}`}>{d.getDate()}</span>
          <div className="flex flex-col items-end gap-1">
            {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {String(holiday.name).toUpperCase()}</span>)}
            {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
          </div>
        </div>
        <div className="space-y-1">
          {dayTimeOff.map(log => {
            const emp = safeEmployees.find(e => e.id === log.employeeId);
            const isSick = log.type === 'sick';
            const isVacation = log.type === 'vacation';
            return (
              <div key={`to_${log.id}`} className={`text-xs p-1.5 rounded relative border shadow-sm ${isSick ? 'bg-red-50 text-red-800 border-red-200' : isVacation ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-800 border-slate-200'}`} title={`${String(emp?.name || 'Unknown')} - ${isSick ? 'Sick Leave' : isVacation ? 'Vacation' : 'Unpaid Time Off'}`}>
                <div className="font-semibold truncate flex items-center">
                  {isSick ? <Activity className="h-3 w-3 mr-1" /> : isVacation ? <Sun className="h-3 w-3 mr-1" /> : <CalendarDays className="h-3 w-3 mr-1" />}
                  {String(emp?.name || 'Unknown').split(' ')[0]}
                </div>
                <div className="text-[9px] mt-0.5 opacity-90 uppercase tracking-wider">{isSick ? 'Sick Day' : isVacation ? 'Vacation' : 'Unpaid Leave'}</div>
              </div>
            );
          })}

          {dayShifts.map(shift => {
            const isOpen = shift.employeeId === 'unassigned';
            const emp = isOpen ? null : safeEmployees.find(e => e && e.id === shift.employeeId);
            const client = safeClients.find(c => c && c.id === shift.clientId);
            const empNameDisplay = isOpen ? '🚨 OPEN SHIFT' : String(emp?.name || 'Unknown').split(' ')[0];
            const clientNameDisplay = String(client?.name || 'Unknown Client').split(' ')[0];
            
            return (
              <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-teal-100 text-teal-800 border-teal-200'}`} title={`${isOpen ? 'OPEN SHIFT' : String(emp?.name || 'Unknown')} with ${String(client?.name || 'Unknown')}: ${shift.startTime}-${shift.endTime}`}>
                <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>{empNameDisplay}</div>
                <div className={`text-[10px] truncate flex items-center mt-0.5 ${isOpen ? 'text-amber-700' : 'text-teal-700'}`}><Heart className="h-2.5 w-2.5 mr-1 shrink-0" /><span className="truncate">{clientNameDisplay}</span></div>
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
  };

  const renderAdminTab = () => {
    switch (activeAdminTab) {
      case 'desk': 
        return <AdminDesk 
                 notes={notes} 
                 businessExpenses={businessExpenses} 
                 currentUser={currentUser} 
                 onAddNote={onAddNote} 
                 onRemoveNote={onRemoveNote} 
                 onUpdateNote={onUpdateNote} 
                 onAddBusinessExpense={onAddBusinessExpense} 
                 onRemoveBusinessExpense={onRemoveBusinessExpense} 
                 employees={employees} 
                 officeLocation={officeLocation} 
                 adminDrawer={adminDrawer} 
                 onAddDrawerFile={onAddDrawerFile} 
                 onRemoveDrawerFile={onRemoveDrawerFile} 
                 cabinetDocuments={cabinetDocuments} 
                 onAddCabinetDocument={onAddCabinetDocument} 
                 onRemoveCabinetDocument={onRemoveCabinetDocument} 
                 onUpdateDeskPicture={onUpdateDeskPicture} 
                 onUpdateDeskBoard={onUpdateDeskBoard}
                 appointments={appointments}
                 onAddAppointment={onAddAppointment}
                 onUpdateAppointment={onUpdateAppointment}
                 onRemoveAppointment={onRemoveAppointment}
               />;
      case 'employees': return <EmployeeManager employees={safeEmployees} shifts={safeShifts} payPeriodStart={payPeriodStart} onEmployeeFileUpload={onEmployeeFileUpload} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />;
      case 'clients': return <ClientManager clients={safeClients} onAddClient={onAddClient} onRemoveClient={onRemoveClient} updateClient={updateClient} shifts={safeShifts} employees={safeEmployees} clientExpenses={clientExpenses} expenses={expenses} onClientFileUpload={onClientFileUpload} />;
      case 'client-funds': return <AdminClientFundsManager clients={safeClients} expenses={expenses} clientExpenses={clientExpenses} employees={safeEmployees} onAddClientExpense={onAddClientExpense} />;      
      case 'expenses': return <ExpenseManager expenses={expenses} clientExpenses={clientExpenses} employees={safeEmployees} clients={safeClients} onUpdateExpense={onUpdateExpense} onUpdateClientExpense={onUpdateClientExpense} />;
      case 'earnings': return <AdminEarningsManager employees={safeEmployees} shifts={safeShifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />;
      case 'timeoff': return <TimeOffManager employees={safeEmployees} timeOffLogs={timeOffLogs} onApprove={onApproveTimeOff} onReject={onRejectTimeOff} onRemoveTimeOff={onRemoveTimeOffLog} />;
      case 'paystubs': return <PaystubManager paystubs={paystubs} employees={safeEmployees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />;
      case 'documents': return <DocumentManager documents={documents} onAddDocument={onAddDocument} onRemoveDocument={onRemoveDocument} isAdmin={true} />; 
      case 'announcements': return <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={safeEmployees} /></div>;
      case 'settings': return <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={setPayPeriodStart} isBonusActive={isBonusActive} setIsBonusActive={setIsBonusActive} bonusSettings={bonusSettings} setBonusSettings={setBonusSettings} officeLocation={officeLocation} setOfficeLocation={setOfficeLocation} />;
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
            {scheduleSearch.trim() !== '' && <div className="text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 whitespace-nowrap">Filtered View Active</div>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center min-w-[220px]">
                  <CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />
                  {displayHeader}
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                  <button onClick={() => setCalendarView('day')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'day' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Day</button>
                  <button onClick={() => setCalendarView('week')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'week' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Week</button>
                  <button onClick={() => setCalendarView('month')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'month' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Month</button>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto justify-end">
                  <button onClick={jumpToToday} className="px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition shadow-sm">Today</button>
                  <button onClick={navigatePrev} className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-50 transition shadow-sm"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                  <button onClick={navigateNext} className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-50 transition shadow-sm"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                </div>
              </div>
            </div>

            {calendarView === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                  {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>))}
                  {monthDaysArray.map(d => renderCalendarCell(d))}
                </div>
              </>
            )}

            {calendarView === 'week' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day} {weekDaysArray[idx].getDate()}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                  {weekDaysArray.map(d => renderCalendarCell(d, "min-h-[300px]"))}
                </div>
              </>
            )}

            {calendarView === 'day' && (
              <div className="p-6 bg-slate-50 min-h-[400px]">
                {dayViewShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <CalendarIcon className="h-16 w-16 text-slate-300 mb-4" />
                    <p className="text-lg font-medium">No shifts scheduled for this day.</p>
                    <button onClick={() => handleDayClick(currentDate.getDate() || 1)} className="mt-4 text-teal-600 hover:text-teal-800 font-medium">Add a shift</button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {dayViewShifts.map(shift => {
                      const isOpen = shift.employeeId === 'unassigned';
                      const emp = isOpen ? null : safeEmployees.find(e => e.id === shift.employeeId);
                      const client = safeClients.find(c => c.id === shift.clientId);
                      return (
                        <div key={shift.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:border-teal-300 hover:shadow-md transition gap-4">
                          <div className="flex items-center gap-5 w-full sm:w-auto">
                            <div className={`px-4 py-3 rounded-lg text-center font-bold text-sm shrink-0 border ${isOpen ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-teal-50 text-teal-800 border-teal-100'}`}>
                              {shift.startTime} <br/><span className="text-[10px] font-normal opacity-80 uppercase tracking-widest">to</span><br/> {shift.endTime}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-lg font-bold text-slate-800 flex items-center truncate">
                                {isOpen ? <><AlertCircle className="w-5 h-5 mr-1.5 text-amber-500" /> OPEN SHIFT</> : String(emp?.name || 'Unknown')}
                              </h4>
                              <div className="text-sm text-slate-600 flex items-center mt-1.5 font-medium truncate">
                                <Heart className="h-4 w-4 mr-1.5 text-teal-500 shrink-0" />
                                Client: {String(client?.name || 'Unknown')}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            {!isOpen && (<button onClick={() => onMarkShiftOpen(shift.id)} className="w-full sm:w-auto px-4 py-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition font-medium flex items-center justify-center"><UserMinus className="h-4 w-4 mr-1.5 shrink-0" /> Mark Open</button>)}
                            <button onClick={() => onRemoveShift(shift.id)} className="w-full sm:w-auto px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition font-medium flex items-center justify-center"><Trash2 className="h-4 w-4 mr-1.5 shrink-0"/> Delete Shift</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const tabs = [
    {id: 'desk', icon: Coffee, label: 'The Desk'}, 
    {id: 'schedule', icon: CalendarIcon, label: 'Schedule'}, 
    {id: 'employees', icon: Users, label: 'Employees'}, 
    {id: 'clients', icon: Heart, label: 'Clients'}, 
    {id: 'client-funds', icon: Wallet, label: 'Client Funds'}, 
    {id: 'expenses', icon: Receipt, label: 'Reimbursements'}, 
    {id: 'earnings', icon: Coins, label: 'Earnings'}, 
    {id: 'timeoff', icon: CalendarDays, label: 'Time Off'}, 
    {id: 'paystubs', icon: FileText, label: 'Paystubs'}, 
    {id: 'documents', icon: BookOpen, label: 'Documents'}, 
    {id: 'announcements', icon: MessageSquare, label: 'Announcements'}
  ];

  if (isMasterAdmin) {
    tabs.push({id: 'settings', icon: Settings, label: 'Settings'});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Manage schedule and personnel.</p>
        </div>
        {activeAdminTab === 'schedule' && (
          <button onClick={() => handleDayClick(new Date().getDate() || 1)} className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition">
            <Plus className="h-5 w-5" /><span>Add Shift</span>
          </button>
        )}
      </div>

      {/* --- PING ALERT FOR GLOBAL NAV WITH MUTE --- */}
      {hasUrgentDeskItem && activeAdminTab !== 'desk' && !isDeskPingMuted && (
        <div className="bg-red-500 text-white p-3 rounded-lg flex items-center justify-between shadow-md animate-pulse mb-4">
          <div className="flex items-center cursor-pointer flex-1" onClick={() => setActiveAdminTab('desk')}>
            <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
            <span className="font-bold text-sm">You have urgent reminders or appointments due today!</span>
          </div>
          <button onClick={() => setIsDeskPingMuted(true)} className="text-red-200 hover:text-white p-1 ml-3" title="Dismiss">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto scrollbar-hide pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveAdminTab(tab.id)} className={`relative px-2 py-1 font-medium whitespace-nowrap flex items-center ${activeAdminTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
            {tab.id === 'desk' && hasUrgentDeskItem && <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>}
          </button>
        ))}
      </div>
      
      {renderAdminTab()}

      {isModalOpen && (
        <AddShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDateStr} employees={safeEmployees} clients={safeClients} onSave={onAddShift} />
      )}
    </div>
  );
}

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
  
  // DATABASES FOR THE DESK
  const [notes, setNotes] = useState([]);
  const [businessExpenses, setBusinessExpenses] = useState([]);
  const [adminDrawer, setAdminDrawer] = useState([]);
  const [cabinetDocuments, setCabinetDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Settings State
  const [payPeriodStart, setPayPeriodStart] = useState('2026-04-01');
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [bonusSettings, setBonusSettings] = useState({ monthly: [100, 50, 20], annual: [3000, 2000, 1000] });
  const [officeLocation, setOfficeLocation] = useState('Port Colborne, ON');

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
    
    // DESK LISTENERS
    unsubs.push(onSnapshot(getCol('gn_notes'), snap => setNotes(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_businessExpenses'), snap => setBusinessExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_adminDrawer'), snap => setAdminDrawer(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_cabinetDocuments'), snap => setCabinetDocuments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_appointments'), snap => setAppointments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));

    unsubs.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'gn_settings', 'global'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payPeriodStart) setPayPeriodStart(data.payPeriodStart);
        if (data.isBonusActive !== undefined) setIsBonusActive(data.isBonusActive);
        if (data.bonusAmounts) setBonusSettings(data.bonusAmounts);
        if (data.officeLocation) setOfficeLocation(data.officeLocation);
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
      
      alert("Demo database initialized successfully!");
    } catch (err) {
      console.error("Error seeding data:", err);
      alert("Error seeding data. Check console logs.");
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const secureEmail = userCredential.user.email;

      const safeEmployees = Array.isArray(employees) ? employees : [];
      const foundEmp = safeEmployees.find(e => e && e.email && String(e.email).toLowerCase() === String(secureEmail).toLowerCase());
      
      if (foundEmp) {
        setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, annualSalary: foundEmp.annualSalary, timeOffBalances: foundEmp.timeOffBalances, photoUrl: foundEmp.photoUrl, deskPictureUrl: foundEmp.deskPictureUrl, deskBoard: foundEmp.deskBoard, hireDate: foundEmp.hireDate });
        setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
      } else { 
        alert("Login successful, but this email is not assigned to an employee profile in the directory. Please contact the administrator."); 
      }
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Invalid email or password. Please try again.");
    }
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

  const handleFileUpload = async (file, folder) => {
    if (!file || !firebaseUser || !storage) return null;
    try {
      const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const fileRef = ref(storage, `${appId}/${folder}/${uniqueName}`);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("File upload failed. Please try again.");
      return null;
    }
  };

  const handleSaveSettings = async (field, value) => {
    if (!firebaseUser) return;
    
    if (field === 'payPeriodStart') setPayPeriodStart(value);
    if (field === 'isBonusActive') setIsBonusActive(value);
    if (field === 'bonusAmounts') setBonusSettings(value);
    if (field === 'officeLocation') setOfficeLocation(value);
    
    const payload = { 
      payPeriodStart: field === 'payPeriodStart' ? value : payPeriodStart, 
      isBonusActive: field === 'isBonusActive' ? value : isBonusActive, 
      bonusAmounts: field === 'bonusAmounts' ? value : bonusSettings,
      officeLocation: field === 'officeLocation' ? value : officeLocation
    };
    
    await setDoc(getDocRef('gn_settings', 'global'), payload, { merge: true });
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

  const handleApproveTimeOff = (request) => {
    runMutation('gn_timeOffLogs', request.id, 'update', { status: 'approved' });
    const shiftMatches = shifts.filter(s => s.employeeId === request.employeeId && s.date >= request.startDate && s.date <= request.endDate);
    shiftMatches.forEach(shift => { runMutation('gn_shifts', shift.id, 'update', { employeeId: 'unassigned' }); });
  };

  const handleRejectTimeOff = (requestId) => {
    runMutation('gn_timeOffLogs', requestId, 'update', { status: 'rejected' });
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={Boolean(isDbReady)} hasData={Boolean(Array.isArray(employees) && employees.length > 0)} onSeedData={handleSeedData} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const showAdminView = isAdmin && viewMode === 'admin';
  const finalPhotoUrl = getValidPhoto(currentUser.photoUrl);

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
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border border-teal-500 overflow-hidden mr-2 shrink-0">
              {finalPhotoUrl ? <img src={finalPhotoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" /> : <User className="h-4 w-4" />}
            </div>
            {String(currentUser.name)}
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-teal-600 transition" title="Logout"><LogOut className="h-5 w-5"/></button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {showAdminView ? (
          <AdminDashboard 
            shifts={shifts} 
            employees={employees} 
            onAddEmployee={async (d, file) => {
              let url = d.photoUrl || '';
              if (file) url = await handleFileUpload(file, 'avatars');
              runMutation('gn_employees', d.id, 'set', { ...d, photoUrl: url });
              }} 
            updateEmployee={async (id, d, file, certFiles = {}) => {
              const existingEmp = employees.find(e => e.id === id);
              let url = d.photoUrl || existingEmp?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              const updatedReqs = { ...(d.requirements || existingEmp?.requirements || {}) };
              for (const [reqKey, certFile] of Object.entries(certFiles)) {
                if (certFile) {
                  const certUrl = await handleFileUpload(certFile, 'certificates');
                  if (certUrl) updatedReqs[reqKey] = { ...updatedReqs[reqKey], fileUrl: certUrl };
                }
              }
              runMutation('gn_employees', id, 'update', { ...d, photoUrl: url, requirements: updatedReqs });
            }}            
            clients={clients} 
            onAddClient={(d) => runMutation('gn_clients', d.id, 'set', d)} 
            onRemoveClient={(id) => runMutation('gn_clients', id, 'delete')} 
            updateClient={async (id, d, file) => {
              const existingClient = clients.find(c => c.id === id);
              let url = d.photoUrl || existingClient?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              
              if (d.isActive === false && existingClient?.isActive !== false) {
                 const now = new Date();
                 const upcoming = shifts.filter(s => s.clientId === id && new Date(`${s.date}T${s.endTime || '23:59'}`) >= now);
                 for (const s of upcoming) {
                     await runMutation('gn_shifts', s.id, 'delete');
                 }
              }
              runMutation('gn_clients', id, 'update', { ...d, photoUrl: url });
            }} 
            onClientFileUpload={async (clientId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingClient = clients.find(c => c.id === clientId);
              const currentUploads = existingClient?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_clients', clientId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
            }}
            onEmployeeFileUpload={async (employeeId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingEmp = employees.find(e => e.id === employeeId);
              const currentUploads = existingEmp?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_employees', employeeId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
            }}
            expenses={expenses} 
            onUpdateExpense={(id, s) => runMutation('gn_expenses', id, 'update', { status: s })} 
            clientExpenses={clientExpenses} 
            onUpdateClientExpense={(id, s) => runMutation('gn_clientExpenses', id, 'update', { status: s })} 
            onAddClientExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_clientExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'approved', receiptUrl: url });
            }}

            paystubs={paystubs} 
            timeOffLogs={timeOffLogs} 
            onAddTimeOffLog={(d) => runMutation('gn_timeOffLogs', Date.now().toString(), 'set', { ...d, id: Date.now().toString() })} 
            onRemoveTimeOffLog={(id) => runMutation('gn_timeOffLogs', id, 'update', { status: 'cancelled' })} 
            
            documents={documents} 
            messages={messages} 
            onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now().toString(), 'set', { id: Date.now().toString(), text, senderId, date: new Date().toISOString() })} 
            currentUser={currentUser} 
            payPeriodStart={payPeriodStart} 
            setPayPeriodStart={(v) => handleSaveSettings('payPeriodStart', v)} 
            isBonusActive={isBonusActive} 
            setIsBonusActive={(v) => handleSaveSettings('isBonusActive', v)} 
            bonusSettings={bonusSettings} 
            setBonusSettings={(v) => handleSaveSettings('bonusAmounts', v)} 
            
            onAddDocument={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_documents', d.id || Date.now().toString(), 'set', { ...d, id: d.id || Date.now().toString(), fileUrl: url });
            }}
            onRemoveDocument={(id) => runMutation('gn_documents', id, 'delete')}
            
            onAddPaystub={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'paystubs');
              runMutation('gn_paystubs', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemovePaystub={(id) => runMutation('gn_paystubs', id, 'delete')}
            onAddShift={async (newShifts) => {
              if (!firebaseUser) return;
              const arr = Array.isArray(newShifts) ? newShifts : [newShifts];
              for (const s of arr) {
                const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
                await setDoc(getDocRef('gn_shifts', id), { ...s, id });
              }
            }} 
            onRemoveShift={(id) => runMutation('gn_shifts', id, 'delete')} 
            onMarkShiftOpen={(id) => runMutation('gn_shifts', id, 'update', { employeeId: 'unassigned' })}
            onApproveTimeOff={handleApproveTimeOff}
            onRejectTimeOff={handleRejectTimeOff}

            // --- DESK PROPS ---
            notes={notes}
            businessExpenses={businessExpenses}
            onAddNote={(data) => runMutation('gn_notes', Date.now().toString(), 'set', { ...data, id: Date.now().toString() })}
            onUpdateNote={(id, data) => runMutation('gn_notes', id, 'update', data)}
            onRemoveNote={(id) => runMutation('gn_notes', id, 'delete')}
            onAddBusinessExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_businessExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), receiptUrl: url });
            }}
            onRemoveBusinessExpense={(id) => runMutation('gn_businessExpenses', id, 'delete')}
            
            officeLocation={officeLocation}
            adminDrawer={adminDrawer}
            onAddDrawerFile={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_adminDrawer', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemoveDrawerFile={(id) => runMutation('gn_adminDrawer', id, 'delete')}
            onUpdateDeskPicture={async (file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'avatars');
              if (url) {
                runMutation('gn_employees', currentUser.id, 'update', { deskPictureUrl: url });
                setCurrentUser(prev => ({ ...prev, deskPictureUrl: url }));
              }
            }}
            cabinetDocuments={cabinetDocuments}
            onAddCabinetDocument={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_cabinetDocuments', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemoveCabinetDocument={(id) => runMutation('gn_cabinetDocuments', id, 'delete')}

            onUpdateDeskBoard={async (boardData) => {
              if (!currentUser) return;
              runMutation('gn_employees', currentUser.id, 'update', { deskBoard: boardData });
              setCurrentUser(prev => ({ ...prev, deskBoard: boardData }));
            }}
            appointments={appointments}
            onAddAppointment={(data) => runMutation('gn_appointments', Date.now().toString(), 'set', { ...data, id: Date.now().toString() })}
            onUpdateAppointment={(id, data) => runMutation('gn_appointments', id, 'update', data)}
            onRemoveAppointment={(id) => runMutation('gn_appointments', id, 'delete')}
          />
        ) : (
          <EmployeeDashboard 
            shifts={shifts} 
            employees={employees} 
            currentUser={currentUser} 
            clients={clients} 
            expenses={expenses} 
            onAddExpense={(d) => runMutation('gn_expenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'pending' })} 
            clientExpenses={clientExpenses} 
            onAddClientExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_clientExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'pending', receiptUrl: url });
            }}
            paystubs={paystubs} 
            timeOffLogs={timeOffLogs} 
            messages={messages} 
            documents={documents} 
            onSendMessage={(text, senderId) => runMutation('gn_messages', Date.now().toString(), 'set', { id: Date.now().toString(), text, senderId, date: new Date().toISOString() })} 
            payPeriodStart={payPeriodStart} 
            isBonusActive={isBonusActive} 
            bonusSettings={bonusSettings} 
            onPickupShift={(shiftId, empId) => runMutation('gn_shifts', shiftId, 'update', { employeeId: empId })} 
            setSelectedClient={setSelectedClient}
            getClientRemainingBalance={getClientRemainingBalance}
            onUpdateProfile={async (id, d, file) => {
              const existingEmp = employees.find(e => e.id === id);
              let url = d.photoUrl || existingEmp?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              const updatedData = { ...d, photoUrl: url };
              runMutation('gn_employees', id, 'update', updatedData);
              setCurrentUser(prev => ({ ...prev, ...updatedData })); 
            }}
            onEmployeeFileUpload={async (employeeId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingEmp = employees.find(e => e.id === employeeId);
              const currentUploads = existingEmp?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_employees', employeeId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
              setCurrentUser(prev => ({ ...prev, uploadedFiles: [...currentUploads, newFileRecord] }));
            }}
            onAddTimeOff={(req) => runMutation('gn_timeOffLogs', req.id, 'set', { ...req, status: 'pending', dateSubmitted: new Date().toISOString() })}
          />
        )}
      </main>

      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={getClientRemainingBalance(selectedClient.id)} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}
