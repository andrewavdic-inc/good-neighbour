import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, LogOut, Plus, ChevronLeft, ChevronRight, Briefcase, CalendarDays, ShieldAlert, Trash2, Users, Heart, Coins, Star, Settings, Car, Receipt, CheckCircle, XCircle, AlertCircle, Phone, FileText, Info, Coffee, Wallet, Image as ImageIcon, Edit, ShieldCheck, Mail, MapPin, Search, UserMinus, Bell, PlusCircle, MessageSquare, Send, Download, Sun, Activity } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- UTILS & COMPONENTS ---
import { MOCK_EMPLOYEES, MOCK_CLIENTS, INITIAL_SHIFTS, INITIAL_EXPENSES, INITIAL_CLIENT_EXPENSES, INITIAL_PAYSTUBS, INITIAL_TIME_OFF, INITIAL_MESSAGES, parseLocal, isBiweeklyPayday, getHoliday } from './utils';

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

// --- FIREBASE INITIALIZATION ---
let firebaseApp, auth, db, appId;
try {
  // Add your keys here
  const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
    projectId: "PASTE_YOUR_PROJECT_ID_HERE",
    storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
    appId: "PASTE_YOUR_APP_ID_HERE"
  };
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  appId = 'good-neighbour-portal';
} catch (e) {
  console.error("Firebase init error:", e);
}

