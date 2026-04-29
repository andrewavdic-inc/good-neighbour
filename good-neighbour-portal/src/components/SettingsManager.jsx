import React, { useState } from 'react';
import { Settings, Award, CalendarDays, Trophy, Medal, HardDrive, RefreshCw, Info, Server } from 'lucide-react';
import { getStorage, ref, listAll, getMetadata } from 'firebase/storage';

export default function SettingsManager({ payPeriodStart, setPayPeriodStart, isBonusActive, setIsBonusActive, bonusSettings, setBonusSettings }) {
  // --- EXISTING BONUS LOGIC ---
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };

  const handleUpdateBonus = (category, index, value) => {
    const updated = { ...safeBonusSettings, [category]: [...safeBonusSettings[category]] };
    updated[category][index] = Number(value) || 0;
    setBonusSettings(updated); 
  };

  // --- NEW STORAGE SCANNER STATE & LOGIC ---
  const [isScanning, setIsScanning] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);

  const APP_ID = 'good-neighbour-portal';
  const STORAGE_FOLDERS = ['avatars', 'receipts', 'documents', 'certificates', 'paystubs'];
  const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Free Tier Limit

  const runStorageScanner = async () => {
    setIsScanning(true);
    const storage = getStorage();
    let totalBytes = 0;

    try {
      for (const folder of STORAGE_FOLDERS) {
        const folderRef = ref(storage, `${APP_ID}/${folder}`);
        try {
          const result = await listAll(folderRef);
          for (const itemRef of result.items) {
            const meta = await getMetadata(itemRef);
            totalBytes += meta.size;
          }
        } catch (folderError) {
          // Ignore if folder doesn't exist yet
          console.log(`Skipping ${folder} - folder may be empty.`);
        }
      }
      setStorageBytes(totalBytes);
      setLastScanTime(new Date());
    } catch (error) {
      console.error("Storage Scan Error:", error);
      alert("Failed to scan storage. Check your console logs.");
    } finally {
      setIsScanning(false);
    }
  };

  // Math Helpers for Display
  const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);
  const percentUsed = Math.min((storageBytes / MAX_STORAGE_BYTES) * 100, 100).toFixed(1);
  
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  if (percentUsed > 75) { barColor = 'bg-amber-500'; textColor = 'text-amber-700'; }
  if (percentUsed > 90) { barColor = 'bg-red-500'; textColor = 'text-red-700'; }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Your Existing Settings UI */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
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

      {/* RIGHT COLUMN: The New Storage Monitor */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Server className="h-5 w-5 mr-2 text-teal-600" /> Storage Monitor</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full mb-3 border border-slate-100 shadow-inner">
                <HardDrive className={`h-10 w-10 ${textColor}`} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{storageMB} <span className="text-lg font-medium text-slate-500 uppercase">MB</span></h3>
              <p className="text-sm text-slate-500 mt-1">Total File Size in Database</p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1 text-xs font-bold uppercase tracking-wider">
                <span className={textColor}>{percentUsed}% Used</span>
                <span className="text-slate-400">5 GB Limit</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200/60">
                <div className={`h-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${percentUsed}%` }}></div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex items-start">
              <Info className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-blue-500" />
              <p>This calculates the total size of all employee avatars, receipts, client documents, and paystubs currently hosted on Vercel/Firebase.</p>
            </div>

            <button 
              onClick={runStorageScanner} 
              disabled={isScanning}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin text-teal-600' : ''}`} />
              <span>{isScanning ? 'Scanning Firebase...' : 'Run Storage Scan'}</span>
            </button>
            
            {lastScanTime && (
              <div className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                Last scan: {lastScanTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
