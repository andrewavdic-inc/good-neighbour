import React, { useState } from 'react';
import { Coffee, FileText, CheckCircle, XCircle, Car } from 'lucide-react';

export default function ExpenseManager({ expenses = [], clientExpenses = [], employees = [], clients = [], onUpdateExpense, onUpdateClientExpense }) {
  
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const [expenseSort, setExpenseSort] = useState({ key: 'date', direction: 'desc' });
  const [clientExpSort, setClientExpSort] = useState({ key: 'date', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM

  const handleExpSort = (key) => {
    setExpenseSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleClientExpSort = (key) => {
    setClientExpSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter by selected month before sorting
  const filteredExpenses = safeExpenses.filter(e => {
    if (!selectedMonth) return true;
    return e.date && e.date.startsWith(selectedMonth);
  });

  const filteredClientExpenses = safeClientExpenses.filter(e => {
    if (!selectedMonth) return true;
    return e.date && e.date.startsWith(selectedMonth);
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let valA, valB;
    if (expenseSort.key === 'date') {
      valA = new Date(a.date || 0).getTime();
      valB = new Date(b.date || 0).getTime();
    } else if (expenseSort.key === 'amount') {
      valA = a.kilometers || 0;
      valB = b.kilometers || 0;
    } else if (expenseSort.key === 'status') {
      valA = a.status || '';
      valB = b.status || '';
    }
    if (valA < valB) return expenseSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return expenseSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedClientExpenses = [...filteredClientExpenses].sort((a, b) => {
    let valA, valB;
    if (clientExpSort.key === 'date') {
      valA = new Date(a.date || 0).getTime();
      valB = new Date(b.date || 0).getTime();
    } else if (clientExpSort.key === 'amount') {
      valA = a.amount || 0;
      valB = b.amount || 0;
    } else if (clientExpSort.key === 'status') {
      valA = a.status || '';
      valB = b.status || '';
    }
    if (valA < valB) return clientExpSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return clientExpSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-8">
      {/* Month/Year Filter Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Reimbursement Approvals</h2>
          <p className="text-sm text-slate-500">Review and approve employee out-of-pocket expenses and mileage.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter by Month:</label>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
          {selectedMonth && (
            <button 
              onClick={() => setSelectedMonth('')} 
              className="text-xs text-slate-500 hover:text-red-500 underline whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <Coffee className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Expense Receipts (Out-of-Pocket)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th onClick={() => handleClientExpSort('date')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Date ↕</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Item/Description</th>
                <th className="px-6 py-3 font-medium">Receipt</th>
                <th onClick={() => handleClientExpSort('amount')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Amount ↕</th>
                <th onClick={() => handleClientExpSort('status')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Status ↕</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClientExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    {selectedMonth ? `No client expenses submitted for ${selectedMonth}.` : "No client expense receipts submitted."}
                  </td>
                </tr>
              ) : (
                sortedClientExpenses.map(expense => {
                  if (!expense) return null;
                  const emp = safeEmployees.find(e => e.id === expense.employeeId);
                  const client = safeClients.find(c => c.id === expense.clientId);
                  
                  return (
                    <tr key={`ce_${expense.id || Math.random()}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{expense.date ? new Date(expense.date).toLocaleDateString() : 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-700">{emp?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">for {client?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={expense.description}>{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {expense.receiptDetails ? (
                          <div className="flex items-center text-teal-600">
                            <FileText className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-[100px]" title={expense.receiptDetails}>{expense.receiptDetails}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No attachment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${(expense.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateClientExpense && onUpdateClientExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => onUpdateClientExpense && onUpdateClientExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject">
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <Car className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Mileage Approvals</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th onClick={() => handleExpSort('date')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Date ↕</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Description</th>
                <th onClick={() => handleExpSort('amount')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Kilometers ↕</th>
                <th className="px-6 py-3 font-medium">Reimbursement ($0.68/km)</th>
                <th onClick={() => handleExpSort('status')} className="px-6 py-3 font-medium cursor-pointer hover:text-teal-600 transition">Status ↕</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    {selectedMonth ? `No mileage logs submitted for ${selectedMonth}.` : "No mileage logs submitted."}
                  </td>
                </tr>
              ) : (
                sortedExpenses.map(expense => {
                  if (!expense) return null;
                  const emp = safeEmployees.find(e => e.id === expense.employeeId);
                  const client = safeClients.find(c => c.id === expense.clientId);
                  const amount = ((expense.kilometers || 0) * 0.68).toFixed(2);
                  
                  return (
                    <tr key={`mil_${expense.id || Math.random()}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">{expense.date ? new Date(expense.date).toLocaleDateString() : 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-700">{emp?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">for {client?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={expense.description}>{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.kilometers} km</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${amount}</td>
                      <td className="px-6 py-4">
                        {expense.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>}
                        {expense.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {expense.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button onClick={() => onUpdateExpense && onUpdateExpense(expense.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => onUpdateExpense && onUpdateExpense(expense.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Reject">
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}