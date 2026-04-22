import React from 'react';
import { Settings, Award } from 'lucide-react';

export default function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="font-semibold text-slate-800">System Settings</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Pay Period Anchor Date</label>
          <input 
            type="date" 
            value={payPeriodStart} 
            onChange={(e) => setPayPeriodStart(e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
          />
          <p className="text-xs text-slate-500 mt-1">This date is used to calculate bi-weekly pay cycles.</p>
        </div>
        
        <div className="border-t border-slate-200 pt-5">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                checked={isBonusActive || false} 
                onChange={(e) => setIsBonusActive(e.target.checked)} 
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" 
              />
            </div>
            <span className="font-bold text-slate-800 flex items-center group-hover:text-teal-700 transition">
              <Award className="h-5 w-5 mr-1.5 text-amber-500"/> 
              Enable Performance Bonus System
            </span>
          </label>
          <div className="mt-2 ml-8 bg-amber-50 border border-amber-100 rounded-md p-3 text-xs text-amber-800 leading-relaxed">
            <strong>Active:</strong> Employees will see an Awards tab. The top 3 earners (min. 10 shifts) automatically receive a $100, $50, or $20 bonus on their paycheck each month. Annual trophies track total badges won ($3000, $2000, $1000 grand prizes).
          </div>
        </div>
      </div>
    </div>
  );
}
