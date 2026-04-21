import React from 'react';
import { Coffee, FileText, CheckCircle, XCircle, Car } from 'lucide-react';

export default function ExpenseManager({ expenses = [], clientExpenses = [], employees = [], clients = [], onUpdateExpense, onUpdateClientExpense }) {
  
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const sortedExpenses = [...safeExpenses].sort((a, b) => {
    if (a?.status === 'pending' && b?.status !== 'pending') return -1;
    if (a?.status !== 'pending' && b?.status === 'pending') return 1;
    return new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime();
  });

  const sortedClientExpenses = [...safeClientExpenses].sort((a, b) => {
    if (a?.status === 'pending' && b?.status !== 'pending') return -1;
    if (a?.status !== 'pending' && b?.status === 'pending') return 1;
    return new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime();
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <Coffee className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Expense Receipts (Out-of-Pocket)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Item/Description</th>
                <th className="px-6 py-3 font-medium">Receipt</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClientExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No client expense receipts submitted.</td>
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
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Staff & Client</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Description</th>
                <th className="px-6 py-3 font-medium">Kilometers</th>
                <th className="px-6 py-3 font-medium">Reimbursement ($0.68/km)</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No mileage logs submitted.</td>
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