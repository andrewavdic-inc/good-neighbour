import React, { useState, useMemo } from 'react';
import { Wallet, Car, Receipt, Download, Plus, FileText } from 'lucide-react';
import { parseLocal } from '../utils';

export default function AdminClientFundsManager({ clients = [], expenses = [], clientExpenses = [], employees = [], onAddClientExpense }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedClientId, setExpandedClientId] = useState(null);
  
  // Top Up Modal State
  const [topUpModal, setTopUpModal] = useState(null); // Holds the client object when active
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('');

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for(let i=0; i<12; i++) {
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10) - 1;

  const clientFundsData = useMemo(() => {
    return safeClients.map(client => {
      if(!client) return null;
      const cMileage = safeExpenses.filter(e => {
        if(!e || e.clientId !== client.id || e.status !== 'approved' || !e.date) return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const mileageCost = cMileage.reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);

      const cOOP = safeClientExpenses.filter(e => {
        if(!e || e.clientId !== client.id || e.status !== 'approved' || !e.date) return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      
      // Separate actual purchases from Top-Up credits to keep the UI clean
      const actualPurchases = cOOP.filter(e => Number(e.amount || 0) > 0);
      const topUpCredits = cOOP.filter(e => Number(e.amount || 0) < 0);
      
      const oopCost = actualPurchases.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const creditCost = topUpCredits.reduce((sum, e) => sum + Number(e.amount || 0), 0); // This is a negative number

      return {
        ...client,
        mileageCost,
        oopCost,
        totalSpent: mileageCost + oopCost,
        remaining: (client.monthlyAllowance || 0) - (mileageCost + oopCost + creditCost),
        transactions: [
          ...cMileage.map(m => ({ ...m, type: 'mileage', cost: Number(m.kilometers || 0) * 0.68 })),
          ...cOOP.map(o => ({ ...o, type: 'oop', cost: Number(o.amount || 0) }))
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      };
    }).filter(Boolean);
  }, [safeClients, safeExpenses, safeClientExpenses, targetYear, targetMonth]);

  const handleToggleExpand = (clientId) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  const handleTopUpSubmit = (e) => {
    e.preventDefault();
    if(!topUpAmount || !topUpModal) return;

    const amount = -Math.abs(Number(topUpAmount));
    const todayStr = new Date().toISOString().split('T')[0];

    if(onAddClientExpense) {
       onAddClientExpense({
         clientId: topUpModal.id,
         employeeId: 'admin',
         date: todayStr,
         amount: amount,
         description: `[FUNDS TOP-UP]: ${topUpNote}`,
         status: 'approved'
       });
    }
    setTopUpModal(null);
    setTopUpAmount('');
    setTopUpNote('');
  };

  const exportToCSV = () => {
    const headers = ['Client Name', 'Monthly Limit ($)', 'Used Mileage ($)', 'Used Out-of-Pocket ($)', 'Remaining Balance ($)'];
    const rows = clientFundsData.map(c => [
      `"${c.name}"`, 
      (c.monthlyAllowance || 0).toFixed(2),
      c.mileageCost.toFixed(2),
      c.oopCost.toFixed(2),
      c.remaining.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Client_Funds_Ledger_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- INDIVIDUAL ITEMIZED RECEIPT EXPORTER ---
  const exportClientItemizedCSV = (client, e) => {
    e.stopPropagation();
    
    const headers = ['Date', 'Transaction Type', 'Staff Member', 'Description', 'Amount ($)'];
    
    const rows = client.transactions.map(tx => {
      const emp = safeEmployees.find(e => e.id === tx.employeeId);
      const empName = emp?.name || (tx.employeeId === 'admin' ? 'Admin' : 'Unknown Staff');
      const dateStr = tx.date ? parseLocal(tx.date).toLocaleDateString() : 'Unknown';
      
      let txType = '';
      if (tx.type === 'mileage') txType = 'Mileage';
      else if (tx.type === 'oop' && (tx.cost || 0) < 0) txType = 'Account Top-Up (Credit)';
      else txType = 'Out of Pocket Purchase';

      const description = tx.type === 'mileage' ? `${tx.kilometers}km: ${tx.description || ''}` : (tx.description || '');
      const amount = (tx.cost || 0).toFixed(2);

      return [
        `"${dateStr}"`,
        `"${txType}"`,
        `"${empName}"`,
        `"${description.replace(/"/g, '""')}"`, // Sanitize quotes for CSV
        amount
      ];
    });

    // Add a summary row at the bottom
    rows.push(['', '', '', '', '']); // Blank spacer row
    rows.push(['', '', '', '"Monthly Limit:"', (client.monthlyAllowance || 0).toFixed(2)]);
    rows.push(['', '', '', '"Total Spent:"', client.totalSpent.toFixed(2)]);
    rows.push(['', '', '', '"Remaining Balance:"', client.remaining.toFixed(2)]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Itemized_Receipt_${client.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Monthly Allowances</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <button onClick={exportToCSV} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition shadow-sm text-sm font-medium">
            <Download className="h-4 w-4" /> <span>Export Master Ledger CSV</span>
          </button>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Billing Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Monthly Limit</th>
              <th className="px-6 py-3 font-medium">Used (Mileage)</th>
              <th className="px-6 py-3 font-medium">Used (Out-of-Pocket)</th>
              <th className="px-6 py-3 font-medium text-right text-slate-800">Remaining Balance</th>
              <th className="px-6 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientFundsData.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No clients to display.</td>
              </tr>
            ) : (
              clientFundsData.map(client => (
                <React.Fragment key={`cf_${client.id}`}>
                  <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => handleToggleExpand(client.id)}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center">
                        {client.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      ${(client.monthlyAllowance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      ${client.mileageCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      ${client.oopCost.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-base ${client.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${client.remaining.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTopUpModal(client); }}
                        className="text-amber-600 hover:text-amber-800 text-sm font-bold transition bg-amber-50 px-2 py-1 rounded shadow-sm border border-amber-100"
                      >
                        Top Up
                      </button>
                      <button 
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium transition"
                      >
                        {expandedClientId === client.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedClientId === client.id && (
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan="6" className="px-6 py-4">
                        
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itemized Deductions & Credits ({selectedMonth})</h4>
                          
                          {client.transactions.length > 0 && (
                            <button 
                              onClick={(e) => exportClientItemizedCSV(client, e)}
                              className="flex items-center text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded transition shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Itemized Receipt
                            </button>
                          )}
                        </div>

                        {client.transactions.length === 0 ? (
                          <div className="text-sm text-slate-500 italic py-2">No approved transactions for this month.</div>
                        ) : (
                          <div className="space-y-2">
                            {client.transactions.map((tx, idx) => {
                              const emp = safeEmployees.find(e => e.id === tx.employeeId);
                              const isCredit = (tx.cost || 0) < 0;
                              return (
                                <div key={idx} className={`flex items-center justify-between p-3 bg-white rounded border border-slate-200 text-sm ${isCredit ? 'border-l-4 border-l-amber-500' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${tx.type === 'mileage' ? 'bg-blue-100 text-blue-700' : isCredit ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {tx.type === 'mileage' ? <Car className="h-4 w-4" /> : isCredit ? <Plus className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-700">
                                        {tx.date ? parseLocal(tx.date).toLocaleDateString() : 'Unknown'} &bull; {emp?.name || 'Admin'}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {tx.type === 'mileage' ? `${tx.kilometers}km: ` : ''}{tx.description}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* RECEIPT LINK & AMOUNT */}
                                  <div className="flex items-center">
                                    {tx.receiptUrl && (
                                      <a onClick={(e) => e.stopPropagation()} href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center mr-4 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-md text-xs font-bold transition shadow-sm">
                                        <FileText className="h-3.5 w-3.5 mr-1.5" /> View Receipt
                                      </a>
                                    )}
                                    <div className={`font-bold min-w-[70px] text-right ${isCredit ? 'text-amber-600' : 'text-slate-700'}`}>
                                      {isCredit ? '+' : '-'}${Math.abs(tx.cost || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* TOP UP MODAL */}
      {topUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-500 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Top Up: {topUpModal.name}</h3>
              <button onClick={() => setTopUpModal(null)} className="text-white hover:text-amber-200 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleTopUpSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded border border-amber-200">
                A top-up adds authorized funds to this client's balance for the current month by recording a credit in the expense ledger.
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Top-Up Amount ($) *</label>
                <input type="number" min="0.01" step="0.01" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-lg font-bold text-slate-800" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note / Reason</label>
                <input type="text" value={topUpNote} onChange={(e) => setTopUpNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm" placeholder="e.g. Additional pharmacy funds approved by family" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setTopUpModal(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-md hover:bg-amber-700 transition">Apply Top-Up</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
