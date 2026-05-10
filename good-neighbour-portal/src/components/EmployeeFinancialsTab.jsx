import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Star, 
  Car, 
  Filter, 
  Plus, 
  Receipt, 
  Image as ImageIcon, 
  Loader2, 
  FileText, 
  Download,
  Trash2,
  Award
} from 'lucide-react';

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

const safeSortByDateDesc = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  try { 
    return [...arr].filter(Boolean).sort((a, b) => parseLocalSafe(b.date).getTime() - parseLocalSafe(a.date).getTime()); 
  } catch (e) { 
    return []; 
  }
};

const getPayPeriodBounds = (anchorDateStr) => {
  const now = new Date(); 
  const anchor = parseLocalSafe(anchorDateStr); 
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < anchor) return { start: anchor, end: new Date(anchor.getTime() + 13 * 86400000) };
  const diffDays = Math.floor((today - anchor) / 86400000); 
  const cycles = Math.floor(diffDays / 14);
  const start = new Date(anchor.getTime() + cycles * 14 * 86400000); 
  return { start, end: new Date(start.getTime() + 13 * 86400000) };
};

// ==========================================
// COMPONENTS
// ==========================================

export function EmployeePayTracker({ currentUser, shifts, expenses, clientExpenses, payPeriodStart, prizes = [] }) {
  const now = new Date(); 
  const periodBounds = getPayPeriodBounds(payPeriodStart || '2026-04-01');
  
  const completedShifts = (Array.isArray(shifts) ? shifts : []).filter(s => {
    if (!s || s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
    const shiftEnd = new Date(`${s.date}T${s.endTime}`); 
    return shiftEnd <= now && parseLocalSafe(s.date) >= periodBounds.start && parseLocalSafe(s.date) <= periodBounds.end;
  });

  let shiftEarnings = 0;
  
  // Split Earnings Logic
  let standardShiftCount = 0;
  let standardEarnings = 0;
  let hourlyHours = 0;
  let hourlyEarnings = 0;

  if (currentUser.payType === 'salary') {
    shiftEarnings = (Number(currentUser.annualSalary) || 0) / 26; 
  } else { 
    completedShifts.forEach(s => { 
      if (currentUser.payType === 'hourly' || s.isHourlyOverride) {
         let h = 0;
         if (s.actualStartTime && s.actualEndTime) {
             h = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
         } else {
             const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
             const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number); 
             h = (eH + eM/60) - (sH + sM/60); 
             if (h < 0) h += 24; 
         }
         const rate = s.isHourlyOverride ? (Number(s.hourlyRate) || 0) : (Number(currentUser.hourlyWage) || 22.50);
         hourlyHours += h;
         hourlyEarnings += (h * rate);
      } else {
         standardShiftCount += 1;
         standardEarnings += (Number(currentUser.perVisitRate) || 45);
      }
    });
    shiftEarnings = standardEarnings + hourlyEarnings;
  }

  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oopEarnings = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === currentUser.id && e.status === 'approved' && parseLocalSafe(e.date) >= periodBounds.start && parseLocalSafe(e.date) <= periodBounds.end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // --- NEW: CASH BONUS EXTRACTION ---
  const bonusEarnings = (Array.isArray(prizes) ? prizes : []).filter(p => {
    if (!p || p.employeeId !== currentUser.id || !p.date) return false;
    const d = parseLocalSafe(p.date);
    const isBonus = (p.name || '').toLowerCase().includes('bonus') || (p.name || '').toLowerCase().includes('place');
    return isBonus && d >= periodBounds.start && d <= periodBounds.end;
  }).reduce((sum, p) => sum + (Number(p.value) || 0), 0);

  const totalEarnings = shiftEarnings + kmEarnings + oopEarnings + bonusEarnings;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden mb-6 mt-6">
      <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={150} /></div>
      <div className="relative z-10">
        <h3 className="text-slate-300 font-medium text-sm flex items-center mb-1"><Activity className="h-4 w-4 mr-1.5 text-emerald-400" /> Live Pay Tracker</h3>
        <div className="text-xs text-slate-400 mb-6">Period: {periodBounds.start.toLocaleDateString()} - {periodBounds.end.toLocaleDateString()}</div>
        <div className="text-4xl font-black text-emerald-400 mb-6 tracking-tight">${totalEarnings.toFixed(2)}</div>
        <div className="space-y-3">
          
          {/* --- DYNAMIC SHIFT RENDERING LOGIC --- */}
          {currentUser.payType === 'salary' ? (
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-sm text-slate-300">Base Salary (Bi-weekly)</span>
              <span className="font-semibold text-white">${shiftEarnings.toFixed(2)}</span>
            </div>
          ) : (
            <>
              {/* Show Standard Per-Visit Shifts */}
              {(currentUser.payType === 'per_visit' || standardShiftCount > 0) && (
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                  <span className="text-sm text-slate-300">Completed Shifts ({standardShiftCount})</span>
                  <span className="font-semibold text-white">${standardEarnings.toFixed(2)}</span>
                </div>
              )}
              
              {/* Show Hourly/Atypical Shifts if they worked any */}
              {(currentUser.payType === 'hourly' || hourlyHours > 0) && (
                <div className="flex justify-between items-center bg-white/5 p-2 rounded mt-2 border border-slate-700">
                  <span className="text-sm text-slate-300">
                    {currentUser.payType === 'hourly' ? `Completed Hours (${hourlyHours.toFixed(1)} hrs)` : `Atypical Hourly Shifts (${hourlyHours.toFixed(1)} hrs)`}
                  </span>
                  <span className="font-semibold text-white">${hourlyEarnings.toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">Approved Mileage</span>
            <span className="font-semibold text-white">${kmEarnings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-sm text-slate-300">Approved Expenses</span>
            <span className="font-semibold text-white">${oopEarnings.toFixed(2)}</span>
          </div>
          
          {/* --- REWARDS BONUS ROW --- */}
          {bonusEarnings > 0 && (
            <div className="flex justify-between items-center bg-yellow-500/20 border border-yellow-500/30 p-2 rounded">
              <span className="text-sm text-yellow-200 font-bold flex items-center"><Award className="h-4 w-4 mr-1.5"/> Cash Bonuses</span>
              <span className="font-black text-yellow-400">+${bonusEarnings.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmployeeMileageLog({ myExpenses = [], clients = [], myShifts = [], onAddExpense, onRemoveExpense }) {
  const [shiftId, setShiftId] = useState(''); 
  const [kilometers, setKilometers] = useState(''); 
  const [description, setDescription] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); 
  
  const safeExpenses = Array.isArray(myExpenses) ? myExpenses : []; 
  const safeClients = Array.isArray(clients) ? clients : [];
  
  // Filter only shifts that are already past/completed
  const pastShifts = safeSortByDateDesc(Array.isArray(myShifts) ? myShifts : []).filter(s => new Date(s.date) <= new Date());
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (!shiftId || !kilometers) return; 
    
    const selectedShift = pastShifts.find(s => s.id === shiftId);
    if (!selectedShift) return;
    
    const date = selectedShift.date;
    const clientId = selectedShift.isInternal ? 'internal' : selectedShift.clientId;

    if (onAddExpense) {
      onAddExpense({ date, clientId, shiftId, kilometers: Number(kilometers), description }); 
    }
    setShiftId(''); setKilometers(''); setDescription(''); 
  };
  
  const displayExpenses = safeSortByDateDesc(safeExpenses).filter(exp => { 
    if (!filterMonth) return true; 
    return exp.date && exp.date.startsWith(filterMonth); 
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Car className="h-5 w-5 mr-2 text-teal-600" /> Mileage Log</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Completed Shift *</label>
              <select value={shiftId} onChange={(e)=>setShiftId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" required>
                <option value="" disabled>-- Choose a Shift --</option>
                {pastShifts.map(s => {
                  const c = clients.find(client => client.id === s.clientId);
                  return (
                    <option key={s.id} value={s.id}>
                      {parseLocalSafe(s.date).toLocaleDateString()} - {s.isInternal ? s.internalTask : c?.name} ({s.startTime})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kilometers *</label>
              <input type="number" min="0.1" max="50" step="0.1" value={kilometers} onChange={(e)=>setKilometers(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500 bg-white" placeholder="e.g. Park trip" />
            </div>
          </div>
          <button type="submit" disabled={!shiftId || !kilometers} className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 disabled:bg-slate-400 transition text-sm flex items-center justify-center">
            <Plus className="h-4 w-4 mr-1"/> Submit Log
          </button>
        </form>
      </div>
      <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log History</span>
        <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
          <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
          <input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="text-xs py-1 border-none focus:outline-none text-slate-600 bg-transparent w-32" 
            title="Filter by Month" 
          />
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {displayExpenses.map(exp => {
          const clientNameDisplay = exp.clientId === 'internal' ? '🏢 Internal Task' : safeClients.find(c => c.id === exp.clientId)?.name || 'Unknown';
          return (
            <div key={exp.id} className={`flex justify-between items-center p-3 border rounded-lg ${exp.clientId === 'internal' ? 'bg-indigo-50/50 border-indigo-100' : 'border-slate-100 bg-slate-50'}`}>
              <div>
                <div className="font-semibold text-sm text-slate-800">{parseLocalSafe(exp.date).toLocaleDateString()}</div>
                <div className={`text-xs mt-0.5 ${exp.clientId === 'internal' ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>{exp.kilometers} km &bull; {clientNameDisplay}</div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='paid'?'bg-blue-100 text-blue-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
                {exp.status === 'pending' && onRemoveExpense && (
                  <button onClick={() => onRemoveExpense(exp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete Typo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmployeeClientExpenseLog({ myClientExpenses = [], clients = [], myShifts = [], onAddClientExpense, onRemoveClientExpense }) {
  const [shiftId, setShiftId] = useState(''); 
  const [amount, setAmount] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [receiptFile, setReceiptFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  
  const safeClientExpenses = Array.isArray(myClientExpenses) ? myClientExpenses : [];
  
  // Filter only shifts that are already past/completed
  const pastShifts = safeSortByDateDesc(Array.isArray(myShifts) ? myShifts : []).filter(s => new Date(s.date) <= new Date());
  
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (!shiftId || !amount) return; 
    
    const selectedShift = pastShifts.find(s => s.id === shiftId);
    if (!selectedShift) return;

    setIsUploading(true); 
    const date = selectedShift.date;
    const clientId = selectedShift.isInternal ? 'internal' : selectedShift.clientId;

    if(onAddClientExpense) { 
      await onAddClientExpense({ date, clientId, shiftId, amount: Number(amount), description }, receiptFile); 
    } 
    setShiftId(''); setAmount(''); setDescription(''); setReceiptFile(null); setIsUploading(false); 
  };

  const displayExpenses = safeSortByDateDesc(safeClientExpenses).filter(exp => { 
    if (!filterMonth) return true; 
    return exp.date && exp.date.startsWith(filterMonth); 
  });
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /> Client Expenses</h2>
      </div>
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Completed Shift *</label>
              <select value={shiftId} onChange={(e)=>setShiftId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" required disabled={isUploading}>
                <option value="" disabled>-- Choose a Shift --</option>
                {pastShifts.map(s => {
                  const c = clients.find(client => client.id === s.clientId);
                  return (
                    <option key={s.id} value={s.id}>
                      {parseLocalSafe(s.date).toLocaleDateString()} - {s.isInternal ? s.internalTask : c?.name} ({s.startTime})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount ($) *</label>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" required disabled={isUploading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white" disabled={isUploading} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">Upload Receipt</label>
            <div className={`mt-1 flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('receipt-upload').click()}>
              <div className="text-center flex items-center space-x-2"><ImageIcon className="h-4 w-4 text-slate-400" /><span className="text-xs font-medium text-teal-600 truncate max-w-[150px]">{receiptFile ? receiptFile.name : 'Click to attach receipt'}</span></div>
              <input id="receipt-upload" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setReceiptFile(e.target.files[0])} disabled={isUploading} />
            </div>
          </div>
          <button type="submit" disabled={isUploading || !amount || !shiftId} className="w-full mt-2 bg-teal-600 text-white font-medium py-1.5 rounded hover:bg-teal-700 disabled:bg-slate-400 transition text-sm flex items-center justify-center">
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : <><Plus className="h-4 w-4 mr-1"/> Submit Expense</>}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log History</span>
        <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
          <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
          <input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="text-xs py-1 border-none focus:outline-none text-slate-600 bg-transparent w-32" 
            title="Filter by Month" 
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
        {displayExpenses.map(exp => {
          const clientNameDisplay = exp.clientId === 'internal' ? '🏢 Internal Task' : clients.find(c => c.id === exp.clientId)?.name || 'Unknown';
          return (
            <div key={exp.id} className={`flex justify-between items-center p-3 border rounded-lg ${exp.clientId === 'internal' ? 'bg-indigo-50/50 border-indigo-100' : 'border-slate-100 bg-slate-50'}`}>
              <div>
                <div className="font-semibold text-sm text-slate-800">{parseLocalSafe(exp.date).toLocaleDateString()}</div>
                <div className={`text-xs mt-0.5 ${exp.clientId === 'internal' ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>${Number(exp.amount || 0).toFixed(2)} &bull; {clientNameDisplay}</div>
              </div>
              <div className="flex items-center space-x-2">
                {exp.receiptUrl && (
                  <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:bg-teal-100 p-1 rounded" title="View Receipt">
                    <FileText className="h-4 w-4" />
                  </a>
                )}
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${exp.status==='approved'?'bg-green-100 text-green-800':exp.status==='paid'?'bg-blue-100 text-blue-800':exp.status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{exp.status}</span>
                {exp.status === 'pending' && onRemoveClientExpense && (
                  <button onClick={() => onRemoveClientExpense(exp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete Typo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmployeePaystubs({ myPaystubs = [] }) {
  const safePaystubs = Array.isArray(myPaystubs) ? myPaystubs : [];
  
  const availableYears = useMemo(() => {
    const years = safePaystubs.map(p => p.date ? parseLocalSafe(p.date).getFullYear() : new Date().getFullYear());
    return [...new Set(years)].sort((a,b) => b - a);
  }, [safePaystubs]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]?.toString() || new Date().getFullYear().toString());

  const filteredStubs = safePaystubs.filter(ps => {
    if (!ps.date) return false;
    return parseLocalSafe(ps.date).getFullYear().toString() === selectedYear;
  });
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-teal-600" /> My Paystubs
        </h2>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border border-slate-300 rounded text-sm px-2 py-1 text-slate-700">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="p-6">
        {filteredStubs.length === 0 ? (
          <div className="text-center text-slate-500 py-4">No paystubs found for {selectedYear}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStubs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ps => (
              <div key={ps.id} className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-teal-400 transition cursor-pointer group bg-slate-50">
                <FileText className="h-8 w-8 text-teal-600 mr-3 opacity-70 group-hover:opacity-100 transition shrink-0" />
                <div className="flex-1 overflow-hidden pr-2">
                  <div className="font-semibold text-slate-800 text-sm">{parseLocalSafe(ps.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                  <div className="text-xs text-slate-500 truncate w-full" title={ps.fileName}>{ps.fileName}</div>
                </div>
                <a 
                  href={ps.fileUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-teal-600 hover:bg-teal-50 p-2 rounded transition inline-flex shrink-0 ml-auto"
                >
                  <Download className="h-5 w-5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
