import React, { useState, useEffect } from 'react';
import { Settings, Save, HardDrive, RefreshCw, AlertCircle, Info, Server, CheckCircle } from 'lucide-react';
import { getStorage, ref, listAll, getMetadata } from 'firebase/storage';

export default function SettingsManager({ 
  payPeriodStart, 
  setPayPeriodStart, 
  isBonusActive, 
  setIsBonusActive, 
  bonusSettings, 
  setBonusSettings 
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Storage Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);

  // Constants for Storage Math
  const APP_ID = 'good-neighbour-portal';
  const STORAGE_FOLDERS = ['avatars', 'receipts', 'documents', 'certificates', 'paystubs'];
  const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Free Tier Limit

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate a quick network delay for UI feedback
    setTimeout(() => {
      // The actual saving to Firebase happens instantly via the props passed from App.jsx
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  const handleBonusChange = (index, type, value) => {
    const newSettings = { ...bonusSettings };
    newSettings[type][index] = Number(value);
    setBonusSettings(newSettings);
  };

  // --- THE LIVE SCANNER FUNCTION ---
  const runStorageScanner = async () => {
    setIsScanning(true);
    const storage = getStorage();
    let totalBytes = 0;

    try {
      for (const folder of STORAGE_FOLDERS) {
        const folderRef = ref(storage, `${APP_ID}/${folder}`);
        try {
          const result = await listAll(folderRef);
          // Loop through every file in the folder and get its size
          for (const itemRef of result.items) {
            const meta = await getMetadata(itemRef);
            totalBytes += meta.size;
          }
        } catch (folderError) {
          // If a folder doesn't exist yet, Firebase throws an error. We just ignore it and move on.
          console.log(`Skipping ${folder} - folder may be empty or uncreated.`);
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
  const storageGB = (storageBytes / (1024 * 1024 * 1024)).toFixed(3);
  const percentUsed = Math.min((storageBytes / MAX_STORAGE_BYTES) * 100, 100).toFixed(1);
  
  // Progress Bar Colors
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  if (percentUsed > 75) { barColor = 'bg-amber-500'; textColor = 'text-amber-700'; }
  if (percentUsed > 90) { barColor = 'bg-red-500'; textColor = 'text-red-700'; }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: App Configuration */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Settings className="h-5 w-5 mr-2 text-teal-600" /> Global App Settings</h2>
            {saveSuccess && <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle className="h-3 w-3 mr-1"/> Saved</span>}
          </div>
          
          <div className="p-6 space-y-8">
            
            {/* Payroll Settings */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Payroll Configuration</h3>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-1">Anchor Pay Period Start Date</label>
                <div className="text-xs text-slate-500 mb-2">This date determines all bi-weekly calculations across the platform.</div>
                <input 
                  type="date" 
                  value={payPeriodStart} 
                  onChange={(e) => setPayPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm"
                  required 
                />
              </div>
            </div>

            {/* Performance Bonus System */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800">Performance Bonus System</h3>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={isBonusActive} onChange={(e) => setIsBonusActive(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition ${isBonusActive ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isBonusActive ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-slate-700">{isBonusActive ? 'System Active' : 'System Disabled'}</div>
                </label>
              </div>

              <div className={`transition-opacity ${isBonusActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Monthly Payouts */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Monthly Cash Payouts ($)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">1st Place (Gold)</span>
                        <input type="number" min="0" value={bonusSettings?.monthly[0] || 0} onChange={(e) => handleBonusChange(0, 'monthly', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-teal-800" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">2nd Place (Silver)</span>
                        <input type="number" min="0" value={bonusSettings?.monthly[1] || 0} onChange={(e) => handleBonusChange(1, 'monthly', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-slate-700" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">3rd Place (Bronze)</span>
                        <input type="number" min="0" value={bonusSettings?.monthly[2] || 0} onChange={(e) => handleBonusChange(2, 'monthly', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-amber-700" />
                      </div>
                    </div>
                  </div>

                  {/* Annual Payouts */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Annual Grand Prizes ($)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">1st Place (Most Points)</span>
                        <input type="number" min="0" step="100" value={bonusSettings?.annual[0] || 0} onChange={(e) => handleBonusChange(0, 'annual', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-teal-800" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">2nd Place</span>
                        <input type="number" min="0" step="100" value={bonusSettings?.annual[1] || 0} onChange={(e) => handleBonusChange(1, 'annual', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-slate-700" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">3rd Place</span>
                        <input type="number" min="0" step="100" value={bonusSettings?.annual[2] || 0} onChange={(e) => handleBonusChange(2, 'annual', e.target.value)} className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-teal-500 text-right font-bold text-amber-700" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition disabled:bg-slate-400 shadow-sm">
              {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Storage Monitor */}
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
