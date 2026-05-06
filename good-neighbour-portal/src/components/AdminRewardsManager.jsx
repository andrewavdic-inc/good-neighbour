import React, { useState, useMemo } from 'react';
import { Award, Gift, Trophy, Star, Medal, Download, Plus, Heart, ThumbsUp, Zap, Trash2, CalendarDays, TrendingUp, Link as LinkIcon, Hash, Loader2, Upload, ShieldAlert, ToggleLeft, ToggleRight, List, AlertTriangle } from 'lucide-react';

// --- DATE HELPER ---
const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
  } catch (e) {
    return new Date();
  }
};

const STANDARD_BADGES = [
  { id: 'shift_saver', icon: '🦸‍♀️', label: 'Shift Saver' },
  { id: 'client_fav', icon: '💖', label: 'Client Favorite' },
  { id: 'perfect_attendance', icon: '🌟', label: 'Perfect Attendance' },
  { id: 'team_player', icon: '🤝', label: 'Team Player' },
  { id: 'above_beyond', icon: '🚀', label: 'Above & Beyond' }
];

export default function AdminRewardsManager({ 
  employees = [], shifts = [], expenses = [], clientExpenses = [], 
  kudos = [], prizes = [], onAddKudos, onRemoveKudos, onAddPrize, onRemovePrize,
  isBonusActive, bonusSettings, updateEmployee
}) {
  const [activeTab, setActiveTab] = useState('command');
  
  // Ghost the owner from the leaderboards and issuance dropdowns
  const safeEmployees = Array.isArray(employees) ? employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin') : [];
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };

  // --- COMMAND CENTER STATE ---
  const [kudosEmpId, setKudosEmpId] = useState(safeEmployees[0]?.id || '');
  const [kudosBadge, setKudosBadge] = useState(STANDARD_BADGES[0].label);
  const [kudosPoints, setKudosPoints] = useState(100); 
  const [kudosMessage, setKudosMessage] = useState('');

  const [prizeEmpId, setPrizeEmpId] = useState(safeEmployees[0]?.id || '');
  const [prizeName, setPrizeName] = useState('');
  const [prizeValue, setPrizeValue] = useState('');
  const [prizeNote, setPrizeNote] = useState('');
  const [prizeCode, setPrizeCode] = useState('');
  const [prizeLink, setPrizeLink] = useState('');
  const [prizeFile, setPrizeFile] = useState(null);
  const [isPrizeUploading, setIsPrizeUploading] = useState(false);

  // --- COMPREHENSIVE LOG STATE ---
  const [logFilterMonth, setLogFilterMonth] = useState('All');

  // --- MONTHLY BATTLEFIELD STATE ---
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // --- GALA STATE ---
  const [galaYear, setGalaYear] = useState(() => new Date().getFullYear());

  const yearOptions = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    shifts.forEach(s => s.date && years.add(parseLocalSafe(s.date).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [shifts]);

  // --- MATH ENGINE: PRIVACY-SAFE "ACTIVITY SCORE" (MONTHLY) ---
  const getLeaderboardForMonth = (yearStr, monthStr) => {
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1;
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    let results = safeEmployees.map(emp => {
      const empShifts = shifts.filter(s => {
        if (s.employeeId !== emp.id || !s.date || !s.endTime) return false;
        const shiftDate = new Date(`${s.date}T${s.endTime}`);
        return shiftDate >= start && shiftDate <= end;
      });

      let activityScore = 0;
      empShifts.forEach(s => {
        activityScore += 100; // Base points for shift
        const hasMileage = expenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
        if (hasMileage) activityScore += 50;
        const hasOop = clientExpenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
        if (hasOop) activityScore += 50;
      });

      const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date) >= start && parseLocalSafe(k.date) <= end);
      const kPoints = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
      activityScore += kPoints;

      return { emp, shiftCount: empShifts.length, kudosPoints: kPoints, activityScore };
    });

    const eligible = results.filter(r => r.shiftCount >= 10).sort((a, b) => b.activityScore - a.activityScore);
    const ineligible = results.filter(r => r.shiftCount < 10).sort((a, b) => b.activityScore - a.activityScore);
    
    return { eligible, ineligible };
  };

  const activeLeaderboard = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return getLeaderboardForMonth(y, m);
  }, [selectedMonth, safeEmployees, shifts, expenses, clientExpenses, kudos]);

  // --- MATH ENGINE: "BEST NEIGHBOUR" ANNUAL AWARDS ---
  const annualGalaStandings = useMemo(() => {
    const targetYear = parseInt(galaYear, 10);
    const scores = {}; 
    
    safeEmployees.forEach(e => { 
      if (!e.excludeFromGala) {
        scores[e.id] = { emp: e, baseActivityScore: 0, kudosPts: 0, prizePts: 0, totalGalaScore: 0 }; 
      }
    });
    
    Object.values(scores).forEach(s => {
      const emp = s.emp;
      let baseScore = 0;

      const empShifts = shifts.filter(sh => {
        if (sh.employeeId !== emp.id || !sh.date || !sh.endTime) return false;
        return new Date(`${sh.date}T${sh.endTime}`).getFullYear() === targetYear;
      });

      empShifts.forEach(sh => {
        baseScore += 100;
        const hasMileage = expenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
        if (hasMileage) baseScore += 50;
        const hasOop = clientExpenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
        if (hasOop) baseScore += 50;
      });
      s.baseActivityScore = baseScore;

      const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date).getFullYear() === targetYear);
      s.kudosPts = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
      
      const empPrizes = prizes.filter(p => p.employeeId === emp.id && parseLocalSafe(p.date).getFullYear() === targetYear);
      s.prizePts = empPrizes.length * 50;

      s.totalGalaScore = s.baseActivityScore + s.kudosPts + s.prizePts;
    });

    return Object.values(scores).sort((a, b) => b.totalGalaScore - a.totalGalaScore);
  }, [safeEmployees, shifts, expenses, clientExpenses, kudos, prizes, galaYear]);

  // --- UNIFIED COMPREHENSIVE LOG ---
  const unifiedLog = useMemo(() => {
    const combined = [
      ...kudos.map(k => ({ ...k, type: 'kudo', sortDate: new Date(k.date).getTime() })),
      ...prizes.map(p => ({ ...p, type: 'prize', sortDate: new Date(p.date).getTime() }))
    ].sort((a, b) => b.sortDate - a.sortDate);

    if (logFilterMonth === 'All') return combined;

    return combined.filter(item => {
      const d = parseLocalSafe(item.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return mKey === logFilterMonth;
    });
  }, [kudos, prizes, logFilterMonth]);

  const logMonthOptions = useMemo(() => {
    const opts = new Set();
    kudos.forEach(k => opts.add(`${parseLocalSafe(k.date).getFullYear()}-${String(parseLocalSafe(k.date).getMonth() + 1).padStart(2, '0')}`));
    prizes.forEach(p => opts.add(`${parseLocalSafe(p.date).getFullYear()}-${String(parseLocalSafe(p.date).getMonth() + 1).padStart(2, '0')}`));
    
    return [...opts].sort().reverse().map(val => {
      const [y, m] = val.split('-');
      const label = new Date(parseInt(y, 10), parseInt(m, 10)-1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { value: val, label };
    });
  }, [kudos, prizes]);

  // --- HANDLERS ---
  const handleIssueKudos = (e) => {
    e.preventDefault();
    if (!kudosEmpId || !kudosMessage) return;
    const badgeObj = STANDARD_BADGES.find(b => b.label === kudosBadge);
    onAddKudos({
      employeeId: kudosEmpId,
      date: new Date().toISOString().split('T')[0],
      badgeIcon: badgeObj?.icon || '⭐',
      badgeLabel: kudosBadge,
      points: Number(kudosPoints),
      message: kudosMessage,
      acknowledged: false
    });
    setKudosMessage('');
    setKudosPoints(100); 
  };

  const handleIssuePrize = async (e) => {
    e.preventDefault();
    if (!prizeEmpId || !prizeName) return;
    setIsPrizeUploading(true);
    
    await onAddPrize({
      employeeId: prizeEmpId,
      date: new Date().toISOString().split('T')[0],
      name: prizeName,
      value: Number(prizeValue || 0),
      note: prizeNote,
      code: prizeCode,
      link: prizeLink,
      acknowledged: false
    }, prizeFile);

    setIsPrizeUploading(false);
    setPrizeName('');
    setPrizeValue('');
    setPrizeNote('');
    setPrizeCode('');
    setPrizeLink('');
    setPrizeFile(null);
  };

  const toggleGalaEligibility = (emp) => {
    if (updateEmployee) updateEmployee(emp.id, { excludeFromGala: !emp.excludeFromGala });
  };

  // --- MINT ANNUAL TROPHIES ENGINE ---
  const handleMintTrophies = () => {
    if (annualGalaStandings.length === 0) return alert("No eligible employees to award.");
    
    const confirmMessage = `WARNING: You are about to permanently award the ${galaYear} Trophies to the top 3 employees. This will save to their profiles and display in their Trophy Case forever.\n\nAre you sure you want to finalize the ${galaYear} 'Best Neighbour' Awards?`;
    
    if (!window.confirm(confirmMessage)) return;

    const top3 = annualGalaStandings.slice(0, 3);
    const awards = [
      { title: "1st Place: Best Neighbour", color: "gold" },
      { title: "2nd Place: Great Neighbour", color: "silver" },
      { title: "3rd Place: Good Neighbour", color: "bronze" }
    ];

    let awardedCount = 0;

    top3.forEach((winner, index) => {
      if (winner.totalGalaScore === 0) return; // Don't award 0 points
      
      const emp = winner.emp;
      const newTrophy = {
        id: `trophy_${galaYear}_${index}`,
        year: galaYear,
        title: awards[index].title,
        color: awards[index].color
      };

      const currentTrophies = Array.isArray(emp.pastTrophies) ? emp.pastTrophies : [];
      
      // Prevent duplicate awards for the exact same year
      if (!currentTrophies.some(t => t.year === galaYear)) {
        if (updateEmployee) {
          updateEmployee(emp.id, { pastTrophies: [...currentTrophies, newTrophy] });
          awardedCount++;
        }
      }
    });

    if (awardedCount > 0) {
      alert(`Success! The ${galaYear} Trophies have been securely minted to the profiles of the top ${awardedCount} employees.`);
    } else {
      alert(`No trophies were awarded. They may have already been issued for ${galaYear}.`);
    }
  };

  // --- CSV EXPORTERS ---
  const exportMonthlyPayout = () => {
    const headers = ['Rank', 'Employee', 'Role', 'Completed Shifts', 'Activity Score (pts)', 'Projected Bonus ($)'];
    let rows = [];

    activeLeaderboard.eligible.forEach((r, idx) => {
      let bonus = 0;
      if (isBonusActive) {
        if (idx === 0) bonus = safeBonusSettings.monthly[0] || 0;
        if (idx === 1) bonus = safeBonusSettings.monthly[1] || 0;
        if (idx === 2) bonus = safeBonusSettings.monthly[2] || 0;
      }
      rows.push([
        idx + 1, `"${r.emp.name}"`, `"${r.emp.role}"`, r.shiftCount, 
        r.activityScore, bonus.toFixed(2)
      ]);
    });

    rows.push(['', '', '', '', '', '']);
    rows.push(['INELIGIBLE (Under 10 Shifts)', '', '', '', '', '']);
    
    activeLeaderboard.ineligible.forEach(r => {
      rows.push([
        'N/A', `"${r.emp.name}"`, `"${r.emp.role}"`, r.shiftCount, 
        r.activityScore, '0.00'
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Rewards_Payout_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportGalaRoster = () => {
    const headers = ['Rank', 'Employee', 'Role', 'Base Activity Pts', 'Kudos Pts', 'Prize Pts', 'Total Gala Score'];
    const rows = annualGalaStandings.map((r, idx) => [
      idx + 1, `"${r.emp.name}"`, `"${r.emp.role}"`, r.baseActivityScore, r.kudosPts, r.prizePts, r.totalGalaScore
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Best_Neighbour_Annual_Roster_${galaYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 shadow-inner min-h-[900px] flex flex-col">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center">
            <Star className="h-8 w-8 mr-3 text-yellow-500 fill-current" /> Rewards & Culture Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Issue kudos, track leaderboards, and plan the Annual Awards.</p>
        </div>
        <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0">
          <button onClick={() => setActiveTab('command')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'command' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Command Center</button>
          <button onClick={() => setActiveTab('monthly')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monthly Battlefield</button>
          <button onClick={() => setActiveTab('gala')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'gala' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>The 'Best Neighbour' Awards</button>
        </div>
      </div>

      {/* --- TAB 1: COMMAND CENTER --- */}
      {activeTab === 'command' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Issue Kudos Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex items-center">
                <ThumbsUp className="h-5 w-5 mr-2 text-amber-600" />
                <h2 className="text-lg font-bold text-amber-900">Issue Kudos & Points</h2>
              </div>
              <form onSubmit={handleIssueKudos} className="p-6 space-y-4 flex-1">
                <p className="text-xs text-slate-500 font-medium mb-4">Kudos instantly boost an employee's Activity Score and Annual Standings.</p>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Select Employee</label>
                  <select value={kudosEmpId} onChange={(e)=>setKudosEmpId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 text-sm">
                    {safeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Badge</label>
                    <select value={kudosBadge} onChange={(e)=>setKudosBadge(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 text-sm">
                      {STANDARD_BADGES.map(b => <option key={b.id} value={b.label}>{b.icon} {b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                      Bonus Points <span className="text-slate-400 font-normal ml-2">Increments of 100</span>
                    </label>
                    <input type="number" min="0" step="100" value={kudosPoints} onChange={(e)=>setKudosPoints(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 text-sm font-black text-amber-600" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Congratulatory Message</label>
                  <textarea value={kudosMessage} onChange={(e)=>setKudosMessage(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-amber-500 text-sm" rows="3" placeholder="Thank you for covering the overnight shift!" required />
                </div>
                <button type="submit" className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-md transition flex items-center justify-center shadow-sm">
                  <Zap className="h-4 w-4 mr-2" fill="currentColor"/> Issue Kudos
                </button>
              </form>
            </div>

            {/* Issue Prize Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-purple-50 flex items-center">
                <Gift className="h-5 w-5 mr-2 text-purple-600" />
                <h2 className="text-lg font-bold text-purple-900">Award a Tangible Prize</h2>
              </div>
              <form onSubmit={handleIssuePrize} className="p-6 space-y-4 flex-1">
                <p className="text-xs text-slate-500 font-medium mb-4">Prizes are displayed in the employee's digital wallet and grant flat 50 Gala points.</p>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Select Employee</label>
                  <select value={prizeEmpId} onChange={(e)=>setPrizeEmpId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm">
                    {safeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Prize Name</label>
                    <input type="text" value={prizeName} onChange={(e)=>setPrizeName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm" placeholder="e.g. Tim Hortons Card" required disabled={isPrizeUploading} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Value ($)</label>
                    <input type="number" min="0" step="0.01" value={prizeValue} onChange={(e)=>setPrizeValue(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm font-black text-purple-600" disabled={isPrizeUploading} />
                  </div>
                </div>
                
                {/* DIGITAL DELIVERY FIELDS */}
                <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center"><Hash className="h-3 w-3 mr-1"/> Promo Code</label>
                      <input type="text" value={prizeCode} onChange={(e)=>setPrizeCode(e.target.value)} className="w-full px-3 py-1.5 border border-purple-200 rounded text-sm focus:ring-purple-500 bg-white" placeholder="Optional" disabled={isPrizeUploading} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center"><LinkIcon className="h-3 w-3 mr-1"/> Redemption Link</label>
                      <input type="url" value={prizeLink} onChange={(e)=>setPrizeLink(e.target.value)} className="w-full px-3 py-1.5 border border-purple-200 rounded text-sm focus:ring-purple-500 bg-white" placeholder="https://" disabled={isPrizeUploading} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center"><Upload className="h-3 w-3 mr-1"/> Attach Gift Card Image / PDF</label>
                    <input type="file" onChange={(e) => setPrizeFile(e.target.files[0])} accept="image/*,.pdf" className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200" disabled={isPrizeUploading} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Congratulatory Message to Employee</label>
                  <textarea value={prizeNote} onChange={(e)=>setPrizeNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm" rows="2" placeholder="e.g. Thanks for stepping up!" disabled={isPrizeUploading} />
                </div>
                <button type="submit" disabled={isPrizeUploading} className="w-full mt-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-md transition flex items-center justify-center shadow-sm">
                  {isPrizeUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading Prize...</> : <><Gift className="h-4 w-4 mr-2" /> Award Prize & Send to Wallet</>}
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GALA ELIGIBILITY SETTINGS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full lg:col-span-1">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 flex items-center text-white">
                <ShieldAlert className="h-5 w-5 mr-2 text-teal-400" />
                <h2 className="text-lg font-bold">Gala Eligibility</h2>
              </div>
              <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[400px]">
                <p className="text-xs text-slate-500 mb-4 font-medium">Use this panel to exclude temporary staff or management from the $3000 grand prize competition.</p>
                <div className="space-y-2 divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                  {safeEmployees.map(emp => (
                    <div key={`eligibility_${emp.id}`} className={`flex items-center justify-between p-3 ${emp.excludeFromGala ? 'bg-slate-50 opacity-60' : 'bg-white'}`}>
                      <div className="overflow-hidden pr-2">
                        <div className="font-bold text-sm text-slate-800 truncate">{emp.name}</div>
                        <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                      </div>
                      <button 
                        onClick={() => toggleGalaEligibility(emp)}
                        className={`shrink-0 flex items-center text-xs font-bold px-2 py-1.5 rounded-full transition ${emp.excludeFromGala ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        {emp.excludeFromGala ? <ToggleLeft className="h-4 w-4 mr-1" /> : <ToggleRight className="h-4 w-4 mr-1" />}
                        {emp.excludeFromGala ? 'Excluded' : 'Eligible'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* UNIFIED COMPREHENSIVE REWARD LOG */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2 flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center">
                  <List className="h-5 w-5 mr-2 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-800">Comprehensive Reward Ledger</h3>
                </div>
                <select value={logFilterMonth} onChange={(e) => setLogFilterMonth(e.target.value)} className="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm">
                  <option value="All">All Time</option>
                  {logMonthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              
              <div className="p-0 overflow-y-auto max-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                    <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-200">
                      <th className="px-6 py-3 font-bold">Type</th>
                      <th className="px-6 py-3 font-bold">Date</th>
                      <th className="px-6 py-3 font-bold">Employee</th>
                      <th className="px-6 py-3 font-bold">Details</th>
                      <th className="px-6 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unifiedLog.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-slate-500">No reward records found for this period.</td></tr>
                    ) : (
                      unifiedLog.map((log) => {
                        const isKudo = log.type === 'kudo';
                        const emp = employees.find(e => e.id === log.employeeId);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition group">
                            <td className="px-6 py-3">
                              {isKudo ? (
                                <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200"><Star className="h-3 w-3 mr-1"/> Kudo</span>
                              ) : (
                                <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-200"><Gift className="h-3 w-3 mr-1"/> Prize</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm font-medium">{log.date}</td>
                            <td className="px-6 py-3 font-bold text-slate-800">{emp?.name || 'Unknown'}</td>
                            <td className="px-6 py-3">
                              {isKudo ? (
                                <div>
                                  <div className="text-sm font-bold text-slate-700 flex items-center">{log.badgeIcon} {log.badgeLabel} <span className="ml-2 text-amber-600">+{log.points} pts</span></div>
                                  <div className="text-xs text-slate-500 truncate max-w-[200px]" title={log.message}>"{log.message}"</div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-sm font-bold text-slate-700 flex items-center">{log.name} {log.value ? <span className="ml-2 text-emerald-600">${log.value}</span> : ''}</div>
                                  <div className="text-xs text-slate-500 truncate max-w-[200px]" title={log.note}>"{log.note}"</div>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right">
                               <button 
                                  onClick={() => isKudo ? onRemoveKudos(log.id) : onRemovePrize(log.id)} 
                                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition opacity-0 group-hover:opacity-100" 
                                  title={`Delete ${isKudo ? 'Kudo' : 'Prize'}`}
                                >
                                  <Trash2 className="h-4 w-4"/>
                               </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: MONTHLY BATTLEFIELD --- */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-teal-600"/> Monthly Leaderboard</h2>
            <div className="flex items-center space-x-3">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-bold text-slate-700 bg-white shadow-sm">
                {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <button onClick={exportMonthlyPayout} className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-100 transition shadow-sm">
                <Download className="h-4 w-4 mr-1.5" /> Export Payout CSV
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-b from-slate-50 to-white flex-1 overflow-y-auto">
            {!isBonusActive && (
              <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm font-bold text-center">
                Bonus System is currently INACTIVE in Settings. Leaderboard is for tracking only.
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-bold">Rank</th>
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-4 py-3 font-bold text-center">Shifts</th>
                  <th className="px-4 py-3 font-bold text-right text-teal-700">Activity Score</th>
                  <th className="px-4 py-3 font-bold text-right text-emerald-600">Proj. Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeLeaderboard.eligible.length === 0 && activeLeaderboard.ineligible.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-500">No active employees found.</td></tr>
                ) : (
                  <>
                    {activeLeaderboard.eligible.map((r, idx) => {
                      let bonus = 0;
                      if (isBonusActive) {
                        if (idx === 0) bonus = safeBonusSettings.monthly[0] || 0;
                        if (idx === 1) bonus = safeBonusSettings.monthly[1] || 0;
                        if (idx === 2) bonus = safeBonusSettings.monthly[2] || 0;
                      }
                      return (
                        <tr key={r.emp.id} className={idx < 3 ? 'bg-yellow-50/30' : ''}>
                          <td className="px-4 py-4 font-black text-slate-700">
                            {idx === 0 ? <span className="flex items-center text-yellow-500"><Trophy className="h-5 w-5 mr-1"/> 1</span> : 
                             idx === 1 ? <span className="flex items-center text-slate-400"><Medal className="h-5 w-5 mr-1"/> 2</span> : 
                             idx === 2 ? <span className="flex items-center text-amber-600"><Award className="h-5 w-5 mr-1"/> 3</span> : 
                             <span className="ml-2">{idx + 1}</span>}
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-800">{r.emp.name}</td>
                          <td className="px-4 py-4 text-center font-medium text-slate-600">{r.shiftCount}</td>
                          <td className="px-4 py-4 text-right font-black text-teal-700">{r.activityScore} pts</td>
                          <td className="px-4 py-4 text-right font-black text-emerald-600">{bonus > 0 ? `+$${bonus}` : '-'}</td>
                        </tr>
                      )
                    })}
                    {activeLeaderboard.ineligible.length > 0 && (
                      <tr><td colSpan="5" className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Ineligible (Under 10 Shifts)</td></tr>
                    )}
                    {activeLeaderboard.ineligible.map(r => (
                      <tr key={r.emp.id} className="opacity-60 bg-slate-50">
                         <td className="px-4 py-3 font-bold text-slate-400 text-xs">N/A</td>
                         <td className="px-4 py-3 font-medium text-slate-700">{r.emp.name}</td>
                         <td className="px-4 py-3 text-center font-medium text-slate-600 text-xs">{r.shiftCount}</td>
                         <td className="px-4 py-3 text-right font-bold text-teal-700 text-xs">{r.activityScore} pts</td>
                         <td className="px-4 py-3 text-right text-slate-400 text-xs">-</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: THE 'BEST NEIGHBOUR' ANNUAL AWARDS --- */}
      {activeTab === 'gala' && (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none"><Star size={400} /></div>
          
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between relative z-10 backdrop-blur-sm">
            <div>
              <h2 className="text-2xl font-black text-amber-400 flex items-center tracking-tight mb-2">
                <Trophy className="h-6 w-6 mr-3 text-amber-400" /> The 'Best Neighbour' Annual Awards
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="bg-amber-900/40 border border-amber-500/50 text-amber-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">
                  1st Place: Best Neighbour ($3000)
                </div>
                <div className="bg-slate-800/60 border border-slate-500/50 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">
                  2nd Place: Great Neighbour ($2000)
                </div>
                <div className="bg-amber-900/20 border border-amber-700/30 text-amber-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">
                  3rd Place: Good Neighbour ($1000)
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <select 
                value={galaYear} 
                onChange={(e) => setGalaYear(e.target.value)} 
                className="bg-slate-800 border border-slate-600 text-white font-bold px-3 py-2 rounded-md text-sm focus:outline-none shadow-sm"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y} Gala</option>)}
              </select>
              <button onClick={exportGalaRoster} className="flex items-center text-xs font-bold text-slate-900 bg-amber-400 border border-amber-300 px-4 py-2 rounded-md hover:bg-amber-300 transition shadow-[0_0_15px_rgba(251,191,36,0.3)] whitespace-nowrap">
                <Download className="h-4 w-4 mr-2" /> Export Roster CSV
              </button>
            </div>
          </div>
          
          {/* MINT TROPHIES ACTION BAR */}
          <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-800 relative z-10 flex items-center justify-between">
            <div className="flex items-center text-slate-400 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" /> Wait until year-end to mint trophies to employee profiles.
            </div>
            <button 
              onClick={handleMintTrophies}
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black px-4 py-1.5 rounded-md text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.2)] transition"
            >
              Award {galaYear} Trophies
            </button>
          </div>

          <div className="p-0 flex-1 overflow-y-auto relative z-10">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-800/80 backdrop-blur sticky top-0">
                <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-700">
                  <th className="px-6 py-4 font-bold">Rank</th>
                  <th className="px-6 py-4 font-bold">Employee</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold text-center text-slate-300">Base Activity Pts</th>
                  <th className="px-6 py-4 font-bold text-center text-blue-400">Kudos Pts</th>
                  <th className="px-6 py-4 font-bold text-center text-purple-400">Prize Pts</th>
                  <th className="px-6 py-4 font-bold text-right text-amber-400">Total Gala Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {annualGalaStandings.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12 text-slate-500">No data available for {galaYear}.</td></tr>
                ) : (
                  annualGalaStandings.map((r, idx) => (
                    <tr key={r.emp.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4 font-black text-slate-500">
                        {idx === 0 ? <span className="text-yellow-400 text-lg">1st</span> : idx === 1 ? <span className="text-slate-300 text-lg">2nd</span> : idx === 2 ? <span className="text-amber-600 text-lg">3rd</span> : `${idx + 1}th`}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-200">{r.emp.name}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{r.emp.role}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-300">{r.baseActivityScore.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-blue-400">{r.kudosPts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-purple-400">{r.prizePts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-400 text-lg">{r.totalGalaScore.toLocaleString()} pts</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
