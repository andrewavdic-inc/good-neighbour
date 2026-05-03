import React, { useState, useMemo } from 'react';
import { Receipt, Car, CheckCircle, XCircle, Search, FileText, User, Heart, Filter, DollarSign, CalendarDays, Plus, Trash2, Undo, AlertCircle } from 'lucide-react';

export default function ExpenseManager({ 
  shifts = [], expenses = [], clientExpenses = [], employees = [], clients = [], 
  onUpdateExpense, onUpdateClientExpense 
}) {
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [activeTab, setActiveTab] = useState('shifts');
  const [auditMonth, setAuditMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state to handle instant UI updates for the new features
  const [localDisputes, setLocalDisputes] = useState({});
  const [manualAdjustments, setManualAdjustments] = useState([]);
  const [adjDesc, setAdjDesc] = useState('');
  const [adjAmount, setAdjAmount] = useState('');

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const getClientName = (id) => safeClients.find(c => c.id === id)?.name || 'Unknown Client';

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

  // --- EMPLOYEE SPECIFIC DATA ---
  const empShifts = useMemo(() => safeShifts.filter(s => s.employeeId === selectedEmpId && s.date?.startsWith(auditMonth)).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeShifts, selectedEmpId, auditMonth]);
  const empMileage = useMemo(() => safeExpenses.filter(e => e.employeeId === selectedEmpId && e.date?.startsWith(auditMonth)).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeExpenses, selectedEmpId, auditMonth]);
  const empOOP = useMemo(() => safeClientExpenses.filter(e => e.employeeId === selectedEmpId && e.date?.startsWith(auditMonth)).sort((a,b) => new Date(b.date) - new Date(a.date)), [safeClientExpenses, selectedEmpId, auditMonth]);
  const empAdjs = manualAdjustments.filter(a => a.employeeId === selectedEmpId && a.month === auditMonth);

  // --- LIVE TOTAL CALCULATIONS ---
  const approvedShiftsCost = empShifts.reduce((sum, s) => sum + (localDisputes[s.id] ? 0 : getShiftCost(selectedEmp, s)), 0);
  const approvedMileageCost = empMileage.reduce((sum, e) => sum + (e.status === 'approved' ? Number(e.kilometers || 0) * 0.68 : 0), 0);
  const approvedOOPCost = empOOP.reduce((sum, e) => sum + (e.status === 'approved' ? Number(e.amount || 0) : 0), 0);
  const totalAdjustments = empAdjs.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  
  const grandTotalOwed = approvedShiftsCost + approvedMileageCost + approvedOOPCost + totalAdjustments;

  const handleAddAdjustment = (e) => {
    e.preventDefault();
    if (!adjDesc || !adjAmount) return;
    const newAdj = {
      id: `adj_${Date.now()}`,
      employeeId: selectedEmpId,
      date: new Date().toISOString().split('T')[0],
      month: auditMonth,
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
      
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center">
          <Receipt className="h-6 w-6 mr-3 text-teal-400" />
          <div>
            <h2 className="text-lg font-bold">Payroll Reconciliation Hub</h2>
            <p className="text-xs text-slate-400 font-medium">Audit employee records line-by-line</p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-teal-500 transition">
          <Filter className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="month"
            value={auditMonth}
            onChange={(e) => setAuditMonth(e.target.value)}
            className="block w-full text-slate-200 focus:outline-none text-sm bg-transparent font-bold"
            title="Filter by Month"
          />
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
              const pendingCount = 
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
                    Pay Rate: {selectedEmp.payType === 'hourly' ? `$${selectedEmp.hourlyWage}/hr` : selectedEmp.payType === 'salary' ? 'Salaried' : `$${selectedEmp.perVisitRate}/visit`}
                  </div>
                </div>
                <div className="text-right bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl shadow-sm">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Total Approved Payout</div>
                  <div className="text-3xl font-black text-emerald-600">${grandTotalOwed.toFixed(2)}</div>
                </div>
              </div>

              {/* TABS */}
              <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide shrink-0">
                <button onClick={() => setActiveTab('shifts')} className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'shifts' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <CalendarDays className="h-4 w-4 mr-2" /> Shifts ({empShifts.length})
                </button>
                <button onClick={() => setActiveTab('mileage')} className={`relative py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'mileage' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Car className="h-4 w-4 mr-2" /> Mileage 
                  {empMileage.filter(e => e.status === 'pending').length > 0 && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500"></span>}
                </button>
                <button onClick={() => setActiveTab('oop')} className={`relative py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'oop' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Receipt className="h-4 w-4 mr-2" /> Purchases
                  {empOOP.filter(e => e.status === 'pending').length > 0 && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500"></span>}
                </button>
                <button onClick={() => setActiveTab('adjustments')} className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center whitespace-nowrap ${activeTab === 'adjustments' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <DollarSign className="h-4 w-4 mr-2" /> Adjustments ({empAdjs.length})
                </button>
              </div>

              {/* AUDIT CONTENT AREA */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                
                {/* 1. SHIFTS TAB */}
                {activeTab === 'shifts' && (
                  <div className="space-y-3">
                    {empShifts.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No shifts found for this month.</p>
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
                )}

                {/* 2. MILEAGE TAB */}
                {activeTab === 'mileage' && (
                  <div className="space-y-3">
                    {empMileage.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No mileage logs found for this month.</p>
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
                            
                            <div className="flex items-center justify-end w-24">
                              {exp.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => onUpdateExpense(exp.id, 'approved')} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition shadow-sm" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                                  <button onClick={() => onUpdateExpense(exp.id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition shadow-sm" title="Reject"><XCircle className="h-5 w-5" /></button>
                                </div>
                              ) : (
                                renderStatusBadge(exp.status)
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. PURCHASES TAB */}
                {activeTab === 'oop' && (
                  <div className="space-y-3">
                    {empOOP.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No client purchases found for this month.</p>
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
                            
                            <div className="flex items-center justify-end w-24">
                              {exp.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => onUpdateClientExpense(exp.id, 'approved')} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition shadow-sm" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                                  <button onClick={() => onUpdateClientExpense(exp.id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition shadow-sm" title="Reject"><XCircle className="h-5 w-5" /></button>
                                </div>
                              ) : (
                                renderStatusBadge(exp.status)
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
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Logged Adjustments for this Month</h3>
                      {empAdjs.length === 0 ? (
                        <p className="text-slate-500 italic text-sm py-4">No manual adjustments made this month.</p>
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
