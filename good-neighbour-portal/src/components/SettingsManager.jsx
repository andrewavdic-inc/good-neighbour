import React from 'react';
import { Settings, Award, CalendarDays, Trophy, Medal } from 'lucide-react';

export default function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  // Safe fallback in case bonusSettings isn't fully loaded yet
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };

  const handleUpdateBonus = (category, index, value) => {
    const updated = { ...safeBonusSettings, [category]: [...safeBonusSettings[category]] };
    updated[category][index] = Number(value) || 0;
    setBonusSettings(updated); 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-semibold text-slate-800">System Settings</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Pay Period Anchor Date</label>
          <input 
            type="date" 
            value={payPeriodStart} 
            onChange={(e) => setPayPeriodStart(e.target.value)} 
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
          />
          <p className="text-xs text-slate-500 mt-1">This date is used to calculate bi-weekly pay cycles.</p>
        </div>
        
        <div className="border-t border-slate-200 pt-5">
          <label className="flex items-center space-x-3 cursor-pointer group w-fit">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                checked={isBonusActive || false} 
                onChange={(e) => setIsBonusActive(e.target.checked)} 
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" 
              />
            </div>
            <span className="font-bold text-slate-800 flex items-center group-hover:text-teal-700 transition">
              <Award className="h-5 w-5 mr-1.5 text-amber-500"/> Enable Performance Bonus System
            </span>
          </label>
          <div className="mt-2 ml-8 text-xs text-slate-500 leading-relaxed max-w-xl">
            When active, top earning employees with a minimum of 10 completed shifts will receive automated cash bonuses on their paycheck each month. Annual trophies track total badges won.
          </div>

          {isBonusActive && (
            <div className="mt-4 ml-8 p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-5">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Bonus Payout Configurations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5"/> Monthly Leaderboard</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[0]} onChange={(e)=>handleUpdateBonus('monthly', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[1]} onChange={(e)=>handleUpdateBonus('monthly', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.monthly[2]} onChange={(e)=>handleUpdateBonus('monthly', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center"><Trophy className="h-4 w-4 mr-1.5"/> Annual Grand Prizes</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-yellow-600 flex items-center"><Trophy className="h-3 w-3 mr-1"/> 1st Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[0]} onChange={(e)=>handleUpdateBonus('annual', 0, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 flex items-center"><Medal className="h-3 w-3 mr-1"/> 2nd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[1]} onChange={(e)=>handleUpdateBonus('annual', 1, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-700 flex items-center"><Award className="h-3 w-3 mr-1"/> 3rd Place</span>
                      <div className="relative"><span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span><input type="number" min="0" value={safeBonusSettings.annual[2]} onChange={(e)=>handleUpdateBonus('annual', 2, e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
