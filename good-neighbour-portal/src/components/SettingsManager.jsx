import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsManager({ payPeriodStart, setPayPeriodStart }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-lg">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-semibold text-slate-800">System Settings</h2>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period Start Date</label>
          <p className="text-xs text-slate-500 mb-3">The employee earnings tracker will reset and calculate from this date onward.</p>
          <input
            type="date"
            value={payPeriodStart}
            onChange={(e) => setPayPeriodStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}
