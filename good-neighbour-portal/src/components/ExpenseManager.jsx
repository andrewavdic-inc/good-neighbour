import React, { useState, useMemo, useEffect } from 'react';
import { Receipt, Car, CheckCircle, XCircle, Search, FileText, User, Heart, Filter, DollarSign, CalendarDays, Plus, Trash2, Undo, AlertCircle, Download, Award } from 'lucide-react';
import { getPastPayPeriods } from '../utils';

// --- DATE HELPER ---
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

export default function ExpenseManager({ 
  shifts = [], expenses = [], clientExpenses = [], employees = [], clients = [], 
  onUpdateExpense, onUpdateClientExpense, payPeriodStart, isBonusActive, bonusSettings
}) {
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [activeTab, setActiveTab] = useState('shifts');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state to handle instant UI updates for the new features
  const [localDisputes, setLocalDisputes] = useState({});
  const [manualAdjustments, setManualAdjustments] = useState([]);
  const [adjDesc, setAdjDesc] = useState('');
  const [adjAmount, setAdjAmount] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  // --- UPDATED: GHOST THE MASTER ADMIN ---
  const safeEmployees = Array.isArray(employees) ? employees.filter(e => e && e.role !== 'Master Admin') : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };

  const getClientName = (id) => safeClients.find(c => c.id === id)?.name || 'Unknown Client';

  // --- PAY PERIOD LOGIC ---
  const allPeriods = useMemo(() => getPastPayPeriods(payPeriodStart || '2026-04-01', 104), [payPeriodStart]);
  
  const availableYears = useMemo(() => {
    const years = allPeriods.map(p => p.end.getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [allPeriods]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]?.toString() || new Date().getFullYear().toString());
  const [selectedPeriodTime, setSelectedPeriodTime] = useState('');

  const filteredPeriods = useMemo(() => {
    return allPeriods.filter(p => p.end.getFullYear().toString() === selectedYear);
  }, [allPeriods, selectedYear]);

  const activePeriod = useMemo(() => {
    if (selectedPeriodTime) {
      const found = filteredPeriods.find(p => p.start.getTime().toString() === selectedPeriodTime);
      if (found) return found;
    }
    return filteredPeriods[0] || allPeriods[0];
  }, [filteredPeriods, selectedPeriodTime, allPeriods]);

  const currentPeriodStart = activePeriod.start;
  const currentPeriodEnd = activePeriod.end;

  // --- MATH HELPERS ---
  const getShiftCost = (emp, shift) => {
    if (emp.payType === 'salary') return 0; 
    if (emp.payType === 'hourly') {
      const [sH, sM] = String(shift.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = String(shift.endTime || '00:00').split(':').map(Number);
      let h = (eH + eM/60) - (sH + sM/60);
      if (h < 0) h += 24;
      return h * (Number(emp.hourlyWage) || 22.5);
    }
    return Number(emp.perVisitRate) || 45;
  };

  const filteredEmployees = safeEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmp = safeEmployees.find(e => e.id === selectedEmpId);
  const isSalaried = selectedEmp?.payType === 'salary';

  // --- TAB ENFORCEMENT FOR SALARIED EMPLOYEES ---
  useEffect(() => {
    if (isSalaried && (activeTab === 'mileage' || activeTab === 'oop')) {
      setActiveTab('shifts'); // We rename 'shifts' to 'salary' in the UI, but keep the state key
    }
  }, [selectedEmpId, isSalaried, activeTab]);

  // --- EMPLOYEE SPECIFIC DATA BY PAY PERIOD ---
  const empShifts = useMemo(() => safeShifts.filter(s => {
    if (s.employeeId !== selectedEmpId || !s.date) return false;
    const d = parseLocalSafe(s.date);
    return d >= currentPeriodStart && d <= currentPeriodEnd;
  }).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeShifts, selectedEmpId, currentPeriodStart, currentPeriodEnd]);

  const empMileage = useMemo(() => safeExpenses.filter(e => {
    if (e.employeeId !== selectedEmpId || !e.date) return false;
    const d = parseLocalSafe(e.date);
    return d >= currentPeriodStart && d <= currentPeriodEnd;
  }).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeExpenses, selectedEmpId, currentPeriodStart, currentPeriodEnd]);

  const empOOP = useMemo(() => safeClientExpenses.filter(e => {
    if (e.employeeId !== selectedEmpId || !e.date) return false;
    const d = parseLocalSafe(e.date);
    return d >= currentPeriodStart && d <= currentPeriodEnd;
  }).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeClientExpenses, selectedEmpId, currentPeriodStart, currentPeriodEnd]);

  const empAdjs = manualAdjustments.filter(a => a.employeeId === selectedEmpId && a.periodTime === activePeriod.start.getTime().toString());

  // --- AUTO-BONUS ENGINE ---
  const getMonthlyLeaderboard = () => {
    const mStart = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth(), 1);
    const mEnd = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth() + 1, 0, 23, 59, 59);
    
    let results = safeEmployees.map(emp => {
      const empShiftsForBonus = safeShifts.filter(s => {
        if (s.employeeId !== emp.id || !s.date || !s.endTime) return false;
        const shiftDate = new Date(`${s.date}T${s.endTime}`);
        return shiftDate >= mStart && shiftDate <= mEnd;
      });
      
      let sEarn = 0;
      if (emp.payType === 'salary') {
         sEarn = (Number(emp.annualSalary) || 0) / 12; 
      } else if (emp.payType === 'hourly') {
        let hrs = 0;
        empShiftsForBonus.forEach(s => {
          const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
          const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
          let h = (eH + eM/60) - (sH + sM/60);
          if (h < 0) h += 24;
          hrs += h;
        });
        sEarn = hrs * (Number(emp.hourlyWage) || 22.5);
      } else {
        sEarn = empShiftsForBonus.length * (Number(emp.perVisitRate) || 45);
      }
      
      const kmE = safeExpenses.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= mStart && parseLocalSafe(e.date) <= mEnd).reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);
      const oopE = safeClientExpenses.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= mStart && parseLocalSafe(e.date) <= mEnd).reduce((sum, e) => sum + Number(e.amount), 0);
      
      return { emp, shiftCount: empShiftsForBonus.length, total: sEarn + kmE + oopE };
    });
    
    return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total).slice(0, 3);
  };

  const autoBonusAmount = useMemo(() => {
    if (!isBonusActive || !selectedEmpId) return 0;
    const winners = getMonthlyLeaderboard();
    if (winners[0]?.emp.id === selectedEmpId) return Number(safeBonusSettings.monthly[0] || 0);
    if (winners[1]?.emp.id === selectedEmpId) return Number(safeBonusSettings.monthly[1] || 0);
    if (winners[2]?.emp.id === selectedEmpId) return Number(safeBonusSettings.monthly[2] || 0);
    return 0;
  }, [isBonusActive, selectedEmpId, currentPeriodEnd, safeShifts, safeExpenses, safeClientExpenses, safeEmployees, safeBonusSettings]);

  // --- LIVE TOTAL CALCULATIONS ---
  const approvedShiftsCost = useMemo(() => {
    if (!selectedEmp) return 0;
    if (isSalaried) return (Number(selectedEmp.annualSalary) || 0) / 26;
    return empShifts.reduce((sum, s) => sum + (localDisputes[s.id] ? 0 : getShiftCost(selectedEmp, s)), 0);
  }, [selectedEmp, isSalaried, empShifts, localDisputes]);

  const approvedMileageCost = isSalaried ? 0 : empMileage.reduce((sum, e) => sum + (e.status === 'approved' ? Number(e.kilometers || 0) * 0.68 : 0), 0);
  const approvedOOPCost = isSalaried ? 0 : empOOP.reduce((sum, e) => sum + (e.status === 'approved' ? Number(e.amount || 0) : 0), 0);
  const totalAdjustments = empAdjs.reduce((sum, a) => sum + Number(a.amount || 0), 0) + autoBonusAmount;
  
  const grandTotalOwed = approvedShiftsCost + approvedMileageCost + approvedOOPCost + totalAdjustments;

  // --- CONTEXTUAL CSV EXPORT ---
  const exportContextualCSV = () => {
    if (!selectedEmp) return;
    
    let headers = [];
    let rows = [];
    const periodName = `${currentPeriodStart.toLocaleDateString('en-US', {month:'short', day:'numeric'})}_to_${currentPeriodEnd.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`.replace(/\s+/g, '_');
    
    let tabNameForFile = activeTab;
    if (activeTab === 'shifts' && isSalaried) tabNameForFile = 'salary';
    let filename = `${selectedEmp.name.replace(/\s+/g, '_')}_${tabNameForFile}_${periodName}.csv`;

    if (activeTab === 'shifts') {
      if (isSalaried) {
        headers = ['Description', 'Amount ($)', 'Status'];
        rows = [[`"Bi-Weekly Base Salary"`, approvedShiftsCost.toFixed(2), `"Approved"`]];
      } else {
        headers = ['Date', 'Client', 'Start Time', 'End Time', 'Cost ($)', 'Status'];
        rows = empShifts.map(s => {
          const isDisputed = localDisputes[s.id];
          const cost = getShiftCost(selectedEmp, s);
          return [
            `"${parseLocalSafe(s.date).toLocaleDateString()}"`,
            `"${getClientName(s.clientId)}"`,
            `"${s.startTime}"`,
            `"${s.endTime}"`,
            cost.toFixed(2),
            isDisputed ? 'Disputed' : 'Approved'
          ];
        });
      }
    } else if (activeTab === 'mileage') {
      headers = ['Date', 'Client', 'Description', 'Kilometers', 'Cost ($)', 'Status'];
      rows = empMileage.map(e => [
        `"${parseLocalSafe(e.date).toLocaleDateString()}"`,
        `"${getClientName(e.clientId)}"`,
        `"${e.description || ''}"`,
        e.kilometers,
        (Number(e.kilometers) * 0.68).toFixed(2),
        e.status
      ]);
    } else if (activeTab === 'oop') {
      headers = ['Date', 'Client', 'Description', 'Amount ($)', 'Status'];
      rows = empOOP.map(e => [
        `"${parseLocalSafe(e.date).toLocaleDateString()}"`,
        `"${getClientName(e.clientId)}"`,
        `"${e.description || ''}"`,
        Number(e.amount).toFixed(2),
        e.status
      ]);
    } else if (activeTab === 'adjustments') {
      headers = ['Date', 'Description', 'Amount ($)'];
      if (autoBonusAmount > 0) {
        rows.push([
          `"${currentPeriodEnd.toLocaleDateString('en-US')}"`,
          `"Performance Bonus (System Generated)"`,
          autoBonusAmount.toFixed(2)
        ]);
      }
      empAdjs.forEach(a => {
        rows.push([
          `"${parseLocalSafe(a.date).toLocaleDateString()}"`,
          `"${a.description}"`,
          a.amount.toFixed(2)
        ]);
      });
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddAdjustment = (e) => {
    e.preventDefault();
    if (!adjDesc || !adjAmount) return;
    const newAdj = {
      id: `adj_${Date.now()}`,
      employeeId: selectedEmpId,
      date: new Date().toISOString().split('T')[0],
      periodTime: activePeriod.start.getTime().toString(),
      description: adjDesc,
      amount: Number(adjAmount)
    };
    setManualAdjustments(prev => [...prev, newAdj]);
    setAdjDesc('');
    setAdjAmount('');
  };

  const handleRemoveAdjustment = (id) => {
    setManualAdjustments(prev => prev.filter(a => a.id !== id));
  };

  const renderStatusBadge = (status) => {
    if (status === 'approved') return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase tracking-wider">Approved</span>;
    if (status === 'rejected') return <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded uppercase tracking-wider">Rejected</span>;
    return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase tracking-wider">Pending Review</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
      
      {/* HEADER: SYNCED TO PAY PERIOD */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center">
          <Receipt className="h-6 w-6 mr-3 text-teal-400" />
          <div>
            <h2 className="text-lg font-bold">Payroll Reconciliation Hub</h2>
            <p className="text-xs text-slate-400 font-medium">Audit employee records line-by-line</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto shrink-0">
          <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Pay Period:</label>
          <div className="flex space-x-2 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-1/3 sm:w-auto px-3 py-1.5 border border-slate-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-900 font-medium text-slate-200 shadow-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={activePeriod.start.getTime().toString()}
              onChange={(e) => setSelectedPeriodTime(e.target.value)}
              className="w-2/3 sm:w-auto px-3 py-1.5 border border-slate-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-900 font-medium text-slate-200 shadow-sm"
            >
              {filteredPeriods.map((period) => (
                <option key={period.start.getTime()} value={period.start.getTime().toString()}>
                  {period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {period.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE: EMPLOYEE DIRECTORY */}
        <div className="w-1/3 min-w-[250px] border-r border-slate-200 bg-slate-50 flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {filteredEmployees.map(emp => {
              const pendingCount = emp.payType === 'salary' ? 0 :
                safeExpenses.filter(e => e.employeeId === emp.id && e.status === 'pending').length + 
                safeClientExpenses.filter(e => e.employeeId === emp.id && e.status === 'pending').length;

              return (
                <button 
                  key={emp.id} 
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`w-full text-left p-4 transition flex items-center justify-between ${selectedEmpId === emp.id ? 'bg-teal-50 border-l-4 border-teal-600' : 'hover:bg-slate-100 border-l-4 border-transparent'}`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-800 text-sm truncate">{emp.name}</div>
                      <div className="text-xs text-slate-500 font-medium truncate">{emp.role}</div>
                    </div>
                  </div>
                  {pendingCount > 0 && (
                    <div className="h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                      {pendingCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: AUDIT FILE */}
        <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
          {!selectedEmp ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <FileText className="h-16 w-16 opacity-20" />
              <p className="text-lg font-medium text-slate-500">Select an employee to reconcile their pay</p>
            </div>
          ) : (
            <>
              {/* AUDIT HEADER */}
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedEmp.name}</h2>
                  <div className="text-sm font-semibold text-slate-500 flex items-center mt-1">
                    Pay Rate: {isSalaried ? `$${(Number(selectedEmp.annualSalary)||0).toLocaleString()}/yr` : selectedEmp.payType === 'hourly' ? `$${selectedEmp.hourlyWage}/hr` : `$${selectedEmp.perVisitRate}/visit`}
                  </div>
                </div>
                <div className="text-right bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl shadow-sm">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Total Approved Payout</div>
                  <div className="text-3xl font-black text-emerald-600">${grandTotalOwed.toFixed(2)}</div>
                </div>
              </div>

              {/* DYNAMIC TABS FOR SALARIED VS WAGE */}
              <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide shrink-0 items-center justify-between">
                <div className="flex">
                  <button onClick={() => setActiveTab('shifts')} className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'shifts' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <CalendarDays className="h-4 w-4 mr-2" /> 
                    {isSalaried ? 'Salary' : `Shifts (${empShifts.length})`} &bull; ${approvedShiftsCost.toFixed(2)}
                  </button>
                  
                  {!isSalaried && (
                    <>
                      <button onClick={() => setActiveTab('mileage')} className={`relative py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'mileage' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        <Car className="h-4 w-4 mr-2" /> Mileage ({empMileage.length}) &bull; ${approvedMileageCost.toFixed(2)}
                        {empMileage.filter(e => e.status === 'pending').length > 0 && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500"></span>}
                      </button>
                      <button onClick={() => setActiveTab('oop')} className={`relative py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'oop' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        <Receipt className="h-4 w-4 mr-2" /> Purchases ({empOOP.length}) &bull; ${approvedOOPCost.toFixed(2)}
                        {empOOP.filter(e => e.status === 'pending').length > 0 && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500"></span>}
                      </button>
                    </>
                  )}

                  <button onClick={() => setActiveTab('adjustments')} className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'adjustments' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <DollarSign className="h-4 w-4 mr-2" /> Adjustments ({empAdjs.length + (autoBonusAmount > 0 ? 1 : 0)}) &bull; ${totalAdjustments.toFixed(2)}
                  </button>
                </div>
                
                <div className="pr-4">
                  <button onClick={exportContextualCSV} className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-100 transition shadow-sm whitespace-nowrap shrink-0">
                    <Download className="h-3 w-3 mr-1.5" /> Download CSV
                  </button>
                </div>
              </div>

              {/* AUDIT CONTENT AREA */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                
                {/* 1. SHIFTS / SALARY TAB */}
                {activeTab === 'shifts' && (
                  isSalaried ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-5 rounded-xl border bg-white border-emerald-200 shadow-sm">
                        <div>
                          <div className="font-black text-lg text-slate-800">Bi-Weekly Base Salary</div>
                          <div className="text-sm mt-1 font-medium text-slate-500">Fixed compensation for current pay period</div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600">
                          ${approvedShiftsCost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {empShifts.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No shifts found for this pay period.</p>
                      ) : (
                        empShifts.map(shift => {
                          const isDisputed = localDisputes[shift.id];
                          const cost = getShiftCost(selectedEmp, shift);
                          return (
                            <div key={shift.id} className={`flex items-center justify-between p-4 rounded-xl border transition ${isDisputed ? 'bg-red-50 border-red-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div>
                                <div className={`font-bold text-sm ${isDisputed ? 'text-red-900 line-through' : 'text-slate-800'}`}>
                                  {parseLocalSafe(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {shift.startTime} to {shift.endTime}
                                </div>
                                <div className={`text-xs mt-1 font-medium ${isDisputed ? 'text-red-700' : 'text-slate-500'}`}>
                                  Client: {getClientName(shift.clientId)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-6">
                                <div className={`text-lg font-black ${isDisputed ? 'text-red-400 line-through' : 'text-slate-800'}`}>
                                  ${cost.toFixed(2)}
                                </div>
                                {isDisputed ? (
                                  <button onClick={() => setLocalDisputes(prev => ({...prev, [shift.id]: false}))} className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 transition shadow-sm">
                                    <Undo className="h-3 w-3 mr-1.5" /> Restore
                                  </button>
                                ) : (
                                  <button onClick={() => setLocalDisputes(prev => ({...prev, [shift.id]: true}))} className="flex items-center text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-md hover:bg-red-100 transition shadow-sm">
                                    <XCircle className="h-3 w-3 mr-1.5" /> Dispute
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )
                )}

                {/* 2. MILEAGE TAB */}
                {activeTab === 'mileage' && !isSalaried && (
                  <div className="space-y-3">
                    {empMileage.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No mileage logs found for this pay period.</p>
                    ) : (
                      empMileage.map(exp => (
                        <div key={exp.id} className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition ${exp.status === 'rejected' ? 'bg-red-50 border-red-200' : exp.status === 'approved' ? 'bg-white border-emerald-200' : 'bg-white border-amber-200'}`}>
                          <div>
                            <div className={`font-bold text-sm ${exp.status === 'rejected' ? 'text-red-900 line-through' : 'text-slate-800'}`}>
                              {parseLocalSafe(exp.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className={`text-xs mt-1 font-medium flex items-center ${exp.status === 'rejected' ? 'text-red-700' : 'text-slate-500'}`}>
                              <Heart className="h-3 w-3 mr-1 text-teal-500 shrink-0" /> {getClientName(exp.clientId)}
                            </div>
                            {exp.description && <div className={`text-xs italic mt-1 ${exp.status === 'rejected' ? 'text-red-600' : 'text-slate-400'}`}>"{exp.description}"</div>}
                          </div>
                          
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <div className={`text-lg font-black ${exp.status === 'rejected' ? 'text-red-400 line-through' : 'text-slate-800'}`}>{exp.kilometers} km</div>
                              <div className={`text-xs font-bold ${exp.status === 'rejected' ? 'text-red-400' : 'text-teal-600'}`}>${(Number(exp.kilometers)*0.68).toFixed(2)}</div>
                            </div>
                            
                            <div className="flex items-center justify-end min-w-[100px]">
                              {exp.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => onUpdateExpense(exp.id, 'approved')} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition shadow-sm" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                                  <button onClick={() => onUpdateExpense(exp.id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition shadow-sm" title="Reject"><XCircle className="h-5 w-5" /></button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end space-y-1.5">
                                  {renderStatusBadge(exp.status)}
                                  {exp.status === 'approved' ? (
                                    <button onClick={() => onUpdateExpense(exp.id, 'rejected')} className="flex items-center text-[10px] font-bold text-red-600 hover:text-red-800 transition">
                                      <XCircle className="h-3 w-3 mr-1" /> Dispute
                                    </button>
                                  ) : (
                                    <button onClick={() => onUpdateExpense(exp.id, 'approved')} className="flex items-center text-[10px] font-bold text-slate-500 hover:text-slate-700 transition">
                                      <Undo className="h-3 w-3 mr-1" /> Restore
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. PURCHASES TAB */}
                {activeTab === 'oop' && !isSalaried && (
                  <div className="space-y-3">
                    {empOOP.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No client purchases found for this pay period.</p>
                    ) : (
                      empOOP.map(exp => (
                        <div key={exp.id} className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition ${exp.status === 'rejected' ? 'bg-red-50 border-red-200' : exp.status === 'approved' ? 'bg-white border-emerald-200' : 'bg-white border-amber-200'}`}>
                          <div>
                            <div className={`font-bold text-sm ${exp.status === 'rejected' ? 'text-red-900 line-through' : 'text-slate-800'}`}>
                              {parseLocalSafe(exp.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className={`text-xs mt-1 font-medium flex items-center ${exp.status === 'rejected' ? 'text-red-700' : 'text-slate-500'}`}>
                              <Heart className="h-3 w-3 mr-1 text-teal-500 shrink-0" /> {getClientName(exp.clientId)}
                            </div>
                            {exp.description && <div className={`text-xs italic mt-1 ${exp.status === 'rejected' ? 'text-red-600' : 'text-slate-400'}`}>"{exp.description}"</div>}
                          </div>
                          
                          <div className="flex items-center space-x-6">
                            {exp.receiptUrl ? (
                              <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-md text-xs font-bold transition shadow-sm">
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> View Receipt
                              </a>
                            ) : (
                              <span className="flex items-center px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-md text-xs font-medium cursor-not-allowed">
                                <FileText className="h-3.5 w-3.5 mr-1.5 opacity-50" /> No Receipt
                              </span>
                            )}
                            
                            <div className={`text-lg font-black w-20 text-right ${exp.status === 'rejected' ? 'text-red-400 line-through' : 'text-slate-800'}`}>
                              ${Number(exp.amount).toFixed(2)}
                            </div>
                            
                            <div className="flex items-center justify-end min-w-[100px]">
                              {exp.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => onUpdateClientExpense(exp.id, 'approved')} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition shadow-sm" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                                  <button onClick={() => onUpdateClientExpense(exp.id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition shadow-sm" title="Reject"><XCircle className="h-5 w-5" /></button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end space-y-1.5">
                                  {renderStatusBadge(exp.status)}
                                  {exp.status === 'approved' ? (
                                    <button onClick={() => onUpdateClientExpense(exp.id, 'rejected')} className="flex items-center text-[10px] font-bold text-red-600 hover:text-red-800 transition">
                                      <XCircle className="h-3 w-3 mr-1" /> Dispute
                                    </button>
                                  ) : (
                                    <button onClick={() => onUpdateClientExpense(exp.id, 'approved')} className="flex items-center text-[10px] font-bold text-slate-500 hover:text-slate-700 transition">
                                      <Undo className="h-3 w-3 mr-1" /> Restore
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. MANUAL ADJUSTMENTS TAB */}
                {activeTab === 'adjustments' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center"><Plus className="h-4 w-4 mr-1 text-teal-600"/> Add Funds or Deductions</h3>
                      <form onSubmit={handleAddAdjustment} className="flex flex-col sm:flex-row gap-3 items-start">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                          <input type="text" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} placeholder="e.g. Performance Bonus, Uniform Deduction" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                        </div>
                        <div className="w-full sm:w-32 shrink-0">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount ($) *</label>
                          <input type="number" step="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder="e.g. 50 or -20" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 font-bold text-slate-800 text-sm" required />
                        </div>
                        <div className="w-full sm:w-auto self-end">
                          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-md shadow-sm transition text-sm whitespace-nowrap">
                            Add to Tracker
                          </button>
                        </div>
                      </form>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Use a negative number (e.g., -25) to deduct from total pay.</p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Logged Adjustments for this Period</h3>
                      
                      {autoBonusAmount > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-amber-50 border-amber-200">
                          <div>
                            <div className="font-bold text-sm text-amber-900 flex items-center"><Award className="h-4 w-4 mr-1"/> Performance Bonus</div>
                            <div className="text-xs text-amber-700 mt-1 font-medium">System Generated - Auto-applied for this period</div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-black text-amber-600">
                              +${autoBonusAmount.toFixed(2)}
                            </div>
                            <div className="w-7"></div> {/* Spacer to align with the trash icons below */}
                          </div>
                        </div>
                      )}

                      {empAdjs.length === 0 && autoBonusAmount === 0 ? (
                        <p className="text-slate-500 italic text-sm py-4">No manual adjustments made this period.</p>
                      ) : (
                        empAdjs.map(adj => (
                          <div key={adj.id} className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${adj.amount < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div>
                              <div className={`font-bold text-sm ${adj.amount < 0 ? 'text-rose-900' : 'text-emerald-900'}`}>{adj.description}</div>
                              <div className="text-xs text-slate-500 mt-1 font-medium">{parseLocalSafe(adj.date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className={`text-lg font-black ${adj.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {adj.amount > 0 ? '+' : ''}{adj.amount.toFixed(2)}
                              </div>
                              <button onClick={() => handleRemoveAdjustment(adj.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded transition">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
