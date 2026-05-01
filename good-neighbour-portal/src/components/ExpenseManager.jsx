import React, { useState } from 'react';
import { Receipt, Car, CheckCircle, XCircle, Search, FileText, User, Heart, Filter, Download } from 'lucide-react';

export default function ExpenseManager({ expenses = [], clientExpenses = [], employees = [], clients = [], onUpdateExpense, onUpdateClientExpense }) {
  const [activeTab, setActiveTab] = useState('mileage');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); // NEW FILTER STATE

  // Bulletproof arrays
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const getEmpName = (id) => safeEmployees.find(e => e.id === id)?.name || 'Unknown Staff';
  const getClientName = (id) => safeClients.find(c => c.id === id)?.name || 'Unknown Client';

  // Filter and sort data
  const filterData = (data) => {
    return data.filter(item => {
      if (!item) return false;
      
      // 1. Month Filter
      if (filterMonth && item.date && !item.date.startsWith(filterMonth)) return false;

      // 2. Search Filter
      const empMatch = getEmpName(item.employeeId).toLowerCase().includes(searchTerm.toLowerCase());
      const clientMatch = getClientName(item.clientId).toLowerCase().includes(searchTerm.toLowerCase());
      return empMatch || clientMatch;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  };

  const filteredMileage = filterData(safeExpenses);
  const filteredOOP = filterData(safeClientExpenses);

  // --- NATIVE CSV EXPORT LOGIC ---
  const exportToCSV = () => {
    let headers = [];
    let rows = [];
    let filename = '';

    if (activeTab === 'mileage') {
      headers = ['Date', 'Employee', 'Client', 'Description', 'Kilometers', 'Payout ($)', 'Status'];
      rows = filteredMileage.map(exp => [
        exp.date,
        `"${getEmpName(exp.employeeId)}"`,
        `"${getClientName(exp.clientId)}"`,
        `"${exp.description || ''}"`,
        exp.kilometers,
        (Number(exp.kilometers) * 0.68).toFixed(2),
        exp.status
      ]);
      filename = `Mileage_Logs${filterMonth ? `_${filterMonth}` : ''}.csv`;
    } else {
      headers = ['Date', 'Employee', 'Client', 'Description', 'Amount ($)', 'Status'];
      rows = filteredOOP.map(exp => [
        exp.date,
        `"${getEmpName(exp.employeeId)}"`,
        `"${getClientName(exp.clientId)}"`,
        `"${exp.description || ''}"`,
        Number(exp.amount).toFixed(2),
        exp.status
      ]);
      filename = `Out_of_Pocket_Purchases${filterMonth ? `_${filterMonth}` : ''}.csv`;
    }

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status) => {
    if (status === 'approved') return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Approved</span>;
    if (status === 'rejected') return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">Rejected</span>;
    return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Pending</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      
      {/* Header & Search */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center">
          <Receipt className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Reimbursement Requests</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* NEW EXPORT BUTTON */}
          <button onClick={exportToCSV} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition shadow-sm text-sm font-medium">
            <Download className="h-4 w-4" /> <span>Export CSV</span>
          </button>

          {/* MONTH FILTER */}
          <div className="flex items-center bg-white border border-slate-300 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500 transition">
            <Filter className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="block w-full text-slate-600 focus:outline-none text-sm bg-transparent"
              title="Filter by Month"
            />
          </div>
          
          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search staff or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('mileage')} 
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center ${activeTab === 'mileage' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Car className="h-4 w-4 mr-2" /> Staff Mileage Logs
        </button>
        <button 
          onClick={() => setActiveTab('oop')} 
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center ${activeTab === 'oop' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Receipt className="h-4 w-4 mr-2" /> Client Purchases (OOP)
        </button>
      </div>

      {/* Content */}
      <div className="p-0 overflow-y-auto max-h-[600px] bg-slate-50/30">
        
        {/* MILEAGE TAB */}
        {activeTab === 'mileage' && (
          <div className="divide-y divide-slate-100">
            {filteredMileage.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No mileage logs found for this period.</div>
            ) : (
              filteredMileage.map(exp => (
                <div key={exp.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 flex items-center"><User className="h-3.5 w-3.5 mr-1 text-slate-400"/> {getEmpName(exp.employeeId)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm font-medium text-slate-600">{new Date(exp.date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-slate-600 flex items-center">
                      <Heart className="h-3.5 w-3.5 mr-1 text-teal-500"/> Client: {getClientName(exp.clientId)}
                    </div>
                    {exp.description && <div className="text-xs text-slate-500 italic">"{exp.description}"</div>}
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-800">{exp.kilometers} km</div>
                      <div className="text-xs font-semibold text-teal-600">Payout: ${(Number(exp.kilometers) * 0.68).toFixed(2)}</div>
                    </div>
                    
                    <div className="flex items-center space-x-3 w-32 justify-end">
                      {exp.status === 'pending' ? (
                        <div className="flex space-x-1">
                          <button onClick={() => onUpdateExpense(exp.id, 'approved')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded transition" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                          <button onClick={() => onUpdateExpense(exp.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded transition" title="Reject"><XCircle className="h-5 w-5" /></button>
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

        {/* OUT OF POCKET TAB */}
        {activeTab === 'oop' && (
          <div className="divide-y divide-slate-100">
            {filteredOOP.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No client purchase expenses found for this period.</div>
            ) : (
              filteredOOP.map(exp => (
                <div key={exp.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 flex items-center"><User className="h-3.5 w-3.5 mr-1 text-slate-400"/> {getEmpName(exp.employeeId)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm font-medium text-slate-600">{new Date(exp.date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-slate-600 flex items-center">
                      <Heart className="h-3.5 w-3.5 mr-1 text-teal-500"/> Client: {getClientName(exp.clientId)}
                    </div>
                    {exp.description && <div className="text-xs text-slate-500 italic">"{exp.description}"</div>}
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="flex items-center space-x-4">
                      {exp.receiptUrl ? (
                        <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded text-xs font-bold transition shadow-sm">
                          <FileText className="h-3.5 w-3.5 mr-1" /> View Receipt
                        </a>
                      ) : (
                        <span className="flex items-center px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded text-xs font-medium cursor-not-allowed" title="No receipt was uploaded by the employee">
                          <FileText className="h-3.5 w-3.5 mr-1 opacity-50" /> No Receipt
                        </span>
                      )}
                      <div className="text-lg font-black text-slate-800 text-right w-20">${Number(exp.amount).toFixed(2)}</div>
                    </div>
                    
                    <div className="flex items-center space-x-3 w-28 justify-end">
                      {exp.status === 'pending' ? (
                        <div className="flex space-x-1">
                          <button onClick={() => onUpdateClientExpense(exp.id, 'approved')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded transition" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                          <button onClick={() => onUpdateClientExpense(exp.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded transition" title="Reject"><XCircle className="h-5 w-5" /></button>
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
      </div>
    </div>
  );
}
