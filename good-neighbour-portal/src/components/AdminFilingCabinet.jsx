import React, { useState, useMemo } from 'react';
import { 
  Archive, Receipt, Download, Plus, Filter, CircleDollarSign, 
  CheckCircle, Loader2, Info, AlertTriangle, FileCheck, Upload, 
  Folder, XCircle, BookOpen, Trash2, Image as ImageIcon 
} from 'lucide-react';

// --- DATE HELPERS ---
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

// --- STANDARDIZED CATEGORIES ---
const EXPENSE_CATEGORIES = [
  "Personnel and Payroll (Salaries, Benefits, Payroll Tax, Education)",
  "General Admin & Office Costs (Office Supplies, Software, Telecomm, Shipping)",
  "Occupancy and Facilities (Rent, Utilities, Maintenance)",
  "Professional Services (Legal & Accounting Fees, Licenses and Dues)",
  "Other (Travel, Meals, Insurance, Bank Fees)"
];

const CABINET_CATEGORIES = [
  { id: "Legal and Formation Documents", hint: "Articles of Incorporation, Operating Agreements, Shareholder Agreements, Partnership Agreements" },
  { id: "Financial Records", hint: "Returns and Filings, Statements, Banking, Payroll Records, Transactional" },
  { id: "Intellectual Property (IP) and Proprietary Information", hint: "Technical Data, Trademarks, Patents, Copyrights, NDA" },
  { id: "Operational and Strategic Documents", hint: "Minutes, Policies Reports, Analysis, Plans" },
  { id: "Personnel and Employment Records", hint: "Contracts, Performance Assessments, Payroll Records" },
  { id: "Corporate Governance", hint: "Stock Ledgers/Ownership Records, Board Resolutions" }
];

