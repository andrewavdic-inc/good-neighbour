import React, { useState, useMemo } from 'react';
import { XCircle, AlertTriangle, Clock, History } from 'lucide-react';
import { getHoliday } from '../utils';

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

// --- ISO TO LOCAL TIME HELPER ---
const parseTimeFromISO = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AddShiftModal({ 
  isOpen, onClose, selectedDate, employees = [], clients = [], shifts = [], timeOffLogs = [], 
  onSave, onUpdate, editingShift, currentUser, onAddShiftAuditLog 
}) {
  const safeEmps = Array.isArray(employees) ? employees.filter(Boolean).filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin') : [];
  const safeClients = Array.isArray(clients) ? clients.filter(Boolean).filter(c => c.isActive !== false) : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeTimeOff = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  
  // --- SMART INITIALIZATION (Edit Mode vs Add Mode) ---
  const initialEmpId = editingShift && editingShift.employeeId !== 'unassigned' ? editingShift.employeeId : (safeEmps[0]?.id || '');
  
  const [employeeId, setEmployeeId] = useState(initialEmpId);
  const [clientId, setClientId] = useState(editingShift?.clientId || safeClients[0]?.id || '');
  const [startTime, setStartTime] = useState(editingShift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(editingShift?.endTime || '11:00'); 
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  
  // Atypical Pay State
  const [isHourlyOverride, setIsHourlyOverride] = useState(editingShift?.isHourlyOverride || false);
  const [hourlyRate, setHourlyRate] = useState(editingShift?.hourlyRate || '');

  // Punch Clock State
  const [requirePunchClock, setRequirePunchClock] = useState(editingShift?.requirePunchClock ?? true);
  
  // Admin Override State for Actual Punches
  const [actualStartTime, setActualStartTime] = useState(parseTimeFromISO(editingShift?.actualStartTime));
  const [actualEndTime, setActualEndTime] = useState(parseTimeFromISO(editingShift?.actualEndTime));

  // Internal Task State
  const [isInternal, setIsInternal] = useState(editingShift?.isInternal || false);
  const [internalTask, setInternalTask] = useState(editingShift?.internalTask || '');

  // Unified Soft Warning State ('overlap', 'availability', or null)
  const [warningState, setWarningState] = useState(null);
  
  // --- NEW: RETROACTIVE AUDIT STATE ---
  const [retroactiveReason, setRetroactiveReason] = useState('');

  // --- RETROACTIVE DETECTION LOGIC ---
  const shiftEndDt = new Date(`${selectedDate}T${endTime || '23:59'}`);
  const isPastShift = shiftEndDt < new Date();

  // --- COMPUTE VISIBILITY FOR PUNCH CLOCK TOGGLE ---
  const selectedEmp = safeEmps.find(e => e.id === employeeId);
  const isHourlyEmp = selectedEmp?.payType === 'hourly';
  const showPunchToggle = isHourlyOverride || isHourlyEmp;

  // --- DYNAMIC OVERBOOKING MATH ---
  const baseDate = parseLocalSafe(selectedDate);
  const shiftMonthKey = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
  const selectedClientData = safeClients.find(c => c.id === clientId);
  
  let clientShiftsThisMonth = safeShifts.filter(s => {
    if (s.clientId !== clientId || !s.date) return false;
    const d = parseLocalSafe(s.date);
    return d.getMonth() === baseDate.getMonth() && d.getFullYear() === baseDate.getFullYear();
  }).length;

  if (editingShift && editingShift.clientId === clientId) {
    clientShiftsThisMonth = Math.max(0, clientShiftsThisMonth - 1);
  }

  const baseShifts = selectedClientData?.autoRenew ? (Number(selectedClientData?.baseMonthlyShifts) || 0) : 0;
  const extraShifts = selectedClientData?.extraShifts?.[shiftMonthKey] || 0;
  const targetThisMonth = baseShifts + extraShifts;
  const remainingShifts = targetThisMonth - clientShiftsThisMonth;
  const isOverbooked = remainingShifts <= 0;

  // --- HARD BLOCK: TIME OFF ---
  const isTimeOffBlocked = useMemo(() => {
    if (!employeeId || !selectedDate) return false;
    return safeTimeOff.some(log => {
      if (log.employeeId !== employeeId || log.status !== 'approved') return false;
      const logStart = parseLocalSafe(log.startDate);
      const logEnd = parseLocalSafe(log.endDate);
      const checkDate = parseLocalSafe(selectedDate);
      return checkDate >= logStart && checkDate <= logEnd;
    });
  }, [employeeId, selectedDate, safeTimeOff]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isTimeOffBlocked) return; 

    if (isInternal && !internalTask.trim()) {
      alert("Please provide a task description for this internal shift.");
      return;
    }
    
    // Validate Retroactive Reason
    if (isPastShift && !retroactiveReason.trim()) {
      alert("A reason is required when making retroactive changes to past shifts.");
      return;
    }

    // --- SMART CONFLICT DETECTOR ---
    if (!warningState) {
      const conflicting = safeShifts.filter(s => {
         if (editingShift && s.id === editingShift.id) return false; 
         if (s.employeeId !== employeeId || s.date !== selectedDate || !s.startTime || !s.endTime) return false;
         
         const [sH, sM] = s.startTime.split(':').map(Number);
         const [eH, eM] = s.endTime.split(':').map(Number);
         const [nH, nM] = startTime.split(':').map(Number);
         const [neH, neM] = endTime.split(':').map(Number);
         
         const sStartM = sH * 60 + sM;
         const sEndM = eH * 60 + eM;
         const nStartM = nH * 60 + nM;
         const nEndM = neH * 60 + neM;
         
         return (nStartM < sEndM && nEndM > sStartM); 
      });
      
      if (conflicting.length > 0) {
         setWarningState({ type: 'overlap', details: conflicting });
         return; 
      }

      const avail = selectedEmp?.availability || [];
      if (avail.length > 0) {
         const d = parseLocalSafe(selectedDate);
         const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
         const h = Number(startTime.split(':')[0]);
         let timeSlot = 'Overnights';
         if (h >= 5 && h < 12) timeSlot = 'Mornings';
         else if (h >= 12 && h < 17) timeSlot = 'Afternoons';
         else if (h >= 17 && h < 22) timeSlot = 'Evenings';
         
         const expectedSlot = `${dayName} ${timeSlot}`;
         const isAvailable = avail.includes('Anytime') || avail.includes(expectedSlot) || avail.some(a => a.includes(dayName) && a.includes('Any'));
         
         if (!isAvailable) {
            setWarningState({ type: 'availability', expectedSlot });
            return;
         }
      }
    }

    // --- PROCEED WITH SAVE / UPDATE ---
    const baseShift = { employeeId, startTime, endTime };
    
    if (isInternal) {
      baseShift.isInternal = true;
      baseShift.internalTask = internalTask;
      baseShift.clientId = null;
    } else {
      baseShift.isInternal = false;
      baseShift.internalTask = '';
      baseShift.clientId = clientId;
    }

    if (isHourlyOverride) {
      baseShift.isHourlyOverride = true;
      baseShift.hourlyRate = Number(hourlyRate);
    } else {
      baseShift.isHourlyOverride = false;
      baseShift.hourlyRate = null;
    }

    if (showPunchToggle) {
      baseShift.requirePunchClock = requirePunchClock;
      if (editingShift && requirePunchClock) {
        baseShift.actualStartTime = actualStartTime ? new Date(`${selectedDate}T${actualStartTime}`).toISOString() : null;
        baseShift.actualEndTime = actualEndTime ? new Date(`${selectedDate}T${actualEndTime}`).toISOString() : null;
      }
    } else {
      baseShift.requirePunchClock = false;
    }

    // --- AUDIT LOG GENERATOR HELPER ---
    const generateAuditLog = (actionType, details, overrideShiftId = null) => {
      if (onAddShiftAuditLog && currentUser) {
        onAddShiftAuditLog({
          timestamp: new Date().toISOString(),
          adminName: currentUser.name,
          actionType: actionType,
          shiftId: overrideShiftId || (editingShift ? editingShift.id : 'New'),
          details: details,
          reason: isPastShift ? retroactiveReason : ''
        });
      }
    };

    // EDIT MODE ROUTING
    if (editingShift && onUpdate) {
      onUpdate(editingShift.id, baseShift);
      generateAuditLog(
        isPastShift ? 'Retroactive Update' : 'Updated',
        `Updated shift for ${selectedEmp?.name || 'Unassigned'} on ${selectedDate} (${startTime}-${endTime}).`
      );
      onClose();
      return;
    }

    // ADD MODE ROUTING
    const newShifts = [];
    const startDate = parseLocalSafe(selectedDate);
    const generatedIds = [];
    
    if (isRecurring && !isPastShift) {
      for (let i = 0; i < recurrenceWeeks; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + (i * 7));
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        
        if (getHoliday(dateStr)) continue;
        const newId = `shift_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
        newShifts.push({ ...baseShift, id: newId, date: dateStr });
        generatedIds.push(newId);
      }
    } else {
      const newId = `shift_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
      newShifts.push({ ...baseShift, id: newId, date: selectedDate });
      generatedIds.push(newId);
    }
    
    if (onSave) onSave(newShifts);
    
    generateAuditLog(
      isPastShift ? 'Retroactive Creation' : 'Created',
      `Created ${newShifts.length} shift(s) starting ${selectedDate} for ${selectedEmp?.name || 'Unassigned'}.`,
      generatedIds[0] // Bind the audit log to the newly created shift ID
    );
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* STICKY HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{editingShift ? 'Edit Existing Shift' : 'Assign New Shift'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-2xl leading-none">&times;</button>
        </div>
        
        {/* SHIFT TYPE TOGGLE */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-lg w-full border border-slate-200 shadow-inner">
            <button type="button" onClick={() => setIsInternal(false)} className={`flex-1 px-4 py-1.5 text-xs font-bold rounded-md transition ${!isInternal ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Client Visit</button>
            <button type="button" onClick={() => setIsInternal(true)} className={`flex-1 px-4 py-1.5 text-xs font-bold rounded-md transition ${isInternal ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Internal Task</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          {/* SCROLLABLE BODY */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" value={selectedDate} readOnly className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none" /></div>
            
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-slate-700">Employee</label>
                {isTimeOffBlocked && <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded shadow-sm border border-red-200">ON VACATION / LEAVE</span>}
              </div>
              <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setWarningState(null); }} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${isTimeOffBlocked ? 'bg-red-50 border-red-300 text-red-900' : 'border-slate-300'}`} required>
                {safeEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
              </select>
              {isTimeOffBlocked && <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center"><XCircle className="h-3.5 w-3.5 mr-1" /> This employee is on approved leave. You cannot schedule them.</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setWarningState(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setWarningState(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required /></div>
            </div>
            
            {!isInternal ? (
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-slate-700">Client</label>
                  {clientId && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm ${isOverbooked ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                      {remainingShifts} Visits Left in {baseDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  )}
                </div>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${isOverbooked ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-300'}`} required={!isInternal}>
                  {safeClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Task / Duty *</label>
                <input type="text" value={internalTask} onChange={(e) => setInternalTask(e.target.value)} placeholder="e.g. Party Planning, Admin Help, etc." className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30" required={isInternal} />
              </div>
            )}
            
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 cursor-pointer w-fit mb-3">
                <input type="checkbox" checked={isHourlyOverride} onChange={(e) => setIsHourlyOverride(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
                <span>Atypical Shift: Pay Hourly</span>
              </label>
              
              {isHourlyOverride && (
                <div className="mb-4 pl-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                   <label className="block text-xs font-bold text-slate-700 mb-1">Custom Hourly Rate ($)</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 text-sm">$</span></div>
                     <input type="number" step="0.01" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 25.00" className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm font-semibold text-slate-800 focus:ring-teal-500 focus:border-teal-500" required={isHourlyOverride} />
                   </div>
                   <p className="text-[10px] text-slate-500 mt-1">This specific shift will be tracked hourly instead of per-visit for this employee.</p>
                </div>
              )}

              {showPunchToggle && (
                <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 cursor-pointer w-fit mb-4">
                  <input type="checkbox" checked={requirePunchClock} onChange={(e) => setRequirePunchClock(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
                  <span>Require Employee to Punch Clock</span>
                </label>
              )}

              {/* ADMIN OVERRIDE FOR PUNCH TIMESTAMPS */}
              {editingShift && showPunchToggle && requirePunchClock && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-inner">
                   <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center"><Clock className="h-4 w-4 mr-1.5"/> Admin Punch Override</h4>
                   <p className="text-xs text-indigo-700 mb-3 font-medium">Manually correct the actual worked times if the employee forgot to punch in or out.</p>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-indigo-800 mb-1">Actual Punch In</label>
                       <input type="time" value={actualStartTime} onChange={e => setActualStartTime(e.target.value)} className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-indigo-500 text-sm font-bold text-indigo-900 bg-white" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-indigo-800 mb-1">Actual Punch Out</label>
                       <input type="time" value={actualEndTime} onChange={e => setActualEndTime(e.target.value)} className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-indigo-500 text-sm font-bold text-indigo-900 bg-white" />
                     </div>
                   </div>
                   <div className="mt-3 text-right">
                     <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider cursor-pointer hover:text-indigo-800 hover:underline transition" onClick={() => { setActualStartTime(''); setActualEndTime(''); }}>
                       Clear Punches
                     </span>
                   </div>
                </div>
              )}

              {!editingShift && !isPastShift && (
                <>
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
                </>
              )}
            </div>
            
            {/* --- NEW: RETROACTIVE CHANGE AUDIT ENFORCEMENT --- */}
            {isPastShift && (
              <div className="pt-2 border-t border-slate-200 mt-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-inner">
                   <h4 className="text-sm font-bold text-purple-900 mb-2 flex items-center"><History className="h-4 w-4 mr-1.5"/> Retroactive Change</h4>
                   <p className="text-xs text-purple-700 mb-3 font-medium">You are altering a shift that has already occurred. This change will be permanently recorded in the Audit Log.</p>
                   <div>
                     <label className="block text-xs font-bold text-purple-800 mb-1">Reason for Retroactive Change *</label>
                     <textarea 
                        value={retroactiveReason} 
                        onChange={e => setRetroactiveReason(e.target.value)} 
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:ring-purple-500 text-sm font-medium text-purple-900 bg-white" 
                        placeholder="e.g. Swapped shift with Juhlea, forgot to update schedule." 
                        rows="2" 
                        required={isPastShift} 
                     />
                   </div>
                </div>
              </div>
            )}

            {warningState && warningState.type === 'overlap' && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-2 shadow-inner">
                <h4 className="text-yellow-900 font-bold flex items-center mb-2 text-sm"><AlertTriangle className="h-4 w-4 mr-1.5" /> Anomaly Detected: Double-Booking</h4>
                <p className="text-xs text-yellow-800 mb-2 font-medium">This employee is already scheduled during this exact time block:</p>
                <ul className="text-xs text-yellow-900 font-bold list-disc pl-5 space-y-1 mb-3">
                  {warningState.details.map(c => {
                     const clName = c.isInternal ? c.internalTask : safeClients.find(client => client.id === c.clientId)?.name;
                     return <li key={c.id}>{clName || 'Unknown Client'} ({c.startTime} - {c.endTime})</li>
                  })}
                </ul>
                <p className="text-[11px] text-yellow-700 font-bold uppercase tracking-wider border-t border-yellow-200 pt-2">Are you intentionally double-booking them for a group outing?</p>
              </div>
            )}

            {warningState && warningState.type === 'availability' && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mt-2 shadow-inner">
                <h4 className="text-orange-900 font-bold flex items-center mb-2 text-sm"><AlertTriangle className="h-4 w-4 mr-1.5" /> Availability Warning</h4>
                <p className="text-xs text-orange-800 font-medium mb-1">This employee is not formally marked as available for <strong>{warningState.expectedSlot}</strong>.</p>
                <p className="text-[11px] text-orange-700 font-bold uppercase tracking-wider border-t border-orange-200 pt-2 mt-2">Proceed anyway if you have verbally confirmed this shift with them.</p>
              </div>
            )}
          </div>
          
          {/* STICKY FOOTER */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
            {warningState ? (
               <>
                 <button type="button" onClick={() => setWarningState(null)} className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-sm">Cancel / Fix</button>
                 <button type="submit" className="px-4 py-2.5 text-sm font-black text-yellow-900 bg-yellow-400 rounded-md hover:bg-yellow-500 transition shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                    {warningState.type === 'overlap' ? 'Yes, Approve Double Booking' : 'Yes, Override Availability'}
                 </button>
               </>
            ) : (
               <>
                 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">Cancel</button>
                 <button type="submit" disabled={isTimeOffBlocked} className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-slate-400 transition shadow-sm">
                   {editingShift ? 'Update Shift' : 'Save Shift'}
                 </button>
               </>
            )}
          </div>
          
        </form>
      </div>
    </div>
  );
}
