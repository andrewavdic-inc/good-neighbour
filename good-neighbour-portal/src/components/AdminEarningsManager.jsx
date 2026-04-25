import React, { useState, useMemo } from 'react';
import { Coins, Award, Trophy, Medal } from 'lucide-react';
import { getPastPayPeriods, parseLocal } from '../utils';

export default function AdminEarningsManager({ employees = [], shifts = [], expenses = [], clientExpenses = [], payPeriodStart, isBonusActive, bonusSettings }) {
  const kmRate = 0.68;
  
  const safeEmps = Array.isArray(employees) ? employees : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];
  const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
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
  
  // Calculate Monthly Leaderboard
  const getMonthlyLeaderboard = () => {
    const year = currentPeriodEnd.getFullYear();
    const month = currentPeriodEnd.getMonth();
    const mStart = new Date(year, month, 1);
    const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
    
    let results = safeEmps.map(emp => {
      const empShifts = safeShifts.filter(s => {
        if (s.employeeId !== emp.id || !s.date || !s.endTime) return false;
        const shiftDate = new Date(`${s.date}T${s.endTime}`);
        return shiftDate >= mStart && shiftDate <= mEnd;
      });
      
      let sEarn = 0;
      if (emp.payType === 'hourly') {
        let hrs = 0;
        empShifts.forEach(s => {
          const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
          const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
          let h = (eH + eM/60) - (sH + sM/60);
          if (h < 0) h += 24;
          hrs += h;
        });
        sEarn = hrs * (Number(emp.hourlyWage) || 22.5);
      } else {
        sEarn = empShifts.length * (Number(emp.perVisitRate) || 45);
      }
      
      const kmE = safeExp.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocal(e.date) >= mStart && parseLocal(e.date) <= mEnd).reduce((sum, e) => sum + (Number(e.kilometers) * 0.68), 0);
      const oopE = safeCE.filter(e => e.employeeId === emp.id && e.status === 'approved' && parseLocal(e.date) >= mStart && parseLocal(e.date) <= mEnd).reduce((sum, e) => sum + Number(e.amount), 0);
      
      return { emp, shiftCount: empShifts.length, total: sEarn + kmE + oopE };
    });
    
    return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.total - a.total).slice(0, 3);
  };

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
      
      const isHourly = emp.payType === 'hourly';
      let totalHours = 0;
      
      empShifts.forEach(s => {
        const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24; 
        totalHours += hours;
      });

      let shiftEarnings = 0;
      let displayRate = '';
      
      if (isHourly) {
        const hourlyWage = Number(emp.hourlyWage) || 22.50;
        shiftEarnings = totalHours * hourlyWage;
        displayRate = `${totalHours.toFixed(1)} hrs @ $${hourlyWage.toFixed(2)}/hr`;
      } else {
        const visitRate = Number(emp.perVisitRate) || 45;
        shiftEarnings = empShifts.length * visitRate;
        displayRate = `${empShifts.length} shifts @ $${visitRate.toFixed(2)}/visit`;
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
      const clientExpenseEarnings = empClientExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      let bonusEarnings = 0;
      if (isBonusActive) {
        if (monthlyWinners[0]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[0] || 0); }
        else if (monthlyWinners[1]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[1] || 0); }
        else if (monthlyWinners[2]?.emp.id === emp.id) { bonusEarnings = Number(safeBonusSettings.monthly[2] || 0); }
      }

      const totalEarnings = shiftEarnings + kmEarnings + clientExpenseEarnings + bonusEarnings;

      return {
        ...emp,
        shiftCount: empShifts.length,
        totalHours,
        isHourly,
        displayRate,
        shiftEarnings,
        totalKms,
        kmEarnings,
        clientExpenseEarnings,
        bonusEarnings,
        totalEarnings
      };
    }).filter(Boolean).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [safeEmps, safeShifts, safeExp, safeCE, currentPeriodStart, currentPeriodEnd, isBonusActive, safeBonusSettings]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center">
          <Coins className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Team Earnings Overview</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
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
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Shift Earnings</th>
              <th className="px-6 py-3 font-medium">Mileage</th>
              <th className="px-6 py-3 font-medium">Out-of-Pocket</th>
              {isBonusActive && <th className="px-6 py-3 font-medium text-amber-600">Bonuses</th>}
              <th className="px-6 py-3 font-medium text-right text-slate-800">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeEarnings.length === 0 ? (
              <tr>
                <td colSpan={isBonusActive ? "6" : "5"} className="px-6 py-8 text-center text-slate-500">No active employees to display.</td>
              </tr>
            ) : (
              employeeEarnings.map(emp => (
                <tr key={`earning_${emp.id}`} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-500">{emp.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.shiftEarnings.toFixed(2)} <span className="text-xs text-slate-400 block mt-0.5">({emp.displayRate})</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.kmEarnings.toFixed(2)} <span className="text-xs text-slate-400 block mt-0.5">({emp.totalKms} km)</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    ${emp.clientExpenseEarnings.toFixed(2)}
                  </td>
                  {isBonusActive && (
                    <td className="px-6 py-4 text-sm font-semibold text-amber-600">
                      {emp.bonusEarnings > 0 ? (
                        <div className="flex items-center">
                          <Award className="h-4 w-4 mr-1"/> +${emp.bonusEarnings}
                        </div>
                      ) : '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right text-emerald-600 font-bold text-base">
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
