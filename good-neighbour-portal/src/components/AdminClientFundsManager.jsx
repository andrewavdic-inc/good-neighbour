import React, { useState, useMemo } from 'react';
import { Wallet, Car, Receipt } from 'lucide-react';
import { parseLocal } from '../utils';

export default function AdminClientFundsManager({ clients, expenses, clientExpenses, employees }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedClientId, setExpandedClientId] = useState(null);

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
  const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed

  const clientFundsData = useMemo(() => {
    return clients.map(client => {
      const cMileage = expenses.filter(e => {
        if(e.clientId !== client.id || e.status !== 'approved') return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const mileageCost = cMileage.reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);

      const cOOP = clientExpenses.filter(e => {
        if(e.clientId !== client.id || e.status !== 'approved') return false;
        const d = parseLocal(e.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const oopCost = cOOP.reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        ...client,
        mileageCost,
        oopCost,
        totalSpent: mileageCost + oopCost,
        remaining: client.monthlyAllowance - (mileageCost + oopCost),
        transactions: [
          ...cMileage.map(m => ({ ...m, type: 'mileage', cost: Number(m.kilometers) * 0.68 })),
          ...cOOP.map(o => ({ ...o, type: 'oop', cost: Number(o.amount) }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });
  }, [clients, expenses, clientExpenses, targetYear, targetMonth]);

  const handleToggleExpand = (clientId) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Client Monthly Allowances</h2>
        </div>
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
                      ${client.monthlyAllowance.toFixed(2)}
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
                    <td className="px-6 py-4 text-center">
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
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Itemized Deductions ({selectedMonth})</h4>
                        {client.transactions.length === 0 ? (
                          <div className="text-sm text-slate-500 italic">No approved transactions for this month.</div>
                        ) : (
                          <div className="space-y-2">
                            {client.transactions.map((tx, idx) => {
                              const emp = employees.find(e => e.id === tx.employeeId);
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 text-sm">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${tx.type === 'mileage' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {tx.type === 'mileage' ? <Car className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-700">
                                        {parseLocal(tx.date).toLocaleDateString()} &bull; {emp?.name || 'Unknown Staff'}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {tx.type === 'mileage' ? `${tx.kilometers}km: ` : ''}{tx.description}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="font-bold text-slate-700">
                                    -${tx.cost.toFixed(2)}
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
    </div>
  );
}
