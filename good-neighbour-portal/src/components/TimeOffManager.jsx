import React, { useState, useMemo } from 'react';
import { CalendarDays, Activity, Sun, Trash2, Plus } from 'lucide-react';

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

export default function TimeOffManager({ employees = [], timeOffLogs = [], onAddTimeOff, onRemoveTimeOff }) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('sick');
  const [note, setNote] = useState('');
  
  const currentYear = new Date().getFullYear();

  const safeTimeOffLogs = Array.isArray(timeOffLogs) ? timeOffLogs : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !date) return;
    if (onAddTimeOff) {
      onAddTimeOff({ employeeId, date, type, note });
    }
    setEmployeeId('');
    setDate('');
    setNote('');
  };

  const employeeBalances = useMemo(() => {
    if (safeEmployees.length === 0) return [];
    
    return safeEmployees.map(emp => {
      const empLogs = safeTimeOffLogs.filter(l => l && l.employeeId === emp.id && l.date && parseLocalSafe(l.date).getFullYear() === currentYear);
      const usedSick = empLogs.filter(l => l.type === 'sick').length;
      const usedVacation = empLogs.filter(l => l.type === 'vacation').length;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <CalendarDays className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Log Time Off</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            >
              <option value="" disabled>Select an employee...</option>
              {safeEmployees.map(emp => (
                <option key={emp.id || Math.random()} value={emp.id}>{emp.name || 'Unnamed Employee'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              required
            >
              <option value="sick">Sick Day</option>
              <option value="vacation">Vacation Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="Reason for time off"
            />
          </div>
          <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Time Off</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Staff Time Off Balances ({currentYear})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Sick Left</th>
                  <th className="px-4 py-3 font-medium">Sick Used</th>
                  <th className="px-4 py-3 font-medium">Vacation Left</th>
                  <th className="px-4 py-3 font-medium">Vacation Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeBalances.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No employees found.</td>
                  </tr>
                ) : (
                  employeeBalances.map(emp => (
                    <tr key={emp.id || Math.random()} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.name || 'Unnamed Employee'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${emp.remainingSick <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingSick}</span> / {emp.allowedSick}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.usedSick} days</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${emp.remainingVacation <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingVacation}</span> / {emp.allowedVacation}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.usedVacation} days</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
            <h2 className="text-lg font-semibold text-slate-800">Recent Time Off Logs</h2>
          </div>
          <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
            {safeTimeOffLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No time off logged yet.</p>
            ) : (
              [...safeTimeOffLogs].sort((a, b) => {
                const dateA = a?.date ? new Date(a.date).getTime() : 0;
                const dateB = b?.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
              }).map(log => {
                if (!log) return null;
                const emp = safeEmployees.find(e => e.id === log.employeeId);
                const isSick = log.type === 'sick';
                return (
                  <div key={log.id || Math.random()} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 transition hover:shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${isSick ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isSick ? <Activity className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {emp?.name || 'Unknown Employee'} <span className="font-normal text-slate-500 ml-1">took a {isSick ? 'Sick' : 'Vacation'} Day</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <span>{log.date ? parseLocalSafe(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}</span>
                          {log.note && <span className="hidden sm:inline">&bull;</span>}
                          {log.note && <span className="italic">"{log.note}"</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveTimeOff && onRemoveTimeOff(log.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition"
                      title="Delete Log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
