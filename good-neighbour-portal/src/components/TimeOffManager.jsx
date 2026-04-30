import React, { useMemo, useState } from 'react';
import { CalendarDays, Activity, Sun, CheckCircle, XCircle, Trash2, Clock, AlertCircle, Filter } from 'lucide-react';

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

export default function TimeOffManager({ employees = [], timeOffLogs = [], onApprove, onReject, onRemoveTimeOff }) {
  const currentYear = new Date().getFullYear();
  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const [filterMonth, setFilterMonth] = useState(''); 

  const employeeBalances = useMemo(() => {
    if (safeEmployees.length === 0) return [];
    return safeEmployees.map(emp => {
      const approvedEmpLogs = safeTimeOffLogs.filter(l => 
        l && l.employeeId === emp.id && 
        l.status === 'approved' && 
        l.startDate && parseLocalSafe(l.startDate).getFullYear() === currentYear
      );
      
      let usedSick = 0; let usedVacation = 0;

      approvedEmpLogs.forEach(log => {
        const start = parseLocalSafe(log.startDate);
        const end = parseLocalSafe(log.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (log.type === 'sick') usedSick += diffDays;
        if (log.type === 'vacation') usedVacation += diffDays;
      });

      const allowedSick = emp.timeOffBalances?.sick || 0;
      const allowedVacation = emp.timeOffBalances?.vacation || 0;

      return {
        ...emp,
        usedSick,
        remainingSick: allowedSick - usedSick,
        allowedSick,
        usedVacation,
        remainingVacation: allowedVacation - usedVacation,
        allowedVacation
      };
    });
  }, [safeEmployees, safeTimeOffLogs, currentYear]);

  // Separate Queues
  const pendingRequests = safeTimeOffLogs.filter(l => l.status === 'pending').sort((a,b) => new Date(a.dateSubmitted) - new Date(b.dateSubmitted));
  
  // Combine all non-pending logs for the history view
  const historyLogs = safeTimeOffLogs.filter(l => l.status !== 'pending').sort((a,b) => new Date(b.startDate) - new Date(a.startDate));

  const displayHistory = historyLogs.filter(log => {
    if (!filterMonth) return true;
    return log.startDate && log.startDate.startsWith(filterMonth);
  });

  const getEmpName = (id) => safeEmployees.find(e => e.id === id)?.name || 'Unknown Employee';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Pending Approvals */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Action Required</h2>
          </div>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">{pendingRequests.length} Pending</span>
          )}
        </div>
        
        <div className="p-4 space-y-3 bg-slate-50/30 min-h-[300px] max-h-[700px] overflow-y-auto">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">You're all caught up!</p>
            </div>
          ) : (
            pendingRequests.map(req => {
              const start = parseLocalSafe(req.startDate);
              const end = parseLocalSafe(req.endDate);
              const isSick = req.type === 'sick';
              
              return (
                <div key={req.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-amber-300 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-slate-800">{getEmpName(req.employeeId)}</div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${isSick ? 'bg-red-50 text-red-700 border border-red-100' : req.type === 'vacation' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {req.type === 'sick' ? 'Sick Leave' : req.type === 'vacation' ? 'Vacation' : 'Unpaid Leave'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                    <div className="font-medium text-slate-800 mb-1">Requested Dates:</div>
                    {start.toLocaleDateString()} to {end.toLocaleDateString()}
                    {req.note && <div className="mt-2 text-xs italic text-slate-500">"{req.note}"</div>}
                  </div>
                  <div className="flex items-center bg-blue-50 text-blue-800 text-[10px] font-medium p-2 rounded mb-3">
                    <AlertCircle className="h-3 w-3 mr-1 shrink-0" /> Approving will automatically unassign them from any shifts scheduled during these dates.
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button onClick={() => onApprove && onApprove(req)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-1.5" /> Approve
                    </button>
                    <button onClick={() => onReject && onReject(req.id)} className="flex-1 bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 text-sm font-semibold py-2 rounded transition flex items-center justify-center">
                      <XCircle className="h-4 w-4 mr-1.5" /> Deny
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Balances & History */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Balances Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Staff Time Off Balances ({currentYear})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium text-center">Sick Days Left</th>
                  <th className="px-4 py-3 font-medium text-center">Vacation Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeBalances.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">No employees found.</td></tr>
                ) : (
                  employeeBalances.map(emp => (
                    <tr key={emp.id || Math.random()} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.name || 'Unnamed Employee'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-bold ${emp.remainingSick <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingSick}</span> / {emp.allowedSick}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-bold ${emp.remainingVacation <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingVacation}</span> / {emp.allowedVacation}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Request History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-800">Time Off Ledger</h2>
            </div>
            <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
              <Filter className="h-4 w-4 mr-1.5 text-slate-400" />
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="text-sm py-1 border-none focus:outline-none text-slate-600 bg-transparent w-36" title="Filter by Month" />
            </div>
          </div>
          
          <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto bg-slate-50/50">
            {displayHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No time off records found for this period.</p>
            ) : (
              displayHistory.map(log => {
                const emp = safeEmployees.find(e => e.id === log.employeeId);
                const isSick = log.type === 'sick';
                const start = parseLocalSafe(log.startDate);
                const end = parseLocalSafe(log.endDate);
                
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white transition hover:shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full mt-0.5 ${isSick ? 'bg-red-100 text-red-600' : log.type === 'vacation' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                        {isSick ? <Activity className="h-4 w-4" /> : log.type === 'vacation' ? <Sun className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {emp?.name || 'Unknown Employee'} <span className="font-normal text-slate-500 ml-1">requested {log.type === 'sick' ? 'Sick Leave' : log.type === 'vacation' ? 'Vacation' : 'Unpaid Leave'}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-1">
                          {start.toLocaleDateString()} - {end.toLocaleDateString()}
                        </div>
                        {log.note && <div className="text-xs text-slate-500 italic mt-0.5">"{log.note}"</div>}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {log.status === 'approved' ? (
                        <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approved</span>
                      ) : log.status === 'rejected' ? (
                        <span className="flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><XCircle className="h-3.5 w-3.5 mr-1" /> Denied</span>
                      ) : (
                        <span className="flex items-center text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full"><Trash2 className="h-3.5 w-3.5 mr-1" /> Cancelled</span>
                      )}
                      
                      {/* Allow Admin to Cancel an Approved Request */}
                      {log.status === 'approved' && (
                        <button onClick={() => { if(window.confirm(`Delete this record? This will refund the days but will NOT restore their schedule automatically.`)) { onRemoveTimeOff && onRemoveTimeOff(log.id) } }} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
