import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Briefcase, 
  CalendarDays, Trash2, Users, Heart, Coins, Settings, Receipt, XCircle, 
  AlertCircle, FileText, Coffee, Wallet, Search, UserMinus, MessageSquare, 
  Sun, Activity, BookOpen, Award, AlertTriangle, Copy, CheckCircle, Edit
} from 'lucide-react';

// --- SUB-COMPONENT IMPORTS ---
import AdminDesk from './AdminDesk';
import EmployeeManager from './EmployeeManager';
import ClientManager from './ClientManager';
import AdminClientFundsManager from './AdminClientFundsManager';
import ExpenseManager from './ExpenseManager';
import AdminEarningsManager from './AdminEarningsManager';
import TimeOffManager from './TimeOffManager';
import PaystubManager from './PaystubManager';
import DocumentManager from './DocumentManager';
import Announcements from './Announcements';
import AdminRewardsManager from './AdminRewardsManager';
import SettingsManager from './SettingsManager';
import AddShiftModal from './AddShiftModal'; 

import { isBiweeklyPayday, getHoliday } from '../utils';

// --- INLINE DATE HELPER ---
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

// --- PUNCH CLOCK CALCULATOR ---
const getPunchText = (shift) => {
  if (!shift.actualStartTime || !shift.actualEndTime) return null;
  const start = new Date(shift.actualStartTime);
  const end = new Date(shift.actualEndTime);
  const diffMs = end - start;
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.round((diffMs % 3600000) / 60000);
  return `⏱️ Punch: ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${hrs}h ${mins}m)`;
};