export default function AdminFilingCabinet({
  cabinetTab, setCabinetTab, currentUser, isMasterAdmin, employees = [], clients = [],
  businessExpenses = [], onAddBusinessExpense, onRemoveBusinessExpense,
  cabinetDocuments = [], onAddCabinetDocument, onRemoveCabinetDocument,
  payPeriodStart, shifts = [], expenses = [], clientExpenses = [], 
  isBonusActive, bonusSettings, kudos = [], payrollLogs = [], onFinalizePayroll, 
  needsPayrollAlert, paydayStr, startStr
}) {

  // --- FILTERED STAFF ---
  const safeEmployees = Array.isArray(employees) ? employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin') : [];
  const isPayrollFinalized = (payrollLogs || []).some(log => log.payoutDate === paydayStr);

  // --- BUSINESS EXPENSE STATE ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expDescription, setExpDescription] = useState('');
  const [expFile, setExpFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expFilterCategory, setExpFilterCategory] = useState('All');
  const [expFilterMonth, setExpFilterMonth] = useState('');
  const [expSort, setExpSort] = useState('desc');

  // --- CABINET STATE ---
  const [cabDocTitle, setCabDocTitle] = useState('');
  const [cabDocCategory, setCabDocCategory] = useState(CABINET_CATEGORIES[0].id);
  const [cabDocFile, setCabDocFile] = useState(null);
  const [isCabDocUploading, setIsCabDocUploading] = useState(false);
  const [cabFilterCategory, setCabFilterCategory] = useState('All');
  const [cabFilterMonth, setCabFilterMonth] = useState('');
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);

  // --- PAYROLL STATE ---
  const [payrollForms, setPayrollForms] = useState({});
  const [isPayrollFinalizing, setIsPayrollFinalizing] = useState(false);
  const [payrollHistoryMonth, setPayrollHistoryMonth] = useState('');

  // --- DERIVED EXPENSE DATA ---
  const filteredAndSortedExpenses = useMemo(() => {
    return businessExpenses
      .filter(exp => expFilterCategory === 'All' || exp.category === expFilterCategory)
      .filter(exp => !expFilterMonth || (exp.date && exp.date.startsWith(expFilterMonth)))
      .sort((a, b) => {
        const diff = new Date(b.date) - new Date(a.date);
        return expSort === 'desc' ? diff : -diff;
      });
  }, [businessExpenses, expFilterCategory, expFilterMonth, expSort]);

  const currentLedgerTotal = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  }, [filteredAndSortedExpenses]);

  // --- DERIVED CABINET DATA ---
  const safeCabinetDocs = Array.isArray(cabinetDocuments) ? cabinetDocuments : [];
  const filteredCabinetDocs = useMemo(() => {
    return safeCabinetDocs.filter(doc => {
      if (cabFilterCategory !== 'All' && doc.category !== cabFilterCategory) return false;
      if (cabFilterMonth && doc.uploadDate && !doc.uploadDate.startsWith(cabFilterMonth)) return false;
      return true;
    }).sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate)); 
  }, [safeCabinetDocs, cabFilterCategory, cabFilterMonth]);


  // --- EXPENSE HANDLERS ---
  const handleSaveExpense = async (e) => { 
    e.preventDefault(); 
    if (!expAmount || !expDate) return; 
    setIsUploading(true); 
    await onAddBusinessExpense({ 
      date: expDate, 
      amount: Number(expAmount), 
      category: expCategory, 
      description: expDescription, 
      loggedBy: currentUser.id 
    }, expFile); 
    setIsUploading(false); 
    setIsExpenseModalOpen(false); 
    setExpAmount(''); setExpDescription(''); setExpFile(null); 
  };

  const exportBusinessExpenses = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount ($)', 'Logged By'];
    const rows = filteredAndSortedExpenses.map(exp => {
      const emp = employees.find(e => e.id === exp.loggedBy);
      return [
        exp.date,
        `"${exp.category}"`,
        `"${exp.description || ''}"`,
        Number(exp.amount || 0).toFixed(2),
        `"${emp?.name || 'Admin'}"`
      ];
    });

    rows.push(['', '', '', '', '']); 
    rows.push(['', '', '"TOTAL SPENT:"', currentLedgerTotal.toFixed(2), '']);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const timeFrame = expFilterMonth ? expFilterMonth : 'All_Time';
    link.setAttribute('download', `Company_Expenses_Export_${timeFrame}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CABINET HANDLERS ---
  const handleSaveCabinetDocument = async (e) => { 
    e.preventDefault(); 
    if (!cabDocTitle || !cabDocFile || !cabDocCategory) return; 
    setIsCabDocUploading(true); 
    await onAddCabinetDocument({ 
      title: cabDocTitle, 
      category: cabDocCategory,
      fileName: cabDocFile.name, 
      uploadDate: new Date().toISOString() 
    }, cabDocFile); 
    setIsCabDocUploading(false); 
    setCabDocTitle(''); 
    setCabDocFile(null); 
    setCabDocCategory(CABINET_CATEGORIES[0].id);
  };

  // --- PAYROLL CALCULATION ENGINE ---
  const getMonthlyLeaderboard = (year, month) => {
    const start = new Date(year, month, 1); 
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    let results = safeEmployees.map(emp => { 
        const empShifts = shifts.filter(s => {
            if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
            const shiftDate = new Date(`${s.date}T${s.endTime}`);
            return shiftDate >= start && shiftDate <= end;
        });
        let activityScore = 0;
        empShifts.forEach(s => {
            activityScore += 100;
            if (expenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved')) activityScore += 50;
            if (clientExpenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved')) activityScore += 50;
        });
        const kPoints = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date) >= start && parseLocalSafe(k.date) <= end).reduce((sum, k) => sum + Number(k.points || 0), 0);
        return { emp, shiftCount: empShifts.length, activityScore: activityScore + kPoints };
    });
    return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.activityScore - a.activityScore);
  };

  const getSystemGross = (emp) => {
    const empShifts = shifts.filter(s => s.employeeId === emp.id && s.date >= startStr && s.date <= paydayStr);
    let shiftPay = 0;
    if (emp.payType === 'salary') {
      shiftPay = (Number(emp.annualSalary) || 0) / 26;
    } else if (emp.payType === 'hourly') {
      let hrs = 0;
      empShifts.forEach(s => {
        const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
        if (!isNaN(sH) && !isNaN(eH)) {
          let h = (eH + eM/60) - (sH + sM/60);
          if (h < 0) h += 24;
          hrs += h;
        }
      });
      shiftPay = hrs * (Number(emp.hourlyWage) || 22.5);
    } else {
      shiftPay = empShifts.length * (Number(emp.perVisitRate) || 45);
    }

    const kmPay = expenses.filter(e => e.employeeId === emp.id && e.status === 'approved' && e.date >= startStr && e.date <= paydayStr).reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
    const oopPay = clientExpenses.filter(e => e.employeeId === emp.id && e.status === 'approved' && e.date >= startStr && e.date <= paydayStr).reduce((sum, e) => sum + (Number(e.amount || 0)), 0);

    let bonusEarnings = 0;
    if (isBonusActive) {
      const now = new Date();
      const lb = getMonthlyLeaderboard(now.getFullYear(), now.getMonth());
      if (lb[0]?.emp?.id === emp.id) bonusEarnings = Number(bonusSettings?.monthly[0] || 0); 
      else if (lb[1]?.emp?.id === emp.id) bonusEarnings = Number(bonusSettings?.monthly[1] || 0); 
      else if (lb[2]?.emp?.id === emp.id) bonusEarnings = Number(bonusSettings?.monthly[2] || 0);
    }

    return shiftPay + kmPay + oopPay + bonusEarnings;
  };

  const handlePayrollFormChange = (empId, field, value) => {
    setPayrollForms(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [field]: value }
    }));
  };

  const handleFinalizeAndArchive = async () => {
    if (!window.confirm(`Are you sure you want to finalize payroll for the period ending ${paydayStr}?\n\nThis will lock the ledger and distribute attached paystubs to employees.`)) return;
    
    setIsPayrollFinalizing(true);
    const records = {};
    const paystubFiles = {};
    let totalGross = 0;
    let totalNet = 0;

    safeEmployees.forEach(emp => {
      const form = payrollForms[emp.id] || {};
      const sys = getSystemGross(emp);
      const acc = Number(form.accGross || 0);
      const net = Number(form.netPay || 0);
      
      records[emp.id] = {
        name: emp.name,
        role: emp.role,
        systemGross: sys,
        accountantGross: acc,
        netPay: net
      };
      
      if (form.paystubFile) {
        paystubFiles[emp.id] = form.paystubFile;
      }
      
      totalGross += acc;
      totalNet += net;
    });

    const payrollData = {
      payoutDate: paydayStr,
      periodStart: startStr,
      periodEnd: paydayStr,
      totalGross,
      totalNet,
      records
    };

    await onFinalizePayroll(payrollData, paystubFiles);
    setIsPayrollFinalizing(false);
    setPayrollForms({});
    alert("Payroll finalized and archived successfully!");
  };

  const exportPayrollCSV = (log) => {
    const headers = ['Employee', 'Role', 'System Gross ($)', 'Accountant Gross ($)', 'Actual Net Pay ($)'];
    const rows = Object.values(log.records || {}).map(r => [
      `"${r.name}"`,
      `"${r.role}"`,
      Number(r.systemGross).toFixed(2),
      Number(r.accountantGross).toFixed(2),
      Number(r.netPay).toFixed(2)
    ]);
    
    rows.push(['', '', '', '', '']);
    rows.push(['"TOTAL COMPANY PAYOUT"', '', '', Number(log.totalGross).toFixed(2), Number(log.totalNet).toFixed(2)]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payroll_Ledger_${log.payoutDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-end justify-between mb-4 gap-4">
        <div className="flex items-center text-2xl font-black text-slate-800 shrink-0">
          <Archive className="h-8 w-8 mr-3 text-slate-800" />
          The Filing Cabinet
        </div>
        <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setCabinetTab('expenses')} 
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Company Ledger
          </button>
          
          <button 
            onClick={() => setCabinetTab('payroll')} 
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'payroll' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'} relative`}
          >
            Payroll & Earnings
            {needsPayrollAlert && <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-400 rounded-full animate-pulse border border-white"></span>}
          </button>

          {isMasterAdmin && (
            <button 
              onClick={() => setCabinetTab('documents')} 
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'documents' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Private Documents
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden min-h-[500px] relative">
        
        {/* TAB 1: SHARED EXPENSE LEDGER */}
        {cabinetTab === 'expenses' && (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-teal-600" />
                Internal Business Expenses
              </h2>
              <div className="flex space-x-2 w-full sm:w-auto">
                <button onClick={exportBusinessExpenses} className="flex-1 sm:flex-none text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center justify-center">
                  <Download className="h-3 w-3 mr-1" /> Export CSV
                </button>
                <button onClick={() => setIsExpenseModalOpen(true)} className="flex-1 sm:flex-none text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center justify-center">
                  <Plus className="h-3 w-3 mr-1" /> Log Bill
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200 gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
                <div className="flex items-center bg-white border border-slate-300 rounded px-2 py-1 focus-within:ring-1 focus-within:ring-teal-500 transition shrink-0">
                  <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
                  <input type="month" value={expFilterMonth} onChange={(e) => setExpFilterMonth(e.target.value)} className="text-xs border-none focus:outline-none text-slate-600 bg-transparent w-32" title="Filter by Month" />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select value={expFilterCategory} onChange={e => setExpFilterCategory(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-teal-500 bg-white text-slate-700 w-full sm:w-auto font-medium">
                    <option value="All">All Categories</option>
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setExpSort(s => s === 'desc' ? 'asc' : 'desc')} className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded transition hover:bg-slate-50 w-full lg:w-auto shadow-sm">
                Sort: {expSort === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>
            </div>

            <div className="px-6 py-3 bg-emerald-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm z-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 sm:mb-0">
                {expFilterCategory === 'All' ? 'Total Spent (All Categories)' : `Total Spent (${expFilterCategory})`}
              </span>
              <span className="text-2xl font-black text-emerald-700">
                ${currentLedgerTotal.toFixed(2)}
              </span>
            </div>
            
            <div className="p-0 flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {filteredAndSortedExpenses.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">No expenses found matching the current filters.</div>
                ) : (
                  filteredAndSortedExpenses.map(exp => {
                    const emp = employees.find(e => e.id === exp.loggedBy);
                    return (
                      <div key={exp.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between group gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center text-sm">
                              {exp.category}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {exp.date} &bull; Logged by {emp?.name || 'Admin'}
                            </div>
                            {exp.description && <div className="text-xs text-slate-600 italic mt-1">"{exp.description}"</div>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 self-end md:self-auto">
                          <div className="text-lg font-black text-slate-800">${Number(exp.amount).toFixed(2)}</div>
                          <div className="flex flex-col space-y-1">
                            {exp.receiptUrl && (
                              <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-2 py-1 rounded font-semibold text-center transition border border-teal-200">
                                Receipt
                              </a>
                            )}
                            <button onClick={() => { if(window.confirm('Delete this expense?')) onRemoveBusinessExpense(exp.id); }} className="text-xs text-slate-400 hover:text-red-600 transition text-right">Delete</button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYROLL LEDGER */}
        {cabinetTab === 'payroll' && (
           <div className="flex flex-col h-full bg-emerald-50/20">
              <div className="px-6 py-4 border-b border-slate-200 bg-emerald-800 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center"><CircleDollarSign className="h-5 w-5 mr-2 text-emerald-300" /> Payroll Processing Ledger</h2>
                  <p className="text-xs text-emerald-200 mt-1">Current Period: {startStr} to {paydayStr}</p>
                </div>
                {isPayrollFinalized ? (
                   <div className="bg-emerald-700 text-emerald-100 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-inner border border-emerald-600">
                     <CheckCircle className="h-4 w-4 mr-1.5" /> Period Finalized
                   </div>
                ) : (
                   <button 
                     onClick={handleFinalizeAndArchive}
                     disabled={isPayrollFinalizing}
                     className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold px-4 py-2 rounded-md text-sm transition shadow-sm flex items-center"
                   >
                     {isPayrollFinalizing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Archiving...</> : <><Archive className="h-4 w-4 mr-2"/> Finalize & Archive</>}
                   </button>
                )}
              </div>

              {!isPayrollFinalized && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-4 flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                    <Info className="h-5 w-5 text-blue-600 mr-3 shrink-0" />
                    <p className="text-sm text-blue-900 leading-relaxed font-medium">
                      <strong>Dual-Input Verification:</strong> Type the Gross amount provided by the accountant to verify it matches the system's tracked Gross. Attach the paystub PDF, and it will be sent directly to the employee's personal tab upon finalization.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {safeEmployees.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No active employees found for payroll.</div>
                    ) : (
                      safeEmployees.map(emp => {
                        const sysGross = getSystemGross(emp);
                        const form = payrollForms[emp.id] || { accGross: '', netPay: '', paystubFile: null };
                        
                        const isGrossMatch = form.accGross !== '' && Math.abs(Number(form.accGross) - sysGross) <= 0.02;
                        const isGrossMismatch = form.accGross !== '' && !isGrossMatch;

                        return (
                          <div key={emp.id} className={`p-5 bg-white border rounded-xl shadow-sm transition ${isGrossMatch ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              
                              <div className="w-full lg:w-1/4">
                                <div className="font-bold text-slate-800 text-lg">{emp.name}</div>
                                <div className="text-xs text-slate-500 font-medium">{emp.role}</div>
                                <div className="mt-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                                  System Gross: <span className="font-black text-slate-800">${sysGross.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    Accountant's Gross
                                    {isGrossMatch && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                    {isGrossMismatch && <AlertTriangle className="h-4 w-4 text-amber-500" title="Does not match system calculation" />}
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 sm:text-sm">$</span></div>
                                    <input 
                                      type="number" min="0" step="0.01" 
                                      value={form.accGross} 
                                      onChange={(e) => handlePayrollFormChange(emp.id, 'accGross', e.target.value)} 
                                      className={`block w-full pl-7 pr-3 py-2 border rounded-md text-sm focus:outline-none font-bold ${isGrossMatch ? 'bg-emerald-50 border-emerald-300 text-emerald-900 focus:ring-emerald-500' : isGrossMismatch ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-500' : 'border-slate-300 focus:ring-teal-500'}`} 
                                      placeholder="0.00" 
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Final Net Payout</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 sm:text-sm">$</span></div>
                                    <input 
                                      type="number" min="0" step="0.01" 
                                      value={form.netPay} 
                                      onChange={(e) => handlePayrollFormChange(emp.id, 'netPay', e.target.value)} 
                                      className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-teal-500 font-bold text-slate-900" 
                                      placeholder="0.00" 
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Attach Paystub PDF</label>
                                  <div className={`flex justify-center px-3 py-1.5 border-2 border-slate-300 border-dashed rounded-md bg-slate-50 transition cursor-pointer hover:bg-slate-100 h-[38px]`} onClick={() => document.getElementById(`ps-upload-${emp.id}`).click()}>
                                    <div className="text-center text-xs font-bold text-teal-600 truncate flex items-center h-full">
                                      {form.paystubFile ? <><FileCheck className="h-4 w-4 mr-1.5 text-emerald-600"/>{form.paystubFile.name}</> : <><Upload className="h-3 w-3 mr-1.5"/> Select PDF</>}
                                    </div>
                                    <input id={`ps-upload-${emp.id}`} type="file" accept=".pdf" className="sr-only" onChange={(e) => handlePayrollFormChange(emp.id, 'paystubFile', e.target.files[0])} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {isPayrollFinalized && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-emerald-50/50">
                  <CheckCircle className="h-16 w-16 text-emerald-400 mb-4" />
                  <h3 className="text-2xl font-black text-slate-800">Payroll is Complete</h3>
                  <p className="text-slate-500 mt-2 max-w-md">The active period has been locked and archived. Paystubs have been distributed to the employee portals.</p>
                </div>
              )}

              {/* HISTORICAL PAYROLL LEDGER */}
              <div className="border-t border-slate-200 bg-slate-100 flex flex-col max-h-[350px]">
                <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-200/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><Archive className="h-4 w-4 mr-2"/> Payroll History</span>
                  <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition">
                    <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
                    <input type="month" value={payrollHistoryMonth} onChange={(e) => setPayrollHistoryMonth(e.target.value)} className="text-xs py-1 border-none focus:outline-none text-slate-600 bg-transparent w-32" title="Filter by Month" />
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                  {payrollLogs.filter(log => !payrollHistoryMonth || log.payoutDate.startsWith(payrollHistoryMonth)).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm font-medium italic">No historical payroll records found.</div>
                  ) : (
                    payrollLogs.filter(log => !payrollHistoryMonth || log.payoutDate.startsWith(payrollHistoryMonth))
                    .sort((a,b) => new Date(b.payoutDate) - new Date(a.payoutDate))
                    .map(log => (
                      <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-teal-300 transition">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shrink-0 group-hover:bg-teal-50 group-hover:text-teal-600 transition">
                            <Archive className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">Period Ending: {log.payoutDate}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">Processed {new Date(log.dateProcessed).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Gross</div>
                            <div className="font-bold text-slate-700">${Number(log.totalGross).toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Net Pay</div>
                            <div className="font-black text-emerald-700">${Number(log.totalNet).toFixed(2)}</div>
                          </div>
                          <button onClick={() => exportPayrollCSV(log)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded transition flex items-center" title="Export Ledger to CSV">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
           </div>
        )}

        {/* TAB 3: PRIVATE COMPANY DOCUMENTS */}
        {cabinetTab === 'documents' && isMasterAdmin && (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Folder className="h-5 w-5 mr-2 text-teal-600" />
                Private Company Documents
              </h2>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-b border-slate-200">
              <form onSubmit={handleSaveCabinetDocument} className="flex flex-col lg:flex-row gap-4 items-start">
                
                <div className="w-full lg:w-1/3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select 
                    value={cabDocCategory} 
                    onChange={(e) => setCabDocCategory(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-semibold text-slate-700" 
                    required 
                    disabled={isCabDocUploading}
                  >
                    {CABINET_CATEGORIES.map(cat => <option key={`up_${cat.id}`} value={cat.id}>{cat.id}</option>)}
                  </select>
                  <div className="mt-1.5 text-[10px] text-teal-700 italic leading-tight px-1 flex items-start">
                    <Info className="h-3 w-3 mr-1 shrink-0 mt-0.5" />
                    <span>{CABINET_CATEGORIES.find(c => c.id === cabDocCategory)?.hint}</span>
                  </div>
                </div>

                <div className="w-full lg:w-1/3 pb-[18px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label>
                  <input type="text" value={cabDocTitle} onChange={(e) => setCabDocTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required disabled={isCabDocUploading} placeholder="e.g. 2026 Tax Return" />
                </div>
                <div className="w-full lg:w-1/4 pb-[18px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                  <div className={`flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md bg-white transition ${isCabDocUploading ? 'opacity-50' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isCabDocUploading && document.getElementById('cab-doc-upload').click()}>
                    <div className="text-center text-sm font-medium text-teal-600 truncate">
                      {cabDocFile ? cabDocFile.name : 'Select File'}
                    </div>
                    <input id="cab-doc-upload" type="file" accept=".pdf,image/*,.doc,.docx" className="sr-only" onChange={(e) => setCabDocFile(e.target.files[0])} disabled={isCabDocUploading} />
                  </div>
                </div>
                <div className="w-full lg:w-fit pb-[18px] shrink-0">
                  <button type="submit" disabled={isCabDocUploading || !cabDocTitle || !cabDocFile} className="w-full lg:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center transition shadow-sm text-sm">
                    {isCabDocUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : <><Plus className="h-4 w-4 mr-2"/> File Document</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200 gap-3">
              <div className="flex items-center w-full sm:w-auto">
                <div className="relative shrink-0 mr-3 flex items-center">
                  <button 
                    onClick={() => setIsCategoryGuideOpen(!isCategoryGuideOpen)} 
                    className={`p-1 rounded-full transition ${isCategoryGuideOpen ? 'bg-slate-200 text-teal-700' : 'text-slate-500 hover:bg-slate-200'}`}
                    title="Category Guide"
                  >
                    <Info className="h-5 w-5 cursor-pointer" />
                  </button>
                  
                  {isCategoryGuideOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-80 max-h-64 overflow-y-auto p-4 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50">
                      <div className="flex justify-between items-center mb-3 border-b border-slate-600 pb-2">
                        <div className="font-bold text-teal-300 text-sm">Category Guide</div>
                        <button onClick={() => setIsCategoryGuideOpen(false)} className="text-slate-400 hover:text-white transition">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {CABINET_CATEGORIES.map(cat => (
                          <div key={`tip_${cat.id}`}>
                            <span className="font-bold text-slate-100 block mb-0.5">{cat.id}</span>
                            <span className="text-slate-400 leading-tight block">{cat.hint}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 overflow-x-auto scrollbar-hide flex-1 py-1">
                  <button onClick={() => setCabFilterCategory('All')} className={`text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap ${cabFilterCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}>All</button>
                  {CABINET_CATEGORIES.map(cat => (
                    <button key={`filter_${cat.id}`} onClick={() => setCabFilterCategory(cat.id)} className={`text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap ${cabFilterCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}>{cat.id}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center bg-white border border-slate-300 rounded px-2 focus-within:ring-1 focus-within:ring-teal-500 transition shrink-0">
                <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
                <input type="month" value={cabFilterMonth} onChange={(e) => setCabFilterMonth(e.target.value)} className="text-xs py-1.5 border-none focus:outline-none text-slate-600 bg-transparent w-32" title="Filter by Month" />
              </div>
            </div>

            <div className="p-6 bg-white flex-1 overflow-y-auto">
              {filteredCabinetDocs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No documents found matching the current filters.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCabinetDocs.map(doc => (
                    <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-slate-50 group">
                      <div className="flex items-center space-x-4 overflow-hidden pr-4">
                        <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center mb-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[200px]">{doc.category || 'Uncategorized'}</span>
                          </div>
                          <h3 className="font-bold text-slate-800 truncate leading-tight mt-1">{doc.title}</h3>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                            {doc.fileName} &bull; {new Date(doc.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <a href={doc.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:bg-teal-50 p-2 rounded transition inline-flex" title="Download/View">
                          <Download className="h-5 w-5" />
                        </a>
                        <button onClick={() => { if(window.confirm(`Delete "${doc.title}" permanently?`)) onRemoveCabinetDocument(doc.id); }} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition ml-1" title="Delete">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* --- BUSINESS EXPENSE MODAL --- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-teal-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><Receipt className="h-5 w-5 mr-2"/> Log Internal Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} disabled={isUploading} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" disabled={isUploading} value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($) *</label>
                  <input type="number" disabled={isUploading} min="0.01" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-bold text-slate-800" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select disabled={isUploading} value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-medium">
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" disabled={isUploading} value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="e.g. Printer ink" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload Receipt Image (Optional)</label>
                <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('biz-receipt-upload').click()}>
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                    <div className="flex text-xs text-slate-600 justify-center">
                      <span className="relative font-medium text-teal-600">{expFile ? expFile.name : <span>Attach receipt</span>}</span>
                    </div>
                  </div>
                  <input disabled={isUploading} id="biz-receipt-upload" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setExpFile(e.target.files[0])} />
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" disabled={isUploading} onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex items-center px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-slate-400 transition">
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : 'Save to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
