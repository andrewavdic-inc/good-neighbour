import React, { useState } from 'react';
import { Activity, Sun, CalendarDays, Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

// --- INLINE HELPERS ---
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

export default function TimeOffTab({ currentUser, myTimeOffLogs, onAddTimeOff }) {
  const [toStartDate, setToStartDate] = useState(''); 
  const [toEndDate, setToEndDate] = useState(''); 
  const [toType, setToType] = useState('sick'); 
  const [toNote, setToNote] = useState('');

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

  return (
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
              const isTraining = req.status === 'training';
              
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
                    {(req.status === 'approved' || isTraining) ? (
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
  );
}
