import React, { useState, useMemo } from 'react';
import { Award, Gift, Trophy, Star, Medal, Download, Plus, Heart, ThumbsUp, Zap, Trash2, CalendarDays, TrendingUp, Link as LinkIcon, Hash } from 'lucide-react';

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
  isBonusActive, bonusSettings
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

  // --- MATH ENGINE: PRIVACY-SAFE "ACTIVITY SCORE" ---
  const getLeaderboardForMonth = (yearStr, monthStr) => {
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1;
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    let results = safeEmployees.map(emp => {
      // 1. Shifts
      const empShifts = shifts.filter(s => {
        if (s.employeeId !== emp.id || !s.date || !s.endTime) return false;
        const shiftDate = new Date(`${s.date}T${s.endTime}`);
        return shiftDate >= start && shiftDate <= end;
      });

      // 2. Activity Score Calculation
      let activityScore = 0;

      empShifts.forEach(s => {
        activityScore += 100; // Base points for shift
        
        // Mileage bonus
        const hasMileage = expenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
        if (hasMileage) activityScore += 50;

        // Client Expense bonus
        const hasOop = clientExpenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
        if (hasOop) activityScore += 50;
      });

      // 3. Kudos Points
      const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date) >= start && parseLocalSafe(k.date) <= end);
      const kPoints = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);

      activityScore += kPoints;

      return { 
        emp, 
        shiftCount: empShifts.length, 
        kudosPoints: kPoints, 
        activityScore 
      };
    });

    // Rank them by Activity Score
    const eligible = results.filter(r => r.shiftCount >= 10).sort((a, b) => b.activityScore - a.activityScore);
    const ineligible = results.filter(r => r.shiftCount < 10).sort((a, b) => b.activityScore - a.activityScore);
    
    return { eligible, ineligible };
  };

  const activeLeaderboard = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return getLeaderboardForMonth(y, m);
  }, [selectedMonth, safeEmployees, shifts, expenses, clientExpenses, kudos]);

  // --- MATH ENGINE: RACE TO THE GALA (ANNUAL) ---
  const annualGalaStandings = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const scores = {}; 
    safeEmployees.forEach(e => { 
      scores[e.id] = { emp: e, monthsWon: [], trophyPts: 0, kudosPts: 0, prizePts: 0, galaScore: 0 }; 
    });
    
    // Tally Monthly Trophies
    for (let m = 0; m <= 11; m++) {
      const lb = getLeaderboardForMonth(currentYear.toString(), String(m + 1).padStart(2, '0'));
      if (lb.eligible[0] && scores[lb.eligible[0].emp.id]) { scores[lb.eligible[0].emp.id].trophyPts += 300; scores[lb.eligible[0].emp.id].monthsWon.push(monthNames[m]); }
      if (lb.eligible[1] && scores[lb.eligible[1].emp.id]) { scores[lb.eligible[1].emp.id].trophyPts += 200; scores[lb.eligible[1].emp.id].monthsWon.push(monthNames[m]); }
      if (lb.eligible[2] && scores[lb.eligible[2].emp.id]) { scores[lb.eligible[2].emp.id].trophyPts += 100; scores[lb.eligible[2].emp.id].monthsWon.push(monthNames[m]); }
    }

    // Tally Kudos
    kudos.forEach(k => {
      const d = parseLocalSafe(k.date);
      if (d.getFullYear() === currentYear && scores[k.employeeId]) {
        scores[k.employeeId].kudosPts += Number(k.points || 0);
      }
    });

    // Tally Prizes
    prizes.forEach(p => {
      const d = parseLocalSafe(p.date);
      if (d.getFullYear() === currentYear && scores[p.employeeId]) {
        scores[p.employeeId].prizePts += 50; // Flat 50 gala points per physical prize won
      }
    });

    Object.values(scores).forEach(s => {
      s.galaScore = s.trophyPts + s.kudosPts + s.prizePts;
    });

    // Filter out 0 scores
    return Object.values(scores).filter(s => s.galaScore > 0).sort((a, b) => b.galaScore - a.galaScore);
  }, [safeEmployees, shifts, expenses, clientExpenses, kudos, prizes]);

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
      message: kudosMessage
    });
    setKudosMessage('');
    setKudosPoints(100); 
  };

  const handleIssuePrize = (e) => {
    e.preventDefault();
    if (!prizeEmpId || !prizeName) return;
    onAddPrize({
      employeeId: prizeEmpId,
      date: new Date().toISOString().split('T')[0],
      name: prizeName,
      value: Number(prizeValue || 0),
      note: prizeNote,
      code: prizeCode,
      link: prizeLink
    });
    setPrizeName('');
    setPrizeValue('');
    setPrizeNote('');
    setPrizeCode('');
    setPrizeLink('');
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
    const headers = ['Rank', 'Employee', 'Role', 'Months Won', 'Trophy Pts (300)', 'Kudos Pts (100)', 'Prize Pts (50)', 'Total Gala Score'];
    const rows = annualGalaStandings.map((r, idx) => [
      idx + 1, `"${r.emp.name}"`, `"${r.emp.role}"`, `"${r.monthsWon.join(', ')}"`,
      r.trophyPts, r.kudosPts, r.prizePts, r.galaScore
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Gala_Planning_Roster_${new Date().getFullYear()}.csv`);
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
          <p className="text-slate-500 mt-1 font-medium">Issue kudos, track leaderboards, and plan the Gala.</p>
        </div>
        <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0">
          <button onClick={() => setActiveTab('command')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'command' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Command Center</button>
          <button onClick={() => setActiveTab('monthly')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monthly Battlefield</button>
          <button onClick={() => setActiveTab('gala')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${activeTab === 'gala' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Race to the Gala</button>
        </div>
      </div>

      {/* --- TAB 1: COMMAND CENTER --- */}
      {activeTab === 'command' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Issue Kudos Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex items-center">
              <ThumbsUp className="h-5 w-5 mr-2 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-900">Issue Kudos & Points</h2>
            </div>
            <form onSubmit={handleIssueKudos} className="p-6 space-y-4 flex-1">
              <p className="text-xs text-slate-500 font-medium mb-4">Kudos instantly boost an employee's Activity Score and Gala Standings.</p>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Public Message</label>
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
              <p className="text-xs text-slate-500 font-medium mb-4">Prizes populate in the employee's wallet and grant flat 50 Gala points.</p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Employee</label>
                <select value={prizeEmpId} onChange={(e)=>setPrizeEmpId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm">
                  {safeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Prize Name</label>
                  <input type="text" value={prizeName} onChange={(e)=>setPrizeName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm" placeholder="e.g. Tim Hortons Card" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Value ($)</label>
                  <input type="number" min="0" step="0.01" value={prizeValue} onChange={(e)=>setPrizeValue(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm font-black text-purple-600" />
                </div>
              </div>
              
              {/* DIGITAL DELIVERY FIELDS */}
              <div className="grid grid-cols-2 gap-4 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center"><Hash className="h-3 w-3 mr-1"/> Promo Code</label>
                  <input type="text" value={prizeCode} onChange={(e)=>setPrizeCode(e.target.value)} className="w-full px-3 py-1.5 border border-purple-200 rounded text-sm focus:ring-purple-500 bg-white" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center"><LinkIcon className="h-3 w-3 mr-1"/> Redemption Link</label>
                  <input type="url" value={prizeLink} onChange={(e)=>setPrizeLink(e.target.value)} className="w-full px-3 py-1.5 border border-purple-200 rounded text-sm focus:ring-purple-500 bg-white" placeholder="https://" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Private Admin Note</label>
                <textarea value={prizeNote} onChange={(e)=>setPrizeNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 text-sm" rows="2" placeholder="e.g. Purchased with corporate card" />
              </div>
              <button type="submit" className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-md transition flex items-center justify-center shadow-sm">
                <Gift className="h-4 w-4 mr-2" /> Award Prize & Send to Wallet
              </button>
            </form>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Reward Activity</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
              
              {/* Kudos Feed */}
              <div className="space-y-2">
                {kudos.length === 0 ? <div className="text-sm text-slate-400 italic">No kudos issued.</div> : kudos.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(k => {
                  const emp = employees.find(e => e.id === k.employeeId);
                  return (
                    <div key={k.id} className="flex justify-between items-center p-3 border border-amber-100 bg-amber-50/30 rounded-lg">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{emp?.name || 'Unknown'} <span className="font-normal text-slate-500 text-xs ml-2">{k.date}</span></div>
                        <div className="text-xs font-medium text-amber-700 flex items-center mt-1">{k.badgeIcon} {k.badgeLabel} <span className="ml-2 font-black">+{k.points} pts</span></div>
                      </div>
                      <button onClick={() => onRemoveKudos(k.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  )
                })}
              </div>

              {/* Prize Feed */}
              <div className="space-y-2">
                {prizes.length === 0 ? <div className="text-sm text-slate-400 italic">No prizes issued.</div> : prizes.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(p => {
                  const emp = employees.find(e => e.id === p.employeeId);
                  return (
                    <div key={p.id} className="flex justify-between items-center p-3 border border-purple-100 bg-purple-50/30 rounded-lg">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{emp?.name || 'Unknown'} <span className="font-normal text-slate-500 text-xs ml-2">{p.date}</span></div>
                        <div className="text-xs font-medium text-purple-700 flex items-center mt-1"><Gift className="h-3 w-3 mr-1"/> {p.name} {p.value ? `($${p.value})` : ''}</div>
                      </div>
                      <button onClick={() => onRemovePrize(p.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  )
                })}
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

      {/* --- TAB 3: RACE TO THE GALA --- */}
      {activeTab === 'gala' && (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none"><Star size={400} /></div>
          
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between relative z-10 backdrop-blur-sm">
            <div>
              <h2 className="text-2xl font-black text-amber-400 flex items-center tracking-tight">
                <Trophy className="h-6 w-6 mr-3 text-amber-400" /> The Race to the Gala
              </h2>
              <p className="text-slate-400 text-xs font-medium mt-1 tracking-wider uppercase">Annual Leaderboard & Awards Roster</p>
            </div>
            <button onClick={exportGalaRoster} className="flex items-center text-xs font-bold text-slate-900 bg-amber-400 border border-amber-300 px-4 py-2 rounded-md hover:bg-amber-300 transition shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <Download className="h-4 w-4 mr-2" /> Export Gala CSV
            </button>
          </div>

          <div className="p-0 flex-1 overflow-y-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800/80 backdrop-blur sticky top-0">
                <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-700">
                  <th className="px-6 py-4 font-bold">Rank</th>
                  <th className="px-6 py-4 font-bold">VIP Employee</th>
                  <th className="px-6 py-4 font-bold">Months Won</th>
                  <th className="px-6 py-4 font-bold text-center text-yellow-500">Trophy Pts (300)</th>
                  <th className="px-6 py-4 font-bold text-center text-blue-400">Kudos Pts (100)</th>
                  <th className="px-6 py-4 font-bold text-center text-purple-400">Prize Pts (50)</th>
                  <th className="px-6 py-4 font-bold text-right text-amber-400">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {annualGalaStandings.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-12 text-slate-500">No data available for the current year.</td></tr>
                ) : (
                  annualGalaStandings.map((r, idx) => (
                    <tr key={r.emp.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4 font-black text-slate-500">
                        {idx === 0 ? <span className="text-yellow-400 text-lg">1st</span> : idx === 1 ? <span className="text-slate-300 text-lg">2nd</span> : idx === 2 ? <span className="text-amber-600 text-lg">3rd</span> : `${idx + 1}th`}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-200">{r.emp.name}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-medium max-w-[150px] truncate" title={r.monthsWon.join(', ')}>
                        {r.monthsWon.length > 0 ? r.monthsWon.join(', ') : '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-yellow-500">{r.trophyPts}</td>
                      <td className="px-6 py-4 text-center font-medium text-blue-400">{r.kudosPts}</td>
                      <td className="px-6 py-4 text-center font-medium text-purple-400">{r.prizePts}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-400 text-lg">{r.galaScore} pts</td>
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
