import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, User, AlertCircle, Camera, Loader2, CheckCircle, Gift, 
  PartyPopper, Briefcase, Award, Trophy, Activity, CalendarDays, Info 
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

// --- NEW EXTRACTED IMPORTS ---
import ScheduleTab from './employee/ScheduleTab';
import TimeOffTab from './employee/TimeOffTab';
import PersonalUploadsTab from './employee/PersonalUploadsTab';

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

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function EmployeeDashboard({ 
  shifts = [], employees = [], currentUser, clients = [], expenses = [], onAddExpense, 
  clientExpenses = [], onAddClientExpense, getClientRemainingBalance, paystubs = [], 
  timeOffLogs = [], messages = [], directMessages = [], documents = [], onSendMessage, onSendDirectMessage, onMarkDirectMessageRead, payPeriodStart, 
  onPickupShift, isBonusActive, bonusSettings, setSelectedClient, onUpdateProfile, 
  onEmployeeFileUpload, onAddTimeOff, onRequestShiftCancel,
  onDeleteMessage, onAcknowledgeMessage, announcementPictureUrl, onUpdateAnnouncementPicture,
  kudos = [], prizes = [], prizeTiers = [], onAddPrize, onAcknowledgeReward, onUpdateShift
}) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleView, setScheduleView] = useState('calendar');
  
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

  // --- DATA DERIVATION ---
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeDirectMessages = Array.isArray(directMessages) ? directMessages : [];
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

  const todayShifts = safeShiftsSort(myShifts.filter(s => s.date === todayStr));
  const punchableShifts = todayShifts.filter(s => s.requirePunchClock);
  const activeShift = punchableShifts.find(s => !s.actualEndTime) || punchableShifts[punchableShifts.length - 1];

  // --- REWARDS LOGIC ---
  const safeKudos = Array.isArray(kudos) ? kudos : [];
  const safePrizes = Array.isArray(prizes) ? prizes : [];

  const unackedKudos = useMemo(() => safeKudos.filter(k => k && k.employeeId === currentUser.id && k.acknowledged === false), [safeKudos, currentUser.id]);
  const unackedPrizes = useMemo(() => safePrizes.filter(p => p && p.employeeId === currentUser.id && p.acknowledged === false), [safePrizes, currentUser.id]);
  const activeReward = unackedKudos[0] ? { ...unackedKudos[0], _type: 'kudo' } : (unackedPrizes[0] ? { ...unackedPrizes[0], _type: 'prize' } : null);
  const hasUnreadRewards = unackedKudos.length > 0 || unackedPrizes.length > 0;

  const unreadDMs = safeDirectMessages.filter(dm => dm.receiverId === currentUser.id && dm.read === false);
  const hasUnreadDMs = unreadDMs.length > 0;

  const handleClaimReward = () => {
    if (activeReward && onAcknowledgeReward) {
      onAcknowledgeReward(activeReward._type === 'kudo' ? 'gn_kudos' : 'gn_prizes', activeReward.id);
    }
  };

  // --- NOTIFICATION PINGS ---
  useEffect(() => {
    if (activeTab === 'announcements') { 
      const newestMessageTime = safeMessages.length > 0 
        ? Math.max(...safeMessages.map(m => new Date(m.date).getTime() || 0)) 
        : Date.now();
        
      localStorage.setItem('gn_feed_last_read', newestMessageTime.toString()); 
      setHasNewFeed(false); 
    } else { 
      const lastRead = Number(localStorage.getItem('gn_feed_last_read') || 0); 
      setHasNewFeed(safeMessages.some(m => new Date(m.date).getTime() > lastRead)); 
    }
  }, [safeMessages, activeTab]);

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

  // --- ACTIONS ---
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

  return (
    <div className="space-y-6">
      
      {/* --- TRAINEE SANDBOX BANNER --- */}
      {currentUser.isTrainee && (
        <div className="bg-indigo-600 rounded-xl shadow-lg border border-indigo-700 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-indigo-50 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center">
             <AlertCircle className="h-6 w-6 mr-3 text-indigo-300 shrink-0" />
             <div>
               <h3 className="font-bold text-white text-sm">Training Sandbox Active</h3>
               <p className="text-xs text-indigo-200 mt-0.5">Your logs, expenses, and time-off requests will automatically simulate approval for practice. No real money or client billing is affected.</p>
             </div>
          </div>
        </div>
      )}

      {/* --- JAZZED UP REWARDS UNBOXING MODAL --- */}
      {activeReward && (() => {
        const isBonus = activeReward._type === 'prize' && (activeReward.name.toLowerCase().includes('bonus') || activeReward.name.toLowerCase().includes('place'));
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            
            <div className={`px-6 py-8 text-center relative overflow-hidden ${isBonus ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950' : activeReward._type === 'kudo' ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950' : 'bg-gradient-to-b from-indigo-500 to-purple-700 text-white'}`}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
                 {isBonus ? <Trophy size={150} /> : activeReward._type === 'kudo' ? <Award size={150} /> : <Gift size={150} />}
               </div>
               <PartyPopper className="h-12 w-12 mx-auto mb-4 relative z-10 animate-bounce" />
               <h2 className="text-3xl font-black relative z-10 tracking-tight">
                 {isBonus ? "Bonus Awarded!" : activeReward._type === 'kudo' ? "You received a Kudo!" : "Congratulations!"}
               </h2>
               <p className="text-sm font-medium mt-2 relative z-10 opacity-90">
                 {activeReward._type === 'kudo' ? "Administration has recognized your hard work." : "Your reward has been delivered to your wallet."}
               </p>
            </div>
            
            <div className="p-8 text-center flex flex-col items-center">
               <div className={`h-28 w-28 rounded-full flex items-center justify-center text-6xl mb-6 shadow-inner border-4 ${isBonus ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : activeReward._type === 'kudo' ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
                 {isBonus ? <Trophy className="h-12 w-12" /> : activeReward._type === 'kudo' ? activeReward.badgeIcon : <Gift className="h-12 w-12" />}
               </div>
               
               <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight">
                 {activeReward._type === 'kudo' ? activeReward.badgeLabel : activeReward.name}
               </h3>
               
               <div className="text-slate-600 italic bg-slate-50 p-5 rounded-xl border border-slate-200 w-full mb-6 relative shadow-inner">
                 <span className="text-3xl text-slate-300 absolute top-2 left-3 font-serif">"</span>
                 <span className="relative z-10 font-medium">{activeReward._type === 'kudo' ? activeReward.message : activeReward.note}</span>
                 <span className="text-3xl text-slate-300 absolute bottom-[-10px] right-3 font-serif">"</span>
               </div>
               
               <div className={`w-full py-3.5 rounded-xl font-black text-lg shadow-sm border ${isBonus ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : activeReward._type === 'kudo' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-indigo-100 text-indigo-800 border-indigo-300'}`}>
                 {isBonus ? `+$${Number(activeReward.value || 0).toFixed(2)} Cash Bonus` : activeReward._type === 'kudo' ? `+${activeReward.points} Gala Points` : `Reward Delivered`}
               </div>
               
               <button 
                 onClick={handleClaimReward} 
                 className={`mt-6 w-full py-4 rounded-xl font-black text-white shadow-lg transition transform hover:-translate-y-1 ${isBonus ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400' : activeReward._type === 'kudo' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}`}
               >
                 {isBonus ? 'Accept Bonus' : activeReward._type === 'kudo' ? 'Claim Points' : 'Unwrap Prize'}
               </button>
            </div>
          </div>
        </div>
        );
      })()}

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

      {/* --- DASHBOARD LAYOUT --- */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* LEFT COLUMN: PROFILE & WIDGETS */}
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
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">{String(currentUser.role)}</span>
                {currentUser.isTrainee && <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm border border-indigo-200">Trainee</span>}
              </div>
              <span className="text-xs font-semibold text-slate-500 mt-1">
                {currentUser.isTrainee ? `Training Wage: $${currentUser.trainingWage || 16.55}/hr` : currentUser.payType === 'salary' ? 'Salaried' : currentUser.payType === 'hourly' ? `$${currentUser.hourlyWage || 22.50}/hr` : `$${currentUser.perVisitRate || 45}/visit`}
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
                          <button onClick={() => { if(onUpdateShift) onUpdateShift(activeShift.id, { actualEndTime: null }); }} className="mt-4 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-xs font-bold rounded shadow transition">
                            Oops! Resume Shift
                          </button>
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
            prizes={prizes}
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

        {/* RIGHT COLUMN: TAB NAVIGATION & CONTENT ROUTING */}
        <div className="md:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            
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
              
              <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Documents
              </button>
              
              <button onClick={() => setActiveTab('paystubs')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'paystubs' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Paystubs
              </button>
              
              {isBonusActive && (
                <button onClick={() => setActiveTab('awards')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'awards' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                  Awards
                  {hasUnreadRewards && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" title="New Reward!"></span>}
                </button>
              )}
              
              <button onClick={() => setActiveTab('announcements')} className={`relative flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                Team Feed {(hasNewFeed || hasUnreadDMs) && <span className="absolute top-2.5 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
              </button>
            </div>

            {/* --- TAB CONTENT ROUTING --- */}
            <div className="p-0">
              
              {activeTab === 'schedule' && (
                <ScheduleTab 
                  myShifts={myShifts}
                  clients={clients}
                  myTimeOffLogs={myTimeOffLogs}
                  payPeriodStart={payPeriodStart}
                  scheduleView={scheduleView}
                  setScheduleView={setScheduleView}
                  upcomingShifts={upcomingShifts}
                  showUpdateBanner={showUpdateBanner}
                  scheduleChanges={scheduleChanges}
                  hasNewShift={hasNewShift}
                  hasChangedShift={hasChangedShift}
                  acknowledgeScheduleUpdates={acknowledgeScheduleUpdates}
                  setSelectedClient={setSelectedClient}
                  initiateCancellation={initiateCancellation}
                />
              )}

              {activeTab === 'timeoff' && (
                <TimeOffTab 
                  currentUser={currentUser}
                  myTimeOffLogs={myTimeOffLogs}
                  onAddTimeOff={onAddTimeOff}
                />
              )}

              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                  <EmployeeMileageLog 
                    myExpenses={myExpenses} 
                    clients={clients} 
                    myShifts={myShifts} 
                    onAddExpense={(exp) => onAddExpense({ ...exp, employeeId: currentUser.id })} 
                    onRemoveExpense={(id) => onAddExpense({ id, _delete: true })} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                  <EmployeeClientExpenseLog 
                    myClientExpenses={myClientExpenses} 
                    clients={clients} 
                    myShifts={myShifts} 
                    onAddClientExpense={(exp, file) => onAddClientExpense({ ...exp, employeeId: currentUser.id }, file)} 
                    onRemoveClientExpense={(id) => onAddClientExpense({ id, _delete: true })} 
                    getClientRemainingBalance={getClientRemainingBalance}
                  />
                </div>
              )}

              {activeTab === 'documents' && (
                <PersonalUploadsTab 
                  documents={documents}
                  myUploads={myUploads}
                  isUploadingDoc={isUploadingDoc}
                  handleDocumentUpload={handleDocumentUpload}
                />
              )}

              {activeTab === 'paystubs' && (
                <EmployeePaystubs myPaystubs={myPaystubs} />
              )}

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
                    prizeTiers={prizeTiers}
                    onAddPrize={onAddPrize}
                    isBonusActive={isBonusActive} 
                    bonusSettings={bonusSettings}
                  />
                </div>
              )}

              {activeTab === 'announcements' && (
                <Announcements 
                  messages={messages} 
                  directMessages={directMessages}
                  onSendMessage={onSendMessage} 
                  onSendDirectMessage={onSendDirectMessage}
                  onMarkDirectMessageRead={onMarkDirectMessageRead}
                  currentUser={currentUser} 
                  employees={employees} 
                  onDeleteMessage={onDeleteMessage} 
                  onAcknowledgeMessage={onAcknowledgeMessage} 
                  announcementPictureUrl={announcementPictureUrl} 
                  onUpdateAnnouncementPicture={onUpdateAnnouncementPicture} 
                />
              )}

              {/* TAB: OPEN SHIFTS */}
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

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
