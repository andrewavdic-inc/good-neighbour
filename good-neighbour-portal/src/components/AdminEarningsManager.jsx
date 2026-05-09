import React, { useState, useMemo } from 'react';
import { Coins, Award, Trophy, Medal, Download, ShieldAlert, Wallet, CalendarDays, Receipt, Clock, Briefcase } from 'lucide-react';
import { getPastPayPeriods, parseLocal } from '../utils';

export default function AdminEarningsManager({ employees = [], shifts = [], expenses = [], clientExpenses = [], clients = [], payPeriodStart, isBonusActive, bonusSettings }) {
  const kmRate = 0.68;
  
  // --- BULLETPROOF FILTER TO GHOST THE OWNER ---
  const safeEmps = Array.isArray(employees) ? employees.filter(e => e && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin') : [];
  
  // --- INFINITE PAYOUT FIX: EXCLUDE 'PAID' RECORDS ---
  const safeShifts = Array.isArray(shifts) ? shifts.filter(s => s.status !== 'paid') : [];
  const safeExp = Array.isArray(expenses) ? expenses.filter(e => e.status !== 'paid') : [];
  const safeCE = Array.isArray(clientExpenses) ? clientExpenses.filter(e => e.status !== 'paid') : [];
  
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  
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
  
  // --- SYNCHRONIZED MONTHLY LEADERBOARD CALCULATOR ---
  const getMonthlyLeaderboard = () => {
    const mStart = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth(), 1);
    const mEnd = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth() + 1, 0, 23, 59, 59);
    
    let results = safeEmps.map(emp => {
      const empShifts = safeShifts.filter(s => {
        if (s.employeeId !== emp.id || !s.date || !s.endTime) return false;
        const shiftDate = new Date(`${s.date}T${s.endTime}`);
        return shiftDate >= mStart && shiftDate <= mEnd;
      });
      
      let sEarn = 0;
      if (emp.payType === 'salary') {
         sEarn = (Number(emp.annualSalary) || 0) / 12; 
      } else {
        empShifts.forEach(s => {
          const isHourly = s.isHourlyOverride || emp.payType === 'hourly';
          if (isHourly) {
            const rate = s.isHourlyOverride ? Number(s.hourlyRate) : (Number(emp.hourlyWage) || 22.5);
            const usePunch = s.requirePunchClock !== false;
            let hours = 0;
            
            if (usePunch && s.actualStartTime && s.actualEndTime) {
               hours = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
            } else {
               const st = s.startTime || '00:00';
               const et = s.endTime || '00:00';
               const [sH, sM] = String(st).split(':').map(Number);
               const [eH, eM] = String(et).split(':').map(Number);
               if (!isNaN(sH) && !isNaN(eH)) {
                 hours = (eH + eM/60) - (sH + sM/60);
                 if (hours < 0) hours += 24;
               }
            }
            sEarn += hours * rate;
          } else {
            sEarn += (Number(emp.perVisitRate) || 45);
          }
        });
      }
      
      const kmE = safeExp.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocal(e.date) >= mStart && parseLocal(e.date) <= mEnd).reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);
      const oopE = safeCE.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocal(e.date) >= mStart && parseLocal(e.date) <= mEnd).reduce((sum, e) => sum + Number(e.amount), 0);
      
      return { emp, shiftCount: empShifts.length, total: sEarn + kmE + oopE };
    });
    
    return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total).slice(0, 3);
  };

  // --- SYNCHRONIZED EARNINGS CALCULATOR ---
  const employeeEarnings = useMemo(() => {
    const now = new Date();
    const monthlyWinners = getMonthlyLeaderboard();

    return safeEmps.map(emp => {
      if(!emp) return null;
      
      const empShifts = safeShifts.filter(s => {
        if(!s || !s.date) return false;
        const d = parseLocal(s.date);
        return s.employeeId === emp.id && 
               new Date(`${s.date}T${s.endTime || '23:59'}`) <= now &&
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      
      let shiftEarnings = 0;
      let displayRate = '';
      let totalHours = 0;
      
      if (emp.payType === 'salary') {
        shiftEarnings = (Number(emp.annualSalary) || 0) / 26; 
        displayRate = `Salary: $${(Number(emp.annualSalary)||0).toLocaleString()}/yr`;
      } else {
        empShifts.forEach(s => {
          const isHourly = s.isHourlyOverride || emp.payType === 'hourly';
          if (isHourly) {
            const rate = s.isHourlyOverride ? (Number(s.hourlyRate) || 0) : (Number(emp.hourlyWage) || 22.50);
            const usePunch = s.requirePunchClock !== false;
            let hours = 0;
            
            if (usePunch && s.actualStartTime && s.actualEndTime) {
               hours = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
            } else {
               const st = s.startTime || '00:00';
               const et = s.endTime || '00:00';
               const [sH, sM] = String(st).split(':').map(Number);
               const [eH, eM] = String(et).split(':').map(Number);
               if (!isNaN(sH) && !isNaN(eH)) {
                 hours = (eH + eM/60) - (sH + sM/60);
                 if (hours < 0) hours += 24; 
               }
            }
            totalHours += hours;
            shiftEarnings += (hours * rate);
          } else {
            shiftEarnings += (Number(emp.perVisitRate) || 45);
          }
        });
        
        if (emp.payType === 'hourly') {
          displayRate = `${totalHours.toFixed(1)} hrs @ $${(Number(emp.hourlyWage) || 22.50).toFixed(2)}/hr`;
        } else {
          displayRate = `${empShifts.length} shifts (Base + Atypical Hourly)`;
        }
      }

      const empMileage = safeExp.filter(e => {
        if(!e || !e.date) return false;
        const d = parseLocal(e.date);
        return e.employeeId === emp.id && 
               e.status === 'approved' && 
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const totalKms = empMileage.reduce((sum, e) => sum + Number(e.kilometers || 0), 0);
      const kmEarnings = totalKms * kmRate;

      const empClientExp = safeCE.filter(e => {
        if(!e || !e.date) return false;
        const d = parseLocal(e.date);
        return e.employeeId === emp.id && 
               e.status === 'approved' && 
               d >= currentPeriodStart && d <= currentPeriodEnd;
      });
      const oopEarnings = empClientExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      let bonusEarnings = 0;
      if (isBonusActive) {
        if (monthlyWinners[0]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[0] || 0); }
        else if (monthlyWinners[1]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[1] || 0); }
        else if (monthlyWinners[2]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[2] || 0); }
      }

      const totalEarnings = shiftEarnings + kmEarnings + oopEarnings + bonusEarnings;

      return {
        ...emp,
        shiftCount: empShifts.length,
        totalHours,
        displayRate,
        shiftEarnings,
        totalKms,
        kmEarnings,
        oopEarnings,
        bonusEarnings,
        totalEarnings
      };
    }).filter(Boolean).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [safeEmps, safeShifts, safeExp, safeCE, currentPeriodStart, currentPeriodEnd, isBonusActive, safeBonusSettings]);


  // --- PERFECTED FINANCIAL SEPARATION WIDGET CALCULATIONS ---
  const totalPayrollLiability = employeeEarnings.reduce((sum, emp) => sum + emp.totalEarnings, 0);

  const salariedEmployees = employeeEarnings.filter(e => e.payType === 'salary');
  const totalSalaryCost = salariedEmployees.reduce((sum, e) => sum + e.shiftEarnings, 0);

  const wageEmployees = employeeEarnings.filter(e => e.payType !== 'salary');
  const totalWageCost = wageEmployees.reduce((sum, e) => sum + e.shiftEarnings, 0);
  
  const totalHourlyHours = wageEmployees.filter(e => e.payType === 'hourly').reduce((sum, e) => sum + e.totalHours, 0);
  const totalVisitShifts = wageEmployees.filter(e => e.payType !== 'hourly').reduce((sum, e) => sum + e.shiftCount, 0);

  const totalBonuses = employeeEarnings.reduce((sum, e) => sum + (e.bonusEarnings || 0), 0);

  // 1. Client Budgets (Strictly excluding Internal Overhead)
  const maxExpenseLiability = safeClients
    .filter(c => c.isActive !== false)
    .reduce((sum, c) => sum + (Number(c.monthlyAllowance) || 0), 0);

  const periodClientOop = safeCE
    .filter(e => e.clientId !== 'internal' && e.status === 'approved' && parseLocal(e.date) >= currentPeriodStart && parseLocal(e.date) <= currentPeriodEnd)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const periodClientKm = safeExp
    .filter(e => e.clientId !== 'internal' && e.status === 'approved' && parseLocal(e.date) >= currentPeriodStart && parseLocal(e.date) <= currentPeriodEnd)
    .reduce((sum, e) => sum + (Number(e.kilometers || 0) * kmRate), 0);

  const totalUsedClientExpense = periodClientOop + periodClientKm;
  const expensePercent = maxExpenseLiability > 0 ? Math.min((totalUsedClientExpense / maxExpenseLiability) * 100, 100) : 0;

  // 2. Corporate Overhead & Petty Cash (Strictly Internal Only)
  const periodInternalOop = safeCE
    .filter(e => e.clientId === 'internal' && e.status === 'approved' && parseLocal(e.date) >= currentPeriodStart && parseLocal(e.date) <= currentPeriodEnd)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const periodInternalKm = safeExp
    .filter(e => e.clientId === 'internal' && e.status === 'approved' && parseLocal(e.date) >= currentPeriodStart && parseLocal(e.date) <= currentPeriodEnd)
    .reduce((sum, e) => sum + (Number(e.kilometers || 0) * kmRate), 0);

  const totalCorporateOverhead = periodInternalOop + periodInternalKm;


  // --- 2-PART NATIVE CSV EXPORT LOGIC ---
  const exportToCSV = () => {
    const payPeriodDisplay = `${currentPeriodStart.toLocaleDateString('en-US')} to ${currentPeriodEnd.toLocaleDateString('en-US')}`;
    
    const summaryRows = [
      ['EXECUTIVE SUMMARY'],
      ['Pay Period', `"${payPeriodDisplay}"`],
      ['Total Payroll Liability', `"$${totalPayrollLiability.toFixed(2)}"`],
      ['Wage & Bonus Cost', `"$${(totalWageCost + totalBonuses).toFixed(2)}"`],
      ['Salary Cost', `"$${totalSalaryCost.toFixed(2)}"`],
      ['Client Budget Utilized', `"$${totalUsedClientExpense.toFixed(2)} of $${maxExpenseLiability.toFixed(2)}"`],
      ['Corporate Overhead & Petty Cash', `"$${totalCorporateOverhead.toFixed(2)}"`],
      [], 
      ['LINE-BY-LINE BREAKDOWN']
    ];

    const tableHeaders = ['Employee', 'Role', 'Base Earnings ($)', 'Mileage ($)', 'Out-of-Pocket ($)'];
    if (isBonusActive) tableHeaders.push('Bonuses ($)');
    tableHeaders.push('Total Due ($)');

    const tableRows = employeeEarnings.map(emp => {
      const row = [
        `"${emp.name}"`, 
        `"${emp.role}"`,
        emp.shiftEarnings.toFixed(2),
        emp.kmEarnings.toFixed(2),
        emp.oopEarnings.toFixed(2)
      ];
      if (isBonusActive) row.push(emp.bonusEarnings.toFixed(2));
      row.push(emp.totalEarnings.toFixed(2));
      return row;
    });

    const csvContent = [
      ...summaryRows.map(r => r.join(',')),
      tableHeaders.join(','),
      ...tableRows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const startDateStr = currentPeriodStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '_');
    const endDateStr = currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '_');
    link.setAttribute('download', `Team_Earnings_Report_${startDateStr}_to_${endDateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center">
          <Coins className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Team Earnings Overview</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
          <button onClick={exportToCSV} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition shadow-sm text-sm font-medium shrink-0">
            <Download className="h-4 w-4" /> <span>Export CSV</span>
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto shrink-0">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Pay Period:</label>
            <div className="flex space-x-2 w-full sm:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-1/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={activePeriod.start.getTime().toString()}
                onChange={(e) => setSelectedPeriodTime(e.target.value)}
                className="w-2/3 sm:w-auto px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700 shadow-sm"
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
      </div>
      
      {/* --- NEW SPLIT FINANCIAL DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-slate-200 bg-slate-50/50">
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Wallet className="h-4 w-4 mr-2 text-teal-600"/> Total Payroll Liability</div>
          <div className="text-4xl font-black text-slate-800 tracking-tight">${totalPayrollLiability.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2 font-medium">For selected pay period</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Clock className="h-4 w-4 mr-2 text-blue-600"/> Wage & Bonus Cost</div>
          <div className="text-4xl font-black text-slate-800 tracking-tight">${(totalWageCost + totalBonuses).toFixed(2)}</div>
          <div className="flex flex-col text-xs text-slate-400 mt-2 font-medium space-y-0.5">
            <span>{totalVisitShifts} Per-Visit Shifts</span>
            <span>{totalHourlyHours.toFixed(1)} Hourly Hours</span>
            {isBonusActive && <span className="text-amber-500 font-bold">+ ${totalBonuses.toFixed(2)} in Bonuses</span>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Briefcase className="h-4 w-4 mr-2 text-indigo-600"/> Salary Cost</div>
          <div className="text-4xl font-black text-slate-800 tracking-tight">${totalSalaryCost.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2 font-medium">Fixed bi-weekly pay ({salariedEmployees.length} staff)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6 border-b border-slate-200 bg-slate-50/50">
        {/* Client Budget Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Receipt className="h-4 w-4 mr-2 text-rose-600"/> Client Budget Utilized
          </div>
          <div className="flex items-end mb-2">
            <div className={`text-3xl font-black tracking-tight ${expensePercent > 90 ? 'text-red-600' : expensePercent > 75 ? 'text-amber-500' : 'text-slate-800'}`}>
              ${totalUsedClientExpense.toFixed(2)}
            </div>
            <div className="text-sm font-bold text-slate-400 mb-1 ml-1">
              / ${maxExpenseLiability.toFixed(2)}
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
            <div className={`h-2 rounded-full ${expensePercent > 90 ? 'bg-red-500' : expensePercent > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${expensePercent}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-slate-400 font-medium">For selected period</span>
            <span className="text-slate-500 font-bold">{expensePercent.toFixed(0)}%</span>
          </div>
        </div>

        {/* Corporate Petty Cash Panel */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none"><Briefcase size={100} /></div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-indigo-600"/> Corporate Overhead & Petty Cash
            </div>
            <div className="text-3xl font-black text-indigo-900 tracking-tight mb-3">
              ${totalCorporateOverhead.toFixed(2)}
            </div>
            <div className="flex flex-col text-xs text-indigo-700/80 font-medium space-y-1.5">
              <div className="flex justify-between border-b border-indigo-100 pb-1">
                <span>Internal Out-of-Pocket:</span>
                <span className="font-bold text-indigo-900">${periodInternalOop.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Internal Mileage:</span>
                <span className="font-bold text-indigo-900">${periodInternalKm.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <th className="px-6 py-4 font-semibold">Employee</th>
              <th className="px-6 py-4 font-semibold">Base Earnings</th>
              <th className="px-6 py-4 font-semibold">Mileage</th>
              <th className="px-6 py-4 font-semibold">Out-of-Pocket</th>
              {isBonusActive && <th className="px-6 py-4 font-semibold text-amber-600">Bonuses</th>}
              <th className="px-6 py-4 font-semibold text-right text-slate-800">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeEarnings.length === 0 ? (
              <tr>
                <td colSpan={isBonusActive ? "6" : "5"} className="px-6 py-12 text-center text-slate-500 font-medium">No active employees found for this pay period.</td>
              </tr>
            ) : (
              employeeEarnings.map(emp => (
                <tr key={`earning_${emp.id}`} className="hover:bg-slate-50 transition group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{emp.name}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{emp.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-700">${emp.shiftEarnings.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{emp.displayRate}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-700">${emp.kmEarnings.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{emp.totalKms} km @ $0.68</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-semibold text-slate-700">
                    ${emp.oopEarnings.toFixed(2)}
                  </td>
                  {isBonusActive && (
                    <td className="px-6 py-4 text-sm font-bold text-amber-600">
                      {emp.bonusEarnings > 0 ? (
                        <div className="flex items-center">
                          <Award className="h-4 w-4 mr-1"/> +${emp.bonusEarnings.toFixed(2)}
                        </div>
                      ) : <span className="text-slate-300 font-medium">-</span>}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right text-emerald-600 font-black text-lg">
                    ${emp.totalEarnings.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