export default function AdminDashboard({ 
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
  onAddCabinetDocument, onRemoveCabinetDocument, onUpdateDeskBoard,
  onApproveShiftCancelDelete, onApproveShiftCancelOpen, onDenyShiftCancel,
  onDeleteMessage, onAcknowledgeMessage, announcementPictureUrl, onUpdateAnnouncementPicture,
  kudos = [], prizes = [], onAddKudos, onRemoveKudos, onAddPrize, onRemovePrize,
  payrollLogs = [], onFinalizePayroll, onUpdateShift
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  
  const [editingShift, setEditingShift] = useState(null);

  const [activeAdminTab, setActiveAdminTab] = useState('schedule');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [calendarView, setCalendarView] = useState('month'); 

  const [isDeskPingMuted, setIsDeskPingMuted] = useState(false);
  
  const [adminScheduleUpdates, setAdminScheduleUpdates] = useState([]);
  const [showAdminUpdateBanner, setShowAdminUpdateBanner] = useState(false);

  const isMasterAdmin = currentUser.role === 'Master Admin' || currentUser.id === 'admin1';

  // --- Scoped Data ---
  const safeEmployees = Array.isArray(employees) ? employees.filter(Boolean) : [];
  const safeClients = Array.isArray(clients) ? clients.filter(Boolean) : [];
  const safeShifts = Array.isArray(shifts) ? shifts.filter(Boolean) : [];

  // --- Ping Logic ---
  const todayStr = new Date().toISOString().split('T')[0];
  const urgentNotes = notes.filter(n => n.authorId === currentUser.id && n.isUrgent === true);
  const todayAppts = appointments.filter(a => a.authorId === currentUser.id && a.date === todayStr);
  const hasUrgentDeskItem = urgentNotes.length > 0 || todayAppts.length > 0;

  const pendingCancellations = safeShifts.filter(s => s.cancelRequest?.pending === true);

  // --- CRITICAL ALERT: UNASSIGNED SHIFTS TODAY/TOMORROW ---
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const urgentOpenShifts = safeShifts.filter(s => s.employeeId === 'unassigned' && (s.date === todayStr || s.date === tomorrowStr));

  // --- SMART TRACKER: SHIFT CLAIM NOTIFICATIONS ---
  useEffect(() => {
    const saved = localStorage.getItem('gn_admin_shift_snapshot');
    if (saved) {
      const snapshot = JSON.parse(saved);
      const changes = [];
      
      safeShifts.forEach(liveShift => {
        const snapShift = snapshot.find(s => s.id === liveShift.id);
        if (snapShift && snapShift.employeeId === 'unassigned' && liveShift.employeeId !== 'unassigned') {
          const emp = safeEmployees.find(e => e.id === liveShift.employeeId);
          const client = safeClients.find(c => c.id === liveShift.clientId);
          const dateStr = parseLocalSafe(liveShift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          changes.push(`🟢 CLAIMED: ${emp?.name || 'An employee'} picked up the open shift with ${client?.name || 'Unknown'} on ${dateStr}`);
        }
      });

      if (changes.length > 0) {
        setAdminScheduleUpdates(changes);
        setShowAdminUpdateBanner(true);
      } else {
        setAdminScheduleUpdates([]);
        setShowAdminUpdateBanner(false);
      }
    } else {
      const snapshot = safeShifts.map(s => ({ id: s.id, employeeId: s.employeeId }));
      localStorage.setItem('gn_admin_shift_snapshot', JSON.stringify(snapshot));
    }
  }, [safeShifts, safeEmployees, safeClients]);

  const acknowledgeAdminScheduleUpdates = () => {
    setAdminScheduleUpdates([]);
    setShowAdminUpdateBanner(false);
    const snapshot = safeShifts.map(s => ({ id: s.id, employeeId: s.employeeId }));
    localStorage.setItem('gn_admin_shift_snapshot', JSON.stringify(snapshot));
  };

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

  const handleDayObjectClick = (d) => {
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setEditingShift(null); // Ensure we are opening in "Add" mode
    setIsModalOpen(true);
  };

  const handleDayNumberClick = (e, d) => {
    e.stopPropagation(); 
    setCurrentDate(d);
    setCalendarView('day');
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

  const handleClonePreviousWeek = () => {
    const prevStart = new Date(startOfWeek);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(endOfWeek);
    prevEnd.setDate(prevEnd.getDate() - 7);

    const shiftsToClone = safeShifts.filter(s => {
        if (!s.date) return false;
        const d = parseLocalSafe(s.date);
        return d >= prevStart && d <= prevEnd;
    });

    if (shiftsToClone.length === 0) {
        alert("No shifts found in the previous week to clone.");
        return;
    }

    if (window.confirm(`Found ${shiftsToClone.length} shifts from the previous week. Clone them to the currently viewed week?`)) {
        const clonedShifts = shiftsToClone.map(s => {
            const oldDate = parseLocalSafe(s.date);
            const newDate = new Date(oldDate);
            newDate.setDate(newDate.getDate() + 7);
            const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
            
            return {
                ...s,
                id: undefined, 
                date: newDateStr,
                cancelRequest: null, 
                actualStartTime: null, 
                actualEndTime: null 
            };
        });
        
        if(onAddShift) onAddShift(clonedShifts);
    }
  };
  
  const filteredShifts = safeShifts.filter(s => {
    if (!s) return false;
    if (scheduleSearch === 'unassigned') return s.employeeId === 'unassigned';
    if (!scheduleSearch.trim()) return true;
    const emp = safeEmployees.find(e => e && e.id === s.employeeId);
    
    const clientMatch = s.isInternal 
      ? String(s.internalTask).toLowerCase().includes(scheduleSearch.toLowerCase())
      : (() => {
          const c = safeClients.find(client => client && client.id === s.clientId);
          return c && c.name && String(c.name).toLowerCase().includes(scheduleSearch.toLowerCase());
        })();
        
    const searchLower = scheduleSearch.toLowerCase();
    const empMatch = emp && emp.name && String(emp.name).toLowerCase().includes(searchLower);
    
    return empMatch || clientMatch;
  });

  // --- MONTH & WEEK RENDER ENGINE ---
  const renderCalendarCell = (d, minHeight = "min-h-[120px]", isWeekView = false) => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
    const holiday = getHoliday(dateStr);
    const isToday = dateStr === todayStr; 
    
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

    const maxShifts = isWeekView ? 999 : 3;
    const visibleShifts = dayShifts.slice(0, maxShifts);
    const hiddenCount = dayShifts.length - maxShifts;
    
    return (
      <div key={dateStr} onClick={() => handleDayObjectClick(d)} className={`bg-white ${minHeight} p-2 hover:bg-teal-50 transition cursor-pointer group relative ${holiday ? 'bg-purple-50/50' : 'bg-white'} ${isToday ? 'border-2 border-teal-500 shadow-sm z-10' : ''}`}>
        <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
          
          <span 
            onClick={(e) => handleDayNumberClick(e, d)}
            className={`font-medium text-sm px-1.5 py-0.5 -ml-1.5 rounded hover:bg-slate-200 hover:text-teal-800 transition cursor-pointer z-20 group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : isToday ? 'text-teal-700 font-bold' : 'text-slate-600'}`}
            title="Jump to Timeline Day View"
          >
            {d.getDate()}
          </span>

          <div className="flex flex-col items-end gap-1">
            {isToday && (<span className="text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded shadow-sm">TODAY</span>)}
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
              </div>
            );
          })}

          {visibleShifts.map(shift => {
            const isOpen = shift.employeeId === 'unassigned';
            const emp = isOpen ? null : safeEmployees.find(e => e && e.id === shift.employeeId);
            const client = shift.isInternal ? null : safeClients.find(c => c && c.id === shift.clientId);
            
            const empNameDisplay = isOpen ? '🚨 OPEN SHIFT' : String(emp?.name || 'Unknown').split(' ')[0];
            const clientNameDisplay = shift.isInternal ? shift.internalTask : String(client?.name || 'Unknown Client').split(' ')[0];
            const punchText = getPunchText(shift);
            
            const bgBorderClass = isOpen ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 
                                  shift.isInternal ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 
                                  'bg-teal-100 text-teal-800 border-teal-200';
            
            return (
              <div key={shift.id || Math.random()} className={`text-xs p-1.5 rounded relative group/shift border ${bgBorderClass}`} title={`${isOpen ? 'OPEN SHIFT' : String(emp?.name || 'Unknown')} with ${clientNameDisplay}: ${shift.startTime}-${shift.endTime}${punchText ? `\n${punchText}` : ''}`}>
                <div className={`font-semibold truncate ${isOpen ? 'text-amber-700' : ''}`}>{empNameDisplay}</div>
                <div className={`text-[10px] truncate flex items-center mt-0.5 ${isOpen ? 'text-amber-700' : shift.isInternal ? 'text-indigo-700' : 'text-teal-700'}`}>
                  {shift.isInternal ? <Briefcase className="h-2.5 w-2.5 mr-1 shrink-0" /> : <Heart className="h-2.5 w-2.5 mr-1 shrink-0" />}
                  <span className="truncate">{clientNameDisplay}</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-90">{shift.startTime} - {shift.endTime}</div>
                
                {/* INJECT PUNCH TEXT INTO MONTH/WEEK CARDS */}
                {punchText && (
                   <div className="text-[9px] font-bold text-slate-700 bg-white/50 rounded px-1 mt-0.5 border border-slate-200/50 truncate">
                     {punchText}
                   </div>
                )}
                
                {shift.cancelRequest?.pending && (
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                )}

                <div className="absolute right-1 top-1 opacity-0 group-hover/shift:opacity-100 flex space-x-1 bg-white/90 p-0.5 rounded backdrop-blur-sm z-20">
                  <button onClick={(e) => { e.stopPropagation(); setEditingShift(shift); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 transition p-0.5 rounded hover:bg-blue-50" title="Edit Shift"><Edit className="h-3 w-3" /></button>
                  {!isOpen && (<button onClick={(e) => { e.stopPropagation(); onMarkShiftOpen(shift.id); }} className="text-amber-600 hover:text-amber-800 transition p-0.5 rounded hover:bg-amber-50" title="Mark as Open Shift (Sick Call)"><UserMinus className="h-3 w-3" /></button>)}
                  <button onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }} className="text-red-500 hover:text-red-700 transition p-0.5 rounded hover:bg-red-50" title="Delete Shift"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            );
          })}
          
          {hiddenCount > 0 && (
             <div className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-teal-600 mt-1 py-1 bg-slate-100/80 hover:bg-teal-50 rounded transition shadow-inner pointer-events-none">
                +{hiddenCount} more...
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminTab = () => {
    switch (activeAdminTab) {
      case 'desk': 
        return <AdminDesk 
                 clients={safeClients}
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
                 payPeriodStart={payPeriodStart}
                 shifts={shifts}
                 expenses={expenses}
                 clientExpenses={clientExpenses}
                 isBonusActive={isBonusActive}
                 bonusSettings={bonusSettings}
                 kudos={kudos}
                 payrollLogs={payrollLogs}
                 onFinalizePayroll={onFinalizePayroll}
               />;
      case 'employees': return <EmployeeManager employees={safeEmployees} shifts={safeShifts} payPeriodStart={payPeriodStart} onEmployeeFileUpload={onEmployeeFileUpload} onAddEmployee={onAddEmployee} onRemoveEmployee={onRemoveEmployee} updateEmployee={updateEmployee} currentUser={currentUser} />;
      case 'clients': return <ClientManager clients={safeClients} onAddClient={onAddClient} onRemoveClient={onRemoveClient} updateClient={updateClient} shifts={safeShifts} employees={safeEmployees} clientExpenses={clientExpenses} expenses={expenses} onClientFileUpload={onClientFileUpload} />;
      case 'client-funds': return <AdminClientFundsManager clients={safeClients} expenses={expenses} clientExpenses={clientExpenses} employees={safeEmployees} onAddClientExpense={onAddClientExpense} />;      
      case 'expenses': return <ExpenseManager shifts={safeShifts} expenses={expenses} clientExpenses={clientExpenses} employees={safeEmployees} clients={safeClients} onUpdateExpense={onUpdateExpense} onUpdateClientExpense={onUpdateClientExpense} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />;
      case 'earnings': return <AdminEarningsManager employees={safeEmployees} shifts={safeShifts} expenses={expenses} clientExpenses={clientExpenses} clients={safeClients} payPeriodStart={payPeriodStart} isBonusActive={isBonusActive} bonusSettings={bonusSettings} />;
      case 'timeoff': return <TimeOffManager employees={safeEmployees} timeOffLogs={timeOffLogs} onApprove={onApproveTimeOff} onReject={onRejectTimeOff} onRemoveTimeOff={onRemoveTimeOffLog} />;
      case 'paystubs': return <PaystubManager paystubs={paystubs} employees={safeEmployees} onAddPaystub={onAddPaystub} onRemovePaystub={onRemovePaystub} />;
      case 'documents': return <DocumentManager documents={documents} onAddDocument={onAddDocument} onRemoveDocument={onRemoveDocument} isAdmin={true} />; 
      case 'announcements': return <div className="max-w-4xl"><Announcements messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} employees={safeEmployees} onDeleteMessage={onDeleteMessage} onAcknowledgeMessage={onAcknowledgeMessage} announcementPictureUrl={announcementPictureUrl} onUpdateAnnouncementPicture={onUpdateAnnouncementPicture} /></div>;
      case 'rewards': return <AdminRewardsManager employees={safeEmployees} shifts={safeShifts} expenses={expenses} clientExpenses={clientExpenses} kudos={kudos} prizes={prizes} onAddKudos={onAddKudos} onRemoveKudos={onRemoveKudos} onAddPrize={onAddPrize} onRemovePrize={onRemovePrize} isBonusActive={isBonusActive} bonusSettings={bonusSettings} updateEmployee={updateEmployee} />;
      case 'settings': return <SettingsManager payPeriodStart={payPeriodStart} setPayPeriodStart={setPayPeriodStart} isBonusActive={isBonusActive} setIsBonusActive={setIsBonusActive} bonusSettings={bonusSettings} setBonusSettings={setBonusSettings} officeLocation={officeLocation} setOfficeLocation={setOfficeLocation} />;
      case 'schedule':
      default: return (
        <div className="space-y-4">
          
          {pendingCancellations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm mb-4">
              <h3 className="font-bold text-red-800 flex items-center mb-4 text-lg">
                <AlertCircle className="h-6 w-6 mr-2" /> Pending Cancellation Requests ({pendingCancellations.length})
              </h3>
              <div className="space-y-3">
                {pendingCancellations.map(shift => {
                  const emp = safeEmployees.find(e => e.id === shift.employeeId);
                  const client = safeClients.find(c => c.id === shift.clientId);
                  const clientNameDisplay = shift.isInternal ? shift.internalTask : (client?.name || 'Unknown');
                  
                  return (
                    <div key={`cancel_${shift.id}`} className="bg-white rounded-lg p-5 border border-red-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-lg">
                          {emp?.name || 'Unknown'} <span className="text-slate-500 font-medium text-base mx-1">requested to cancel shift with</span> {clientNameDisplay}
                        </div>
                        <div className="text-sm text-slate-600 mt-2 flex items-center font-medium">
                          <CalendarDays className="h-4 w-4 mr-1.5 text-slate-400" /> {parseLocalSafe(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} at {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-sm text-red-800 mt-3 bg-red-100/50 p-3 rounded-md border border-red-100 font-medium">
                          <span className="font-bold text-red-900 uppercase text-xs tracking-wider mr-2">Reason:</span> "{shift.cancelRequest.reason}"
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button onClick={() => onApproveShiftCancelDelete(shift.id)} className="px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-sm">Delete Shift</button>
                        <button onClick={() => onApproveShiftCancelOpen(shift.id)} className="px-4 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm">Mark as Open</button>
                        <button onClick={() => onDenyShiftCancel(shift.id)} className="px-4 py-2.5 text-sm font-bold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition shadow-sm">Deny Request</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {urgentOpenShifts.length > 0 && (
            <div className="bg-red-500 text-white border border-red-600 rounded-xl p-4 shadow-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4">
               <div className="flex items-center">
                 <AlertTriangle className="h-8 w-8 mr-4 shrink-0 text-yellow-300" />
                 <div>
                   <h3 className="font-black text-lg leading-tight tracking-wide">Critical Coverage Warning!</h3>
                   <p className="text-sm text-red-100 font-medium">There are <span className="font-black text-white">{urgentOpenShifts.length} unassigned shifts</span> happening today or tomorrow. Please assign coverage immediately to prevent missed visits.</p>
                 </div>
               </div>
               <button onClick={() => { setActiveAdminTab('schedule'); setScheduleSearch('unassigned'); }} className="w-full sm:w-auto bg-white text-red-700 hover:bg-red-50 px-5 py-2.5 font-black rounded-lg text-sm shadow-sm transition whitespace-nowrap uppercase tracking-wider">
                 View Open Shifts
               </button>
            </div>
          )}

          {showAdminUpdateBanner && adminScheduleUpdates.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-start">
                <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse mr-3 shrink-0 mt-1"></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2">Open Shifts Claimed</h3>
                  <ul className="space-y-1.5">
                    {adminScheduleUpdates.map((msg, i) => (
                      <li key={i} className="text-xs text-slate-700 font-medium bg-white px-3 py-2 rounded border border-emerald-100 shadow-sm flex items-start">
                        <span className="mr-2 mt-0.5">{msg.substring(0,2)}</span>
                        <span>{msg.substring(3)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button onClick={acknowledgeAdminScheduleUpdates} className="w-full sm:w-auto px-4 py-2 text-sm font-bold bg-white text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-100 transition shadow-sm whitespace-nowrap shrink-0">
                Acknowledge & Clear
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <label htmlFor="schedule-search" className="text-sm font-semibold text-slate-700 whitespace-nowrap hidden sm:block">Filter:</label>
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                <input type="text" placeholder="Search schedule..." value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition" />
              </div>
              {scheduleSearch.trim() !== '' && <div className="text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 whitespace-nowrap hidden md:block">Filtered</div>}
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
              <button 
                 onClick={handleClonePreviousWeek} 
                 className="flex items-center space-x-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition text-sm"
                 title="Clone shifts from the previous week to the current view"
              >
                <Copy className="h-4 w-4" /><span className="hidden sm:inline">Copy Prev Week</span>
              </button>
              <button 
                 onClick={() => {
                   const d = currentDate;
                   const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                   setSelectedDateStr(formattedDate);
                   setEditingShift(null); // Ensure "Add" mode
                   setIsModalOpen(true);
                 }} 
                 className="flex items-center space-x-2 bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-teal-700 shadow-sm transition text-sm"
              >
                <Plus className="h-4 w-4" /><span>Add Shift</span>
              </button>
            </div>
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
                  <button onClick={() => setCalendarView('day')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'day' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Timeline (Day)</button>
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

            {/* MONTH VIEW */}
            {calendarView === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                  {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[120px] opacity-50 p-2"></div>))}
                  {monthDaysArray.map(d => renderCalendarCell(d, "min-h-[120px]", false))}
                </div>
              </>
            )}

            {/* WEEK VIEW */}
            {calendarView === 'week' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day} {weekDaysArray[idx].getDate()}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                  {weekDaysArray.map(d => renderCalendarCell(d, "min-h-[300px]", true))}
                </div>
              </>
            )}

            {/* SWIMLANE TIMELINE (DAY VIEW) WITH COLLISION DETECTION */}
            {calendarView === 'day' && (() => {
              const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
              const dayViewShifts = filteredShifts.filter(s => s && s.date === dayStr);
              
              const swimlaneHours = Array.from({length: 24}, (_, i) => i);
              
              const swimlaneEmployees = safeEmployees.filter(e => e.id !== 'admin1' && e.role !== 'Master Admin');
              const renderRows = [{ id: 'unassigned', name: '🚨 OPEN SHIFTS' }, ...swimlaneEmployees];

              return (
                <div className="bg-slate-50 overflow-x-auto">
                   <div className="min-w-[1440px] bg-white relative">
                      
                      {/* Timeline Header (Sticky) */}
                      <div className="flex border-b border-slate-300 bg-slate-100 sticky top-0 z-40">
                         <div className="w-48 shrink-0 bg-slate-200 border-r border-slate-300 p-3 flex items-center justify-center font-bold text-slate-600 uppercase tracking-widest text-xs z-50">
                           Employee Lane
                         </div>
                         <div className="flex-1 flex relative">
                           {swimlaneHours.map(h => (
                             <div key={h} className="flex-1 border-l border-slate-300 text-center py-2 text-[10px] font-black text-slate-500">
                               {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}
                             </div>
                           ))}
                         </div>
                      </div>

                      {/* Employee Rows */}
                      <div className="flex flex-col relative z-10 divide-y divide-slate-200">
                         {renderRows.map(emp => {
                            const empShifts = dayViewShifts.filter(s => s.employeeId === emp.id).sort((a,b) => String(a.startTime).localeCompare(String(b.startTime)));
                            const isUnassignedRow = emp.id === 'unassigned';
                            
                            const levels = [];
                            const positionedShifts = empShifts.map(shift => {
                               const [sH, sM] = String(shift.startTime || '00:00').split(':').map(Number);
                               const [eH, eM] = String(shift.endTime || '00:00').split(':').map(Number);
                               const startVal = sH + (sM / 60);
                               let endVal = eH + (eM / 60);
                               if (endVal <= startVal) endVal += 24; 
                               
                               let level = 0;
                               while (levels[level] !== undefined && levels[level] > startVal) {
                                 level++;
                               }
                               levels[level] = endVal; 
                               
                               const left = (startVal / 24) * 100;
                               const width = ((endVal - startVal) / 24) * 100;
                               
                               return {
                                  ...shift,
                                  style: {
                                     left: `${left}%`,
                                     width: `${width}%`,
                                     top: `${level * 48 + 8}px`,
                                     height: '40px' 
                                  },
                                  level
                               };
                            });
                            
                            const maxLevel = levels.length > 0 ? levels.length - 1 : 0;
                            const rowMinHeight = Math.max(75, (maxLevel + 1) * 48 + 16);
                            
                            return (
                               <div key={emp.id} style={{ minHeight: `${rowMinHeight}px` }} className={`flex relative group ${isUnassignedRow ? 'bg-amber-50/30' : 'bg-white hover:bg-slate-50 transition'}`}>
                                  {/* Left Sticky Column */}
                                  <div className={`w-48 shrink-0 border-r border-slate-300 p-3 flex flex-col justify-center sticky left-0 z-30 ${isUnassignedRow ? 'bg-amber-100 border-b-amber-200' : 'bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]'}`}>
                                     <div className={`font-bold text-sm leading-tight truncate ${isUnassignedRow ? 'text-amber-800' : 'text-slate-800'}`}>{emp.name}</div>
                                     {!isUnassignedRow && <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{emp.role}</div>}
                                  </div>

                                  {/* Right Scrolling Timeline */}
                                  <div className="flex-1 relative">
                                     <div className="absolute inset-0 flex pointer-events-none opacity-40">
                                       {swimlaneHours.map(h => <div key={h} className="flex-1 border-l border-slate-300 h-full"></div>)}
                                     </div>

                                     {positionedShifts.map(shift => {
                                        const client = shift.isInternal ? null : safeClients.find(c => c.id === shift.clientId);
                                        const clientNameDisplay = shift.isInternal ? shift.internalTask : (client?.name || 'Unknown');
                                        const punchText = getPunchText(shift);
                                        
                                        const shiftClass = isUnassignedRow ? 'bg-amber-100 border-amber-400 text-amber-900 ring-amber-500' : 
                                                           shift.cancelRequest?.pending ? 'bg-slate-200 border-slate-400 text-slate-600 ring-slate-500 line-through' : 
                                                           shift.isInternal ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-indigo-500' :
                                                           'bg-teal-100 border-teal-400 text-teal-900 ring-teal-500';
                                                           
                                        return (
                                           <div 
                                              key={shift.id} 
                                              style={shift.style} 
                                              className={`absolute rounded-md p-1 shadow-sm text-[10px] overflow-hidden leading-tight cursor-pointer hover:ring-2 hover:ring-offset-1 hover:z-20 transition-all group/shift border ${shiftClass}`}
                                              title={`${clientNameDisplay} (${shift.startTime} - ${shift.endTime})${punchText ? `\n${punchText}` : ''}`}
                                           >
                                              <div className="font-bold truncate flex items-center">
                                                {shift.isInternal ? <Briefcase className="h-2.5 w-2.5 mr-1 shrink-0"/> : null}
                                                {clientNameDisplay}
                                              </div>
                                              <div className="font-medium opacity-80 truncate">{shift.startTime} - {shift.endTime}</div>
                                              
                                              {/* INJECT PUNCH TEXT DIRECTLY INTO SWIMLANE BLOCK */}
                                              {punchText && <div className="text-[9px] font-bold text-slate-700 bg-white/40 rounded px-1 truncate mt-0.5">{punchText}</div>}

                                              <div className="absolute right-1 top-0 bottom-0 flex items-center space-x-1 bg-white/90 px-1 shadow-sm backdrop-blur-sm opacity-0 group-hover/shift:opacity-100 transition-opacity z-20">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingShift(shift); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50" title="Edit Shift"><Edit className="h-3.5 w-3.5"/></button>
                                                {!isUnassignedRow && <button onClick={(e) => { e.stopPropagation(); onMarkShiftOpen(shift.id); }} className="text-amber-600 hover:text-amber-800 p-0.5 rounded hover:bg-amber-50" title="Mark Open"><UserMinus className="h-3.5 w-3.5"/></button>}
                                                <button onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }} className="text-red-600 hover:text-red-800 p-0.5 rounded hover:bg-red-50" title="Delete"><Trash2 className="h-3.5 w-3.5"/></button>
                                              </div>
                                           </div>
                                        )
                                     })}
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   </div>
                </div>
              );
            })()}
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
    {id: 'announcements', icon: MessageSquare, label: 'Announcements'},
    {id: 'rewards', icon: Award, label: 'Rewards'}
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
            {/* --- ADMIN SCHEDULE TAB DOT --- */}
            {tab.id === 'schedule' && (pendingCancellations.length > 0 || adminScheduleUpdates.length > 0 || urgentOpenShifts.length > 0) && (
              <span className={`absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white animate-pulse ${urgentOpenShifts.length > 0 ? 'bg-red-600' : pendingCancellations.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            )}
          </button>
        ))}
      </div>
      
      {renderAdminTab()}

      {/* --- RENDER ADD/EDIT SHIFT MODAL WITH PASSED HOOKS --- */}
      {isModalOpen && (
        <AddShiftModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingShift(null); }} 
          selectedDate={selectedDateStr} 
          employees={safeEmployees} 
          clients={safeClients} 
          shifts={safeShifts} 
          timeOffLogs={timeOffLogs}
          onSave={onAddShift} 
          onUpdate={onUpdateShift} 
          editingShift={editingShift} 
        />
      )}
    </div>
  );
}