// ==========================================
// INLINE COMPONENTS
// ==========================================

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
        
        if (getHoliday(dateStr)) continue;
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
            <input type="date" value={selectedDate} readOnly className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required>
              {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              <span>Repeat Weekly</span>
            </label>
            {isRecurring && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">For how many weeks?</label>
                  <select value={recurrenceWeeks} onChange={(e) => setRecurrenceWeeks(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                    <option value={4}>4 Weeks (1 Month)</option>
                    <option value={12}>12 Weeks (3 Months)</option>
                    <option value={26}>26 Weeks (6 Months)</option>
                    <option value={52}>52 Weeks (1 Year)</option>
                  </select>
                </div>
              </div>
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white">
          <h3 className="text-lg font-bold flex items-center"><Heart className="h-5 w-5 mr-2 text-teal-200" /> Client Profile</h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            {client.photoUrl ? <img src={client.photoUrl} alt={client.name} className="h-16 w-16 rounded-full border-2 border-teal-100 object-cover" /> :
              <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><User className="h-8 w-8" /></div>}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
              <div className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                <Wallet className="h-3 w-3 mr-1" /> ${remainingBalance.toFixed(2)} Monthly Funds Left
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Info className="h-4 w-4 mr-1.5" /> Care Notes & Routine</h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{client.notes || 'No special instructions provided.'}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !clientId || !kilometers) return;
    onAddExpense({ date, clientId, kilometers: Number(kilometers), description });
    setDate(''); setClientId(''); setKilometers(''); setDescription('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Mileage Log</h2></div>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Client *</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required><option value="" disabled>Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Kilometers *</label><input type="number" min="0.1" step="0.1" value={kilometers} onChange={(e)=>setKilometers(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" placeholder="e.g. 15" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Description</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" placeholder="e.g. Grocery trip" /></div>
          </div>
          <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 transition text-sm flex items-center justify-center"><Plus className="h-4 w-4 mr-1"/> Submit Mileage</button>
        </form>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {safeExpenses.length === 0 ? <div className="text-center text-sm text-slate-500 py-4">No mileage logged yet.</div> :
          [...safeExpenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(exp => {
            const client = clients.find(c => c.id === exp.clientId);
            return (
              <div key={exp.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{parseLocal(exp.date).toLocaleDateString()} <span className="text-slate-500 font-normal ml-1">for {client?.name}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{exp.kilometers} km &bull; {exp.description}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
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
  const [receiptDetails, setReceiptDetails] = useState('');
  const safeClientExpenses = Array.isArray(myClientExpenses) ? myClientExpenses : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !clientId || !amount) return;
    onAddClientExpense({ date, clientId, amount: Number(amount), description, receiptDetails });
    setDate(''); setClientId(''); setAmount(''); setDescription(''); setReceiptDetails('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Client Expenses</h2></div>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Client *</label><select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" required><option value="" disabled>Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Amount ($) *</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" placeholder="e.g. 15.50" required /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Item</label><input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" placeholder="e.g. Coffee" /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Receipt Note/Link</label><input type="text" value={receiptDetails} onChange={(e)=>setReceiptDetails(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" placeholder="e.g. Handed to client" /></div>
          <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 transition text-sm flex items-center justify-center"><Plus className="h-4 w-4 mr-1"/> Submit Expense</button>
        </form>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {safeClientExpenses.length === 0 ? <div className="text-center text-sm text-slate-500 py-4">No expenses logged yet.</div> :
          [...safeClientExpenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(exp => {
            const client = clients.find(c => c.id === exp.clientId);
            return (
              <div key={exp.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{parseLocal(exp.date).toLocaleDateString()} <span className="text-slate-500 font-normal ml-1">for {client?.name}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">${exp.amount.toFixed(2)} &bull; {exp.description}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
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
            {[...safePaystubs].sort((a,b) => {
              const dateA = a?.date ? new Date(a.date).getTime() : 0;
              const dateB = b?.date ? new Date(b.date).getTime() : 0;
              return dateB - dateA;
            }).map(ps => (
              <div key={ps?.id || Math.random()} className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-teal-400 transition cursor-pointer group bg-slate-50">
                <FileText className="h-8 w-8 text-teal-600 mr-3 opacity-70 group-hover:opacity-100 transition" />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{ps?.date ? parseLocal(ps.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date'}</div>
                  <div className="text-xs text-slate-500 truncate w-32" title={ps?.fileName}>{ps?.fileName || 'Unnamed File'}</div>
                </div>
                <Download className="h-4 w-4 text-slate-400 ml-auto group-hover:text-teal-600 transition" />
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function EmployeeDashboard({ shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], timeOffLogs = [], messages = [], onSendMessage, onPickupShift }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClient, setSelectedClient] = useState(null);

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const myShifts = safeShifts.filter(s => s.employeeId === currentUser.id);
  const myExpenses = (Array.isArray(expenses) ? expenses : []).filter(e => e.employeeId === currentUser.id);
  const myClientExpenses = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e.employeeId === currentUser.id);
  const myPaystubs = (Array.isArray(paystubs) ? paystubs : []).filter(p => p.employeeId === currentUser.id);
  const openShifts = safeShifts.filter(s => s.employeeId === 'unassigned');
  
  const now = new Date();
  const upcomingShifts = myShifts
    .filter(s => new Date(`${s.date}T${s.endTime}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
  const nextShift = upcomingShifts[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-4">
              <User className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{currentUser.name}</h2>
            <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full mt-2 border border-teal-100">{currentUser.role}</span>
          </div>

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
                    <span className="font-medium">{parseLocal(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Clock className="h-5 w-5 mr-3 text-slate-400" />
                    <span className="font-medium">{nextShift.startTime} - {nextShift.endTime}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Heart className="h-5 w-5 mr-3 text-slate-400" />
                    <span className="font-medium">{clients.find(c => c.id === nextShift.clientId)?.name}</span>
                  </div>
                  <button onClick={() => setSelectedClient(clients.find(c => c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded transition text-sm flex items-center justify-center">
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
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Paystubs</button>
              <button onClick={() => setActiveTab('announcements')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Team Feed</button>
            </div>

            <div className="p-0">
              {activeTab === 'schedule' && (
                <div className="divide-y divide-slate-100">
                  {upcomingShifts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>
                  ) : (
                    upcomingShifts.map(shift => {
                      const client = clients.find(c => c.id === shift.clientId);
                      return (
                        <div key={shift.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start space-x-4">
                            <div className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px]">
                              <div className="text-xs font-bold text-teal-600 uppercase">{parseLocal(shift.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                              <div className="text-xl font-extrabold text-teal-800">{parseLocal(shift.date).getDate()}</div>
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
              )}

              {activeTab === 'open-shifts' && (
                <div className="bg-amber-50/30 p-4">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Shifts Needing Coverage</h3>
                  <div className="space-y-3">
                    {openShifts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No open shifts at this time.</p>
                    ) : (
                      openShifts.map(shift => {
                        const client = clients.find(c => c.id === shift.clientId);
                        return (
                          <div key={shift.id} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <div className="font-bold text-slate-800">{parseLocal(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                              <div className="text-sm text-slate-600 mt-1">{shift.startTime} - {shift.endTime} &bull; {client?.name}</div>
                            </div>
                            <button 
                              onClick={() => onPickupShift(shift.id, currentUser.id)}
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
                  <EmployeeMileageLog myExpenses={myExpenses} clients={clients} getClientRemainingBalance={getClientRemainingBalance} onAddExpense={onAddExpense} />
                  <EmployeeClientExpenseLog myClientExpenses={myClientExpenses} clients={clients} getClientRemainingBalance={getClientRemainingBalance} onAddClientExpense={onAddClientExpense} />
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
          remainingBalance={getClientRemainingBalance(selectedClient.id)}
          onClose={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
}

function AdminDashboard({ shifts = [], employees = [], clients = [], expenses = [], clientExpenses = [], paystubs = [], timeOffLogs = [], messages = [], onAddEmployee, onRemoveEmployee, updateEmployee, onAddClient, onRemoveClient, updateClient, onUpdateExpense, onUpdateClientExpense, onAddPaystub, onRemovePaystub, onAddTimeOffLog, onRemoveTimeOffLog, onSendMessage, currentUser, payPeriodStart, setPayPeriodStart, onAddShift, onRemoveShift, onMarkShiftOpen }) {
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
        <AdminEarningsManager employees={employees} shifts={shifts} expenses={expenses} clientExpenses={clientExpenses} payPeriodStart={payPeriodStart} />
      ) : activeTab === 'timeoff' ? (
        <TimeOffManager employees={employees} timeOffLogs={timeOffLogs} onAddTimeOff={onAddTimeOffLog} onRemoveTimeOff={onRemoveTimeOffLog} />
      ) : activeTab === 'paystubs' ? (
        <PaystubManager paystubs={paystubs} employees={employees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />
      ) : activeTab === 'announcements' ? (
        <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={employees} /></div>
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
    if (!auth) {
      alert("Firebase failed to initialize. Please check your firebaseConfig keys!");
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Firebase Auth Error:', error);
        alert(`Firebase Auth Error: ${error.message}\n\nPlease ensure 'Anonymous' sign-in is enabled in your Firebase console under Authentication > Sign-in method.`);
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
    const handleError = (err) => {
      console.error("Firestore Error:", err);
      alert(`Firestore Error: ${err.message}\n\nPlease ensure your Firestore database is created and rules are set to Test Mode (allow read, write).`);
    };

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
    if (!firebaseUser) {
      alert("Cannot initialize database: You are not connected to Firebase Authentication. Please check your config keys and ensure Anonymous Auth is enabled.");
      return;
    }
    if (!db) {
      alert("Cannot initialize database: Firestore is not connected. Did you click 'Create Database' in the Firebase console?");
      return;
    }
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