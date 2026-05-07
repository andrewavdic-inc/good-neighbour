import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight, 
  CalendarDays, Trash2, Heart, Coins, Star, AlertCircle, Phone, FileText, 
  Info, Image as ImageIcon, MapPin, UserMinus, Activity, BookOpen, Camera, 
  Loader2, Upload, Sun, CheckCircle, XCircle, Gift, PartyPopper, Briefcase, Award  
} from 'lucide-react';

// --- SUB-COMPONENT IMPORTS ---
import Announcements from './Announcements';
import DocumentManager from './DocumentManager';
import EmployeeRewardsTab from './EmployeeRewardsTab';
import { 
  EmployeePayTracker, 
  EmployeeMileageLog, 
  EmployeeClientExpenseLog, 
  EmployeePaystubs 
} from './EmployeeFinancialsTab';

// ==========================================
// INLINE HELPERS
// ==========================================
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
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) { 
    return new Date(); 
  }
};

const safeShiftsSort = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...arr].filter(Boolean).sort((a, b) => {
    const dA = a.date && a.startTime ? new Date(`${a.date}T${a.startTime}`).getTime() : 0;
    const dB = b.date && b.startTime ? new Date(`${b.date}T${b.startTime}`).getTime() : 0;
    return (isNaN(dA) ? 0 : dA) - (isNaN(dB) ? 0 : dB);
  });
};

const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = String(startDateStr).split('-').map(Number);
  const [cY, cM, cD] = String(currentDateStr).split('-').map(Number);
  if(isNaN(sY) || isNaN(cY)) return false; 
  const diffDays = (Date.UTC(cY, cM - 1, cD) - Date.UTC(sY, sM - 1, sD)) / 86400000;
  return diffDays > 0 && diffDays % 14 === 0;
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

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function EmployeeDashboard({ 
  shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, 
  clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], 
  timeOffLogs = [], messages = [], documents = [], onSendMessage, payPeriodStart, 
  onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile, 
  onEmployeeFileUpload, onAddTimeOff, onRequestShiftCancel,
  onDeleteMessage, onAcknowledgeMessage, announcementPictureUrl, onUpdateAnnouncementPicture,
  kudos = [], prizes = [], onAcknowledgeReward, onUpdateShift
}) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Notification & Upload States
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [scheduleChanges, setScheduleChanges] = useState([]); 
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  
  // Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelShiftId, setCancelShiftId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [agendaDateStr, setAgendaDateStr] = useState('');

  // Time Off State
  const [toStartDate, setToStartDate] = useState(''); 
  const [toEndDate, setToEndDate] = useState(''); 
  const [toType, setToType] = useState('sick'); 
  const [toNote, setToNote] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  
  const liveEmployee = employees.find(e => e && e.id === currentUser.id) || currentUser;
  const myUploads = liveEmployee.uploadedFiles || [];
  const myShifts = safeShifts.filter(s => s && s.employeeId === currentUser.id);
  const openShifts = safeShifts.filter(s => s && s.employeeId === 'unassigned');
  const myExpenses = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myClientExpenses = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id);
  const myPaystubs = (Array.isArray(paystubs) ? paystubs : []).filter(p => p && p.employeeId === currentUser.id);
  const myTimeOffLogs = safeTimeOffLogs.filter(l => l && l.employeeId === currentUser.id);
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const upcomingShifts = safeShiftsSort(myShifts.filter(s => s && s.date && s.endTime && new Date(`${s.date}T${s.endTime}`) > now));
  const nextShift = upcomingShifts[0];

  // --- TIMECLOCK LOGIC ---
  const todayShifts = safeShiftsSort(myShifts.filter(s => s.date === todayStr));
  const activeShift = todayShifts.find(s => !s.actualEndTime) || todayShifts[todayShifts.length - 1];

  // --- REWARDS UNBOXING LOGIC ---
  const unackedKudos = useMemo(() => kudos.filter(k => k.employeeId === currentUser.id && k.acknowledged === false), [kudos, currentUser.id]);
  const unackedPrizes = useMemo(() => prizes.filter(p => p.employeeId === currentUser.id && p.acknowledged === false), [prizes, currentUser.id]);
  const activeReward = unackedKudos[0] ? { ...unackedKudos[0], _type: 'kudo' } : (unackedPrizes[0] ? { ...unackedPrizes[0], _type: 'prize' } : null);
  const hasUnreadRewards = unackedKudos.length > 0 || unackedPrizes.length > 0;

  const handleClaimReward = () => {
    if (activeReward && onAcknowledgeReward) {
      onAcknowledgeReward(activeReward._type === 'kudo' ? 'gn_kudos' : 'gn_prizes', activeReward.id);
    }
  };

  // --- PUNCH BADGE RENDERER ---
  const renderPunchBadge = (shift) => {
    if (!shift.actualStartTime || !shift.actualEndTime) return null;
    const start = new Date(shift.actualStartTime);
    const end = new Date(shift.actualEndTime);
    const diffMs = end - start;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    
    return (
      <div className="mt-1.5 inline-flex items-center bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider shadow-sm">
        ⏱️ Punch: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({hrs}h {mins}m)
      </div>
    );
  };

  // --- Feed Ping Logic ---
  useEffect(() => {
    if (activeTab === 'announcements') { 
      localStorage.setItem('gn_feed_last_read', Date.now().toString()); 
      setHasNewFeed(false); 
    } else { 
      const lastRead = Number(localStorage.getItem('gn_feed_last_read') || 0); 
      setHasNewFeed(safeMessages.some(m => new Date(m.date).getTime() > lastRead)); 
    }
  }, [safeMessages, activeTab]);

  // --- Smart Ping Logic ---
  useEffect(() => {
    const saved = localStorage.getItem(`gn_shift_snapshot_${currentUser.id}`);
    if (saved) {
      const snapshot = JSON.parse(saved);
      const changes = [];
      
      snapshot.forEach(snapShift => {
        const stillExists = myShifts.find(s => s.id === snapShift.id);
        if (!stillExists) {
          const clientName = snapShift.isInternal ? snapShift.internalTask : safeClients.find(c => c.id === snapShift.clientId)?.name;
          const dateStr = parseLocalSafe(snapShift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          changes.push(`🚨 REMOVED: Shift for ${clientName || 'Unknown'} on ${dateStr} from ${snapShift.startTime} to ${snapShift.endTime}`);
        }
      });

      myShifts.forEach(shift => {
        const found = snapshot.find(s => s.id === shift.id);
        const clientName = shift.isInternal ? shift.internalTask : safeClients.find(c => c.id === shift.clientId)?.name;
        const dateStr = parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!found) {
          changes.push(`🟢 ADDED: Shift for ${clientName || 'Unknown'} on ${dateStr} from ${shift.startTime} to ${shift.endTime}`);
        } else if (found.date !== shift.date || found.startTime !== shift.startTime || found.endTime !== shift.endTime) {
          changes.push(`🟡 CHANGED: Shift for ${clientName || 'Unknown'} moved to ${dateStr} from ${shift.startTime} to ${shift.endTime}`);
        }
      });

      if (changes.length > 0) {
        setScheduleChanges(changes);
        setShowUpdateBanner(true);
      }
    } else {
      const snapshot = myShifts.map(s => ({ id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, clientId: s.clientId, isInternal: s.isInternal, internalTask: s.internalTask }));
      localStorage.setItem(`gn_shift_snapshot_${currentUser.id}`, JSON.stringify(snapshot));
    }
  }, [myShifts, currentUser.id, safeClients]);

  const acknowledgeScheduleUpdates = () => {
    setScheduleChanges([]);
    setShowUpdateBanner(false);
    const snapshot = myShifts.map(s => ({ id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, clientId: s.clientId, isInternal: s.isInternal, internalTask: s.internalTask }));
    localStorage.setItem(`gn_shift_snapshot_${currentUser.id}`, JSON.stringify(snapshot));
  };

  const hasNewShift = scheduleChanges.some(msg => msg.includes('🟢 ADDED'));
  const hasChangedShift = scheduleChanges.some(msg => msg.includes('🟡 CHANGED') || msg.includes('🚨 REMOVED'));

  // --- TIME OFF BALANCE CALCULATIONS ---
  const currentYear = new Date().getFullYear();
  const currentYearLogs = myTimeOffLogs.filter(l => l.startDate && parseLocalSafe(l.startDate).getFullYear() === currentYear);
  
  let usedSick = 0; let usedVacation = 0;
  let pendingSick = 0; let pendingVacation = 0;

  currentYearLogs.forEach(log => {
    const start = parseLocalSafe(log.startDate);
    const end = parseLocalSafe(log.endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (log.status === 'approved') {
      if (log.type === 'sick') usedSick += diffDays;
      if (log.type === 'vacation') usedVacation += diffDays;
    } else if (log.status === 'pending') {
      if (log.type === 'sick') pendingSick += diffDays;
      if (log.type === 'vacation') pendingVacation += diffDays;
    }
  });

  const allowedSick = currentUser.timeOffBalances?.sick || 0;
  const allowedVacation = currentUser.timeOffBalances?.vacation || 0;
  const remainingSick = allowedSick - usedSick - pendingSick;
  const remainingVacation = allowedVacation - usedVacation - pendingVacation;

  const calculateRequestedDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = parseLocalSafe(startStr);
    const end = parseLocalSafe(endStr);
    if (end < start) return 0;
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleTimeOffSubmit = (e) => { 
    e.preventDefault(); 
    const requestedDays = calculateRequestedDays(toStartDate, toEndDate);
    
    if (requestedDays <= 0) {
      alert('End date must be the same or after the start date.');
      return;
    }
    if (toType === 'sick' && requestedDays > remainingSick) {
      alert(`You only have ${remainingSick} sick days remaining. You cannot request ${requestedDays}.`);
      return;
    }
    if (toType === 'vacation' && requestedDays > remainingVacation) {
      alert(`You only have ${remainingVacation} vacation days remaining. You cannot request ${requestedDays}.`);
      return;
    }

    if (onAddTimeOff) {
      onAddTimeOff({ id: `to_${Date.now()}`, employeeId: currentUser.id, startDate: toStartDate, endDate: toEndDate, type: toType, note: toNote }); 
    }
    setToStartDate(''); setToEndDate(''); setToNote(''); 
  };

  // --- FORMAL CANCELLATION REQUEST LOGIC ---
  const initiateCancellation = (shiftId) => {
    setCancelShiftId(shiftId);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const submitCancellation = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    if (onRequestShiftCancel && cancelShiftId) {
      onRequestShiftCancel(cancelShiftId, cancelReason);
    }
    setIsCancelModalOpen(false);
    setCancelShiftId(null);
    setCancelReason('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onUpdateProfile) {
      setIsUploadingPhoto(true);
      await onUpdateProfile(currentUser.id, {}, file);
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onEmployeeFileUpload) {
      setIsUploadingDoc(true);
      await onEmployeeFileUpload(currentUser.id, file);
      setIsUploadingDoc(false);
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setAgendaDateStr(dateStr);
    setIsDayAgendaOpen(true);
  };

  const renderSchedule = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
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
          {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>))}
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
            const holiday = getHoliday(dateStr);
            const isToday = dateStr === todayStr;
            const dayShifts = myShifts.filter(s => s && s.date === dateStr).sort((a,b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
            
            const cellTime = new Date(year, month, day).getTime();
            const dayTimeOff = myTimeOffLogs.filter(log => {
              if (log.status !== 'approved') return false;
              if (!log.startDate || !log.endDate) return false;
              
              const start = parseLocalSafe(log.startDate);
              const end = parseLocalSafe(log.endDate);
              const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
              const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
              return cellTime >= sTime && cellTime <= eTime;
            });
            
            // Capping Logic for Month View
            const maxShifts = 3;
            const visibleShifts = dayShifts.slice(0, maxShifts);
            const hiddenCount = dayShifts.length - maxShifts;

            return (
              <div key={day} onClick={() => handleDayClick(day)} className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative cursor-pointer ${holiday ? 'bg-purple-50/50' : ''} ${isToday ? 'border-2 border-teal-500 shadow-sm z-10' : ''}`}>
                <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                  <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : isToday ? 'text-teal-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                  <div className="flex flex-col items-end gap-1">
                    {isToday && (<span className="text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded shadow-sm">TODAY</span>)}
                    {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {String(holiday.name).toUpperCase()}</span>)}
                    {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday"><Coins className="h-2.5 w-2.5 mr-0.5" /> PAYDAY</span>)}
                  </div>
                </div>

                <div className="space-y-1">
                  {dayTimeOff.map(log => {
                    const isSick = log.type === 'sick';
                    const isVacation = log.type === 'vacation';
                    return (
                      <div key={`to_${log.id}`} className={`text-xs p-1.5 rounded relative border shadow-sm mb-1 ${isSick ? 'bg-red-50 text-red-800 border-red-200' : isVacation ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-800 border-slate-200'}`} title={`${isSick ? 'Sick Leave' : isVacation ? 'Vacation' : 'Unpaid Time Off'}`}>
                        <div className="font-semibold truncate flex items-center">
                          {isSick ? <Activity className="h-3 w-3 mr-1" /> : isVacation ? <Sun className="h-3 w-3 mr-1" /> : <CalendarDays className="h-3 w-3 mr-1" />}
                          {isSick ? 'Sick Day' : isVacation ? 'Vacation' : 'Unpaid Leave'}
                        </div>
                      </div>
                    );
                  })}

                  {visibleShifts.map(shift => {
                    const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                    const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : String(client?.name || 'Unknown Client').split(' ')[0];
                    
                    const bgBorderClass = shift.cancelRequest?.pending ? 'bg-slate-200 text-slate-500 border border-slate-300' : 
                                          shift.isInternal ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 group-hover:bg-indigo-100' : 
                                          'bg-teal-100 text-teal-800 border border-teal-200 group-hover:bg-teal-200';

                    return (
                      <div key={shift.id} className={`text-xs p-1.5 rounded transition shadow-sm ${bgBorderClass}`}>
                        <div className="font-semibold truncate flex items-center">
                          {shift.isInternal ? (
                            <Briefcase className={`h-2.5 w-2.5 mr-1 shrink-0 ${shift.cancelRequest?.pending ? 'text-slate-400' : 'text-indigo-600'}`} />
                          ) : (
                            <Heart className={`h-2.5 w-2.5 mr-1 shrink-0 ${shift.cancelRequest?.pending ? 'text-slate-400' : 'text-teal-600'}`} />
                          )}
                          {clientNameDisplay}
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-90 flex items-center">
                          <Clock className="h-2.5 w-2.5 mr-1 shrink-0" />
                          {shift.startTime}-{shift.endTime}
                        </div>
                        {shift.cancelRequest?.pending && (
                          <div className="mt-1 text-[9px] font-bold text-red-600 uppercase tracking-wider text-center">Pending Cancel</div>
                        )}
                      </div>
                    );
                  })}

                  {/* THE +X MORE BUTTON FOR MONTH VIEW */}
                  {hiddenCount > 0 && (
                     <div className="w-full text-center text-[10px] font-bold text-slate-500 group-hover:text-teal-600 mt-1 py-1 bg-slate-100/80 group-hover:bg-teal-50 rounded transition shadow-inner">
                        +{hiddenCount} more...
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* REWARDS UNBOXING MODAL */}
      {activeReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            <div className={`px-6 py-8 text-center relative overflow-hidden ${activeReward._type === 'kudo' ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950' : 'bg-gradient-to-b from-purple-500 to-purple-700 text-white'}`}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
                 {activeReward._type === 'kudo' ? <Award size={150} /> : <Gift size={150} />}
               </div>
               <PartyPopper className="h-12 w-12 mx-auto mb-4 relative z-10 animate-bounce" />
               <h2 className="text-2xl font-black relative z-10">You've been recognized!</h2>
               <p className="text-sm font-medium mt-1 relative z-10 opacity-90">Administration has sent you a new reward.</p>
            </div>
            
            <div className="p-8 text-center flex flex-col items-center">
               <div className={`h-24 w-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-inner border-4 ${activeReward._type === 'kudo' ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                 {activeReward._type === 'kudo' ? activeReward.badgeIcon : <Gift className="h-10 w-10" />}
               </div>
               
               <h3 className="text-xl font-bold text-slate-800 mb-2">
                 {activeReward._type === 'kudo' ? activeReward.badgeLabel : activeReward.name}
               </h3>
               
               <div className="text-slate-600 italic bg-slate-50 p-4 rounded-lg border border-slate-100 w-full mb-6 relative">
                 <span className="text-2xl text-slate-300 absolute top-2 left-2">"</span>
                 {activeReward._type === 'kudo' ? activeReward.message : activeReward.note}
                 <span className="text-2xl text-slate-300 absolute bottom-0 right-2">"</span>
               </div>
               
               <div className={`w-full py-3 rounded-xl font-black text-lg shadow-sm border ${activeReward._type === 'kudo' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                 {activeReward._type === 'kudo' ? `+${activeReward.points} Gala Points` : `+50 Gala Points`}
               </div>
               
               <button 
                 onClick={handleClaimReward} 
                 className={`mt-6 w-full py-3.5 rounded-lg font-bold text-white shadow-md transition transform hover:scale-105 ${activeReward._type === 'kudo' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}
               >
                 Claim Reward
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION REASON MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-red-50 text-red-800 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Request Shift Cancellation</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="hover:text-red-600 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={submitCancellation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  rows="4" 
                  placeholder="e.g. Client requested a different day, sick leave, etc." 
                  required 
                />
                <p className="text-xs text-slate-500 mt-2">This request will be sent to Administration. You remain responsible for this shift until the request is approved.</p>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Back</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition shadow-sm">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY AGENDA MODAL (EMPLOYEE DAY VIEW) */}
      {isDayAgendaOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-teal-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-200"/> Daily Agenda: {parseLocalSafe(agendaDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button onClick={() => setIsDayAgendaOpen(false)} className="hover:text-teal-200 transition text-2xl leading-none">&times;</button>
            </div>
            <div className="p-0 bg-slate-50 flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {myShifts.filter(s => s.date === agendaDateStr).length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No shifts scheduled for this day.</div>
                ) : (
                  myShifts.filter(s => s.date === agendaDateStr).sort((a,b) => String(a.startTime).localeCompare(String(b.startTime))).map(shift => {
                    const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                    const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : (client?.name || 'Unknown Client');

                    return (
                      <div key={shift.id} className="p-4 hover:bg-slate-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                        <div className="flex items-start space-x-4">
                          <div className={`bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px] ${shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}`}>
                            <div className="text-xs font-bold text-teal-600 uppercase">{parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="text-xl font-extrabold text-teal-800">{parseLocalSafe(shift.date).getDate()}</div>
                          </div>
                          <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                            <h4 className="font-bold text-slate-800 flex items-center">
                              {shift.isInternal && <Briefcase className="h-4 w-4 mr-1.5 text-indigo-600"/>}
                              {clientNameDisplay}
                            </h4>
                            <div className="text-sm text-slate-600 flex items-center mt-1">
                              <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                            </div>
                            {/* --- PUNCH BADGE --- */}
                            {renderPunchBadge(shift)}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 w-full sm:w-auto">
                          {!shift.isInternal && (
                            <button onClick={() => { setSelectedClient(client); setIsDayAgendaOpen(false); }} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                              Care Plan
                            </button>
                          )}
                          
                          {/* CANCELLATION BUTTON LOGIC */}
                          {shift.cancelRequest?.pending ? (
                            <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded cursor-not-allowed text-center w-full sm:w-auto border border-slate-200">
                              Cancellation Pending
                            </button>
                          ) : (
                            <button onClick={() => { initiateCancellation(shift.id); setIsDayAgendaOpen(false); }} className="text-xs font-medium text-slate-500 hover:text-red-500 hover:underline text-center w-full sm:w-auto">
                              Request Cancellation
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
              <button onClick={() => setIsDayAgendaOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition shadow-sm">Close Agenda</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="h-24 w-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-4 border-teal-50 shadow-sm overflow-hidden relative">
                {isUploadingPhoto ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : liveEmployee.photoUrl && !liveEmployee.photoUrl.includes('dicebear') ? (
                  <img src={liveEmployee.photoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              <label htmlFor="profile-upload" className={`absolute bottom-0 right-0 bg-teal-600 p-1.5 rounded-full text-white shadow-md transition ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-teal-700 opacity-80 group-hover:opacity-100'}`}>
                <Camera className="h-4 w-4" />
                <input disabled={isUploadingPhoto} id="profile-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
              </label>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">{String(currentUser.name)}</h2>
            <div className="flex flex-col mt-2 gap-1 items-center">
              <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
              <span className="text-xs font-semibold text-slate-500">
                {currentUser.payType === 'salary' ? 'Salaried' : currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}
              </span>
            </div>
          </div>

          {/* --- LIVE TIMECLOCK WIDGET --- */}
          {activeShift && (
             <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden text-white p-6 relative">
                <div className="absolute -right-4 -bottom-4 opacity-10"><Clock size={120} /></div>
                <div className="relative z-10">
                   <h3 className="font-bold text-teal-400 flex items-center mb-1">
                     <Activity className="h-5 w-5 mr-2" /> Live Timeclock
                   </h3>
                   <p className="text-xs text-slate-400 mb-4 flex items-center flex-wrap gap-2">
                     {activeShift.isInternal && <Briefcase className="h-3 w-3 inline shrink-0" />}
                     {activeShift.isInternal ? activeShift.internalTask : clients.find(c => c.id === activeShift.clientId)?.name} &bull; {activeShift.startTime} - {activeShift.endTime}
                     {activeShift.isHourlyOverride && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/50 inline-block">Hourly Shift</span>}
                   </p>
                   
                   {activeShift.actualEndTime ? (
                       <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 p-4 rounded-lg text-center shadow-inner">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                          <div className="font-bold">Shift Completed</div>
                          <div className="text-xs mt-1 text-emerald-100">Clocked out at {new Date(activeShift.actualEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                       </div>
                   ) : activeShift.actualStartTime ? (
                       <div className="text-center">
                          <div className="text-sm text-amber-300 font-bold mb-2 animate-pulse">Currently Clocked In</div>
                          <div className="text-4xl font-black text-white mb-4 tracking-tight shadow-sm">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <button onClick={() => { if(onUpdateShift) onUpdateShift(activeShift.id, { actualEndTime: new Date().toISOString() }); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-lg shadow-md transition text-lg tracking-wider">
                            CLOCK OUT
                          </button>
                       </div>
                   ) : (
                       <div className="text-center pt-2">
                          <div className="text-sm text-slate-300 font-medium mb-3">Ready to start your visit?</div>
                          <button onClick={() => { if(onUpdateShift) onUpdateShift(activeShift.id, { actualStartTime: new Date().toISOString() }); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-black py-3.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition text-lg flex items-center justify-center tracking-wider">
                            <Clock className="h-5 w-5 mr-2" /> CLOCK IN NOW
                          </button>
                       </div>
                   )}
                </div>
             </div>
          )}

          <EmployeePayTracker 
            currentUser={currentUser} 
            shifts={shifts} 
            expenses={expenses} 
            clientExpenses={clientExpenses} 
            payPeriodStart={payPeriodStart} 
            isBonusActive={isBonusActive} 
            employees={employees} 
            bonusSettings={bonusSettings} 
            kudos={kudos}
          />
          
          {nextShift && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-teal-600" />
                <h2 className="text-lg font-semibold text-slate-800">Next Shift</h2>
              </div>
              <div className="p-6 space-y-4 text-slate-700">
                <div className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-3 text-slate-400" />
                  <span className="font-medium">{parseLocalSafe(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-slate-400" />
                  <span className="font-medium">
                    {nextShift.startTime} - {nextShift.endTime} &bull; {nextShift.isInternal ? nextShift.internalTask : clients.find(c => c && c.id === nextShift.clientId)?.name}
                  </span>
                </div>
                {!nextShift.isInternal && (
                  <button onClick={() => setSelectedClient(clients.find(c => c && c.id === nextShift.clientId))} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded transition text-sm flex items-center justify-center">
                    <Info className="h-4 w-4 mr-2" /> View Client Plan
                  </button>
                )}
              </div>
            </div>
          )}

          {openShifts.length > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-center text-amber-800 font-bold mb-2">
                <AlertCircle className="h-5 w-5 mr-2" /> Open Shifts Available!
              </div>
              <p className="text-sm text-amber-700 mb-3">There are {openShifts.length} shift(s) that need coverage.</p>
              <button onClick={() => setActiveTab('open-shifts')} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded transition text-sm">
                View Open Shifts
              </button>
            </div>
          )}
        </div>

        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* TABS NAVIGATION */}
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveTab('schedule')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                My Schedule 
                {hasNewShift && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="New Shift Added"></span>}
                {!hasNewShift && hasChangedShift && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" title="Schedule Changed"></span>}
              </button>
              <button onClick={() => setActiveTab('timeoff')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'timeoff' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Time Off
              </button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Logs & Expenses
              </button>
              {isBonusActive && (
                <button onClick={() => setActiveTab('awards')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'awards' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                  Awards
                  {hasUnreadRewards && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" title="New Reward!"></span>}
                </button>
              )}
              <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Documents
              </button>
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Paystubs
              </button>
              <button onClick={() => setActiveTab('announcements')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Team Feed {hasNewFeed && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
              </button>
            </div>

            <div className="p-0">
              
              {/* TAB 1: TIME OFF */}
              {activeTab === 'timeoff' && (
                <div className="p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center">
                      <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4"><Activity className="h-6 w-6"/></div>
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sick Days Remaining</div>
                        <div className="text-2xl font-black text-slate-800">{remainingSick} <span className="text-sm font-medium text-slate-400">/ {allowedSick}</span></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4"><Sun className="h-6 w-6"/></div>
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vacation Days Remaining</div>
                        <div className="text-2xl font-black text-slate-800">{remainingVacation} <span className="text-sm font-medium text-slate-400">/ {allowedVacation}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                      <CalendarDays className="h-5 w-5 mr-2 text-teal-600"/> Request Time Off
                    </h3>
                    <form onSubmit={handleTimeOffSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                          <input type="date" value={toStartDate} onChange={(e) => setToStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                          <input type="date" value={toEndDate} onChange={(e) => setToEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
                          <select value={toType} onChange={(e) => setToType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-semibold text-slate-700" required>
                            <option value="sick">Sick Leave</option>
                            <option value="vacation">Paid Vacation</option>
                            <option value="unpaid">Unpaid Leave</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Note to Admin</label>
                          <input type="text" value={toNote} onChange={(e) => setToNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="Optional context" />
                        </div>
                      </div>
                      <button type="submit" className="w-full mt-2 bg-teal-600 text-white font-semibold py-2.5 rounded-md hover:bg-teal-700 transition flex items-center justify-center">
                        <Plus className="h-4 w-4 mr-2"/> Submit Request for Approval
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center"><Clock className="h-5 w-5 mr-2 text-teal-600"/> My Time Off History</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {myTimeOffLogs.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">No time off requests found.</div>
                      ) : (
                        myTimeOffLogs.sort((a,b) => new Date(b.dateSubmitted || 0) - new Date(a.dateSubmitted || 0)).map(req => {
                          const isSick = req.type === 'sick';
                          const start = parseLocalSafe(req.startDate);
                          const end = parseLocalSafe(req.endDate);
                          
                          return (
                            <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition gap-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full shrink-0 ${isSick ? 'bg-red-100 text-red-600' : req.type === 'vacation' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                  {isSick ? <Activity className="h-4 w-4" /> : req.type === 'vacation' ? <Sun className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">
                                    {start.toLocaleDateString()} <span className="text-slate-400 font-normal mx-1">to</span> {end.toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {req.type === 'sick' ? 'Sick Leave' : req.type === 'vacation' ? 'Vacation' : 'Unpaid Leave'}
                                    {req.note && <span className="italic ml-2">"{req.note}"</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center sm:justify-end">
                                {req.status === 'approved' ? (
                                  <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approved</span>
                                ) : req.status === 'rejected' ? (
                                  <span className="flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full"><XCircle className="h-3.5 w-3.5 mr-1" /> Denied</span>
                                ) : req.status === 'cancelled' ? (
                                  <span className="flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full"><Trash2 className="h-3.5 w-3.5 mr-1" /> Cancelled</span>
                                ) : (
                                  <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Clock className="h-3.5 w-3.5 mr-1" /> Pending</span>
                                )}
                              </div>                            
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SCHEDULE */}
              {activeTab === 'schedule' && (
                <div className="flex flex-col">
                  
                  {/* --- DETAILED EXPLICIT ACKNOWLEDGEMENT BANNER --- */}
                  {showUpdateBanner && scheduleChanges.length > 0 && (
                    <div className="mx-6 mt-6 mb-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex items-start">
                          <div className={`h-2.5 w-2.5 rounded-full animate-pulse mr-3 shrink-0 mt-1 ${hasNewShift ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-2">Unread Schedule Updates</h3>
                            <ul className="space-y-1.5">
                              {scheduleChanges.map((msg, i) => (
                                <li key={i} className="text-xs text-slate-700 font-medium bg-white px-3 py-2 rounded border border-emerald-100 shadow-sm flex items-start">
                                  <span className="mr-2 mt-0.5">{msg.substring(0,2)}</span>
                                  <span>{msg.substring(3)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <button onClick={acknowledgeScheduleUpdates} className="w-full sm:w-auto px-4 py-2 text-sm font-bold bg-white text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-100 transition shadow-sm whitespace-nowrap shrink-0">
                          Acknowledge & Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-end">
                    <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
                      <button onClick={() => setScheduleView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>List View</button>
                      <button onClick={() => setScheduleView('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Calendar</button>
                    </div>
                  </div>
                  
                  {scheduleView === 'list' ? (
                    <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden m-6">
                      {upcomingShifts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">You have no upcoming shifts.</div>
                      ) : (
                        upcomingShifts.map(shift => {
                          const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                          const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : (client?.name || 'Unknown Client');
                          const d = parseLocalSafe(shift.date);
                          const isInvalid = isNaN(d.getTime());
                          return (
                            <div key={shift.id || Math.random()} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start space-x-4">
                                <div className={`bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px] ${shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}`}>
                                  <div className="text-xs font-bold text-teal-600 uppercase">{!isInvalid ? d.toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                                  <div className="text-xl font-extrabold text-teal-800">{!isInvalid ? d.getDate() : ''}</div>
                                </div>
                                <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                                  <h4 className="font-bold text-slate-800 flex items-center">
                                    {shift.isInternal && <Briefcase className="h-4 w-4 mr-1.5 text-indigo-600" />}
                                    {clientNameDisplay}
                                  </h4>
                                  <div className="text-sm text-slate-600 flex items-center mt-1">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                                  </div>
                                  {/* --- PUNCH BADGE --- */}
                                  {renderPunchBadge(shift)}
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2 w-full sm:w-auto">
                                {!shift.isInternal && (
                                  <button onClick={() => setSelectedClient(client)} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                                    Care Plan
                                  </button>
                                )}
                                
                                {/* CANCELLATION BUTTON LOGIC */}
                                {shift.cancelRequest?.pending ? (
                                  <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded cursor-not-allowed text-center w-full sm:w-auto border border-slate-200">
                                    Cancellation Pending
                                  </button>
                                ) : (
                                  <button onClick={() => initiateCancellation(shift.id)} className="text-xs font-medium text-slate-500 hover:text-red-500 hover:underline text-center w-full sm:w-auto">
                                    Request Cancellation
                                  </button>
                                )}

                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    renderSchedule()
                  )}
                </div>
              )}

              {/* TAB 3: OPEN SHIFTS */}
              {activeTab === 'open-shifts' && (
                <div className="bg-amber-50/30 p-4">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Shifts Needing Coverage</h3>
                  <div className="space-y-3">
                    {openShifts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No open shifts at this time.</p>
                    ) : (
                      openShifts.map(shift => {
                        const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                        const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : (client?.name || 'Unknown Client');

                        return (
                          <div key={shift.id || Math.random()} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <div className="font-bold text-slate-800">{shift.date ? parseLocalSafe(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}</div>
                              <div className="text-sm text-slate-600 mt-1 flex items-center">
                                {shift.startTime} - {shift.endTime} &bull; 
                                {shift.isInternal && <Briefcase className="h-3 w-3 mx-1 text-indigo-500"/>} 
                                {!shift.isInternal && <span className="mx-1"></span>}
                                {clientNameDisplay}
                              </div>
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

              {/* TAB 4: EXPENSES (REFACTORED COMPONENTS) */}
              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                  <EmployeeMileageLog 
                    myExpenses={myExpenses} 
                    clients={clients} 
                    onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                  <EmployeeClientExpenseLog 
                    myClientExpenses={myClientExpenses} 
                    clients={clients} 
                    onAddClientExpense={(exp, file) => onAddClientExpense({ ...exp, employeeId: currentUser.id }, file)} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                </div>
              )}

              {/* TAB 5: AWARDS (REFACTORED COMPONENT) */}
              {activeTab === 'awards' && isBonusActive && (
                <div className="p-6">
                  <EmployeeRewardsTab 
                    currentUser={currentUser}
                    employees={employees} 
                    shifts={shifts} 
                    expenses={expenses} 
                    clientExpenses={clientExpenses} 
                    kudos={kudos}
                    prizes={prizes}
                    isBonusActive={isBonusActive} 
                    bonusSettings={bonusSettings}
                  />
                </div>
              )}

              {/* TAB 6: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="p-6 space-y-6">
                  <DocumentManager documents={documents} isAdmin={false} />
                  
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" /> My Personal Uploads</h2>
                    </div>
                    <div className="p-6">
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Securely send a document to the Administrator</label>
                        <div className="flex items-center justify-center w-full">
                          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {isUploadingDoc ? <Loader2 className="w-8 h-8 mb-3 text-teal-600 animate-spin" /> : <Upload className="w-8 h-8 mb-3 text-slate-400" />}
                              <p className="mb-2 text-sm text-slate-500">{isUploadingDoc ? <span className="font-semibold text-teal-600">Uploading securely...</span> : <><span className="font-semibold text-teal-600">Click to upload</span> or drag and drop</>}</p>
                              <p className="text-xs text-slate-500">PDF, JPG, or PNG</p>
                            </div>
                            <input type="file" className="hidden" disabled={isUploadingDoc} onChange={handleDocumentUpload} />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {myUploads.length === 0 ? (
                          <div className="text-center py-4 text-sm text-slate-500">You haven't uploaded any personal files yet.</div>
                        ) : (
                          myUploads.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-teal-50 transition border border-slate-200 rounded-md">
                              <div className="flex items-center overflow-hidden pr-4">
                                <FileText className="h-6 w-6 mr-3 text-teal-600 shrink-0" />
                                <div className="truncate">
                                  <div className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{new Date(file.date).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded transition text-xs font-semibold shadow-sm shrink-0">View</a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7 & 8: PAYSTUBS AND ANNOUNCEMENTS */}
              {activeTab === 'paystubs' && <EmployeePaystubs myPaystubs={myPaystubs} />}
              {activeTab === 'announcements' && (
                <Announcements 
                  messages={messages} 
                  onSendMessage={onSendMessage} 
                  currentUser={currentUser} 
                  employees={employees} 
                  onDeleteMessage={onDeleteMessage} 
                  onAcknowledgeMessage={onAcknowledgeMessage} 
                  announcementPictureUrl={announcementPictureUrl} 
                  onUpdateAnnouncementPicture={onUpdateAnnouncementPicture} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
