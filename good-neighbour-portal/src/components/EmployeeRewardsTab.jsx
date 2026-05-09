import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  CheckCircle, 
  Clock, 
  Gift, 
  ExternalLink, 
  FileText,
  Loader2 
} from 'lucide-react';

// ==========================================
// INLINE HELPERS
// ==========================================
const parseLocalSafe = (dateStr) => {
  try {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'number') return new Date(dateStr);
    if (typeof dateStr === 'object') {
      if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
      if (typeof dateStr.toDate === 'function') return dateStr.toDate();
      if (typeof dateStr.seconds === 'number') return new Date(dateStr.seconds * 1000);
      return new Date();
    }
    const str = String(dateStr);
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) { 
    return new Date(); 
  }
};

const calculateEarnings = (emp, start, end, shifts, expenses, clientExpenses, kudos = [], prizes = []) => {
  if(!emp || !Array.isArray(shifts)) return { shiftCount: 0, totalHours: 0, shiftEarnings: 0, kmEarnings: 0, oop: 0, activityScore: 0, totalEarnings: 0 };
  
  const empShifts = shifts.filter(s => {
    if (!s || s.employeeId !== emp.id || !s.date || !s.endTime) return false;
    const shiftDate = new Date(`${s.date}T${s.endTime}`);
    if (isNaN(shiftDate.getTime())) return false; 
    return shiftDate >= start && shiftDate <= end && shiftDate <= new Date();
  });
  
  let shiftEarnings = 0; 
  let totalHours = 0;
  if (emp.payType === 'salary') {
    shiftEarnings = (Number(emp.annualSalary) || 0) / 12; 
  } else {
    empShifts.forEach(s => {
      if (emp.payType === 'hourly' || s.isHourlyOverride) {
        let hrs = 0;
        if (s.actualStartTime && s.actualEndTime) {
           hrs = (new Date(s.actualEndTime) - new Date(s.actualStartTime)) / 3600000;
        } else {
           const [sH, sM] = String(s.startTime || '00:00').split(':').map(Number); 
           const [eH, eM] = String(s.endTime || '00:00').split(':').map(Number);
           if(!isNaN(sH) && !isNaN(eH)) { 
             let h = (eH + eM/60) - (sH + sM/60); 
             if (h < 0) h += 24; 
             hrs += h; 
           }
        }
        const rate = s.isHourlyOverride ? (Number(s.hourlyRate) || 0) : (Number(emp.hourlyWage) || 22.50);
        shiftEarnings += (hrs * rate);
      } else {
        shiftEarnings += (Number(emp.perVisitRate) || 45); 
      }
    });
  }
  
  const kmEarnings = (Array.isArray(expenses) ? expenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.kilometers) || 0) * 0.68, 0);
  const oop = (Array.isArray(clientExpenses) ? clientExpenses : []).filter(e => e && e.employeeId === emp.id && e.status === 'approved' && parseLocalSafe(e.date) >= start && parseLocalSafe(e.date) <= end).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  let activityScore = 0;
  empShifts.forEach(s => {
    activityScore += 100;
    const hasMileage = expenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
    if (hasMileage) activityScore += 50;
    const hasOop = clientExpenses.some(e => e.employeeId === emp.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved');
    if (hasOop) activityScore += 50;
  });

  const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date) >= start && parseLocalSafe(k.date) <= end);
  const kPoints = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
  activityScore += kPoints;

  // --- JEOPARDY MATH: Deduct Spent Points ---
  const empPrizes = prizes.filter(p => p.employeeId === emp.id && parseLocalSafe(p.date) >= start && parseLocalSafe(p.date) <= end);
  const spentPts = empPrizes.reduce((sum, p) => sum + Number(p.cost || 0), 0);
  activityScore -= spentPts;

  return { shiftCount: empShifts.length, totalHours, shiftEarnings, kmEarnings, oop, activityScore, totalEarnings: shiftEarnings + kmEarnings + oop };
};

const getMonthlyLeaderboard = (year, month, shifts, expenses, clientExpenses, employees, kudos, prizes) => {
  if(!Array.isArray(employees)) return [];
  const start = new Date(year, month, 1); 
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  let results = employees.map(emp => { 
    const data = calculateEarnings(emp, start, end, shifts, expenses, clientExpenses, kudos, prizes); 
    return { emp, ...data }; 
  });
  return results.filter(r => r.shiftCount >= 10).sort((a, b) => b.activityScore - a.activityScore);
};

// ==========================================
// COMPONENT
// ==========================================
export default function EmployeeRewardsTab({ currentUser, employees, shifts, expenses, clientExpenses, kudos = [], prizes = [], prizeTiers = [], isBonusActive, bonusSettings, onAddPrize }) {
  const now = new Date();
  const safeBonusSettings = bonusSettings || { monthly: [100, 50, 20], annual: [3000, 2000, 1000] };
  const safePrizeTiers = Array.isArray(prizeTiers) ? prizeTiers : [];
  
  const [isClaiming, setIsClaiming] = useState(null); // Locks UI during Firebase sync
  
  const safeEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin' && !e.excludeFromGala);
  }, [employees]);

  const [selectedLeaderboardMonth, setSelectedLeaderboardMonth] = useState(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedPrizeYear, setSelectedPrizeYear] = useState(() => now.getFullYear().toString());
  const [selectedKudosMonth, setSelectedKudosMonth] = useState('All');

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

  const fullLeaderboard = useMemo(() => {
    const [y, m] = selectedLeaderboardMonth.split('-');
    return getMonthlyLeaderboard(parseInt(y, 10), parseInt(m, 10) - 1, shifts, expenses, clientExpenses, safeEmployees, kudos, prizes);
  }, [selectedLeaderboardMonth, shifts, expenses, clientExpenses, safeEmployees, kudos, prizes]);

  const currentMonthShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
      const d = parseLocalSafe(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [shifts, currentUser.id, now]);
  
  const shiftProgress = Math.min(currentMonthShifts.length, 10);
  const progressPercent = (shiftProgress / 10) * 100;
  const isQualified = shiftProgress >= 10;

  const currentMonthGalaScore = useMemo(() => {
    let score = 0;
    currentMonthShifts.forEach(sh => {
      score += 100;
      const hasMileage = expenses.some(e => e.employeeId === currentUser.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
      if (hasMileage) score += 50;
      const hasOop = clientExpenses.some(e => e.employeeId === currentUser.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved');
      if (hasOop) score += 50;
    });

    const thisMonthKudos = kudos.filter(k => k.employeeId === currentUser.id && parseLocalSafe(k.date).getMonth() === now.getMonth() && parseLocalSafe(k.date).getFullYear() === now.getFullYear());
    score += thisMonthKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
    
    // --- JEOPARDY MATH ---
    const thisMonthPrizes = prizes.filter(p => p.employeeId === currentUser.id && parseLocalSafe(p.date).getMonth() === now.getMonth() && parseLocalSafe(p.date).getFullYear() === now.getFullYear());
    const spentThisMonth = thisMonthPrizes.reduce((sum, p) => sum + Number(p.cost || 0), 0);
    score -= spentThisMonth;
    
    return score;
  }, [currentMonthShifts, expenses, clientExpenses, kudos, prizes, currentUser.id, now]);

  const myPrizes = useMemo(() => prizes.filter(p => p.employeeId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date)), [prizes, currentUser.id]);
  const yearOptions = useMemo(() => {
    const years = myPrizes.map(p => parseLocalSafe(p.date).getFullYear());
    years.push(now.getFullYear());
    return [...new Set(years)].sort((a,b) => b - a).map(String);
  }, [myPrizes, now]);
  const filteredPrizes = useMemo(() => myPrizes.filter(p => parseLocalSafe(p.date).getFullYear().toString() === selectedPrizeYear), [myPrizes, selectedPrizeYear]);
  const myPrizesThisYear = useMemo(() => myPrizes.filter(p => parseLocalSafe(p.date).getFullYear() === now.getFullYear()), [myPrizes, now]);

  const myKudos = useMemo(() => kudos.filter(k => k.employeeId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date)), [kudos, currentUser.id]);
  const kudosMonthOptions = useMemo(() => {
    const opts = new Set();
    myKudos.forEach(k => {
      const d = parseLocalSafe(k.date);
      opts.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    opts.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const sortedOpts = [...opts].sort().reverse().map(val => {
      const [y, m] = val.split('-');
      const label = new Date(parseInt(y, 10), parseInt(m, 10)-1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { value: val, label };
    });
    return [{ value: 'All', label: 'All Time' }, ...sortedOpts];
  }, [myKudos, now]);
  const filteredKudos = useMemo(() => myKudos.filter(k => {
      if (selectedKudosMonth === 'All') return true;
      const d = parseLocalSafe(k.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return mKey === selectedKudosMonth;
  }), [myKudos, selectedKudosMonth]);

  // --- ANNUAL STANDINGS WITH JEOPARDY DEDUCTIONS ---
  const annualStandings = useMemo(() => {
    if(safeEmployees.length === 0) return []; 
    const currentYear = now.getFullYear();
    const scores = {}; 
    safeEmployees.forEach(e => { scores[e.id] = { emp: e, baseActivityScore: 0, kudosPts: 0, prizePts: 0, totalGalaScore: 0 }; });

    Object.values(scores).forEach(s => {
      const emp = s.emp;
      let baseScore = 0;
      const empShifts = shifts.filter(sh => {
        if (sh.employeeId !== emp.id || !sh.date || !sh.endTime) return false;
        return new Date(`${sh.date}T${sh.endTime}`).getFullYear() === currentYear;
      });

      empShifts.forEach(sh => {
        baseScore += 100;
        if (expenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved')) baseScore += 50;
        if (clientExpenses.some(e => e.employeeId === emp.id && e.clientId === sh.clientId && e.date === sh.date && e.status === 'approved')) baseScore += 50;
      });
      s.baseActivityScore = baseScore;
      
      const empKudos = kudos.filter(k => k.employeeId === emp.id && parseLocalSafe(k.date).getFullYear() === currentYear);
      s.kudosPts = empKudos.reduce((sum, k) => sum + Number(k.points || 0), 0);
      
      // JEOPARDY MATH
      const empPrizes = prizes.filter(p => p.employeeId === emp.id && parseLocalSafe(p.date).getFullYear() === currentYear);
      s.prizePts = empPrizes.reduce((sum, p) => sum + Number(p.cost || 0), 0);
      
      s.totalGalaScore = s.baseActivityScore + s.kudosPts - s.prizePts;
    });

    return Object.values(scores).filter(s => s.totalGalaScore > 0 || s.emp.id === currentUser.id).sort((a, b) => b.totalGalaScore - a.totalGalaScore);
  }, [shifts, expenses, clientExpenses, safeEmployees, kudos, prizes, now, currentUser.id]);

  // ==========================================
  // ALL-TIME WALLET MATH & CLAIM HANDLER
  // ==========================================
  const allTimeShifts = (shifts || []).filter(s => {
    if (s.employeeId !== currentUser.id || !s.date || !s.endTime) return false;
    return new Date(`${s.date}T${s.endTime}`) <= now;
  });

  let walletActivityScore = 0;
  allTimeShifts.forEach(s => {
    walletActivityScore += 100;
    if (expenses.some(e => e.employeeId === currentUser.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved')) walletActivityScore += 50;
    if (clientExpenses.some(e => e.employeeId === currentUser.id && e.clientId === s.clientId && e.date === s.date && e.status === 'approved')) walletActivityScore += 50;
  });

  const walletKudos = (kudos || []).filter(k => k.employeeId === currentUser.id).reduce((sum, k) => sum + (Number(k.points) || 0), 0);
  const lifetimeEarned = walletActivityScore + walletKudos;
  const lifetimeSpent = myPrizes.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const redeemablePoints = lifetimeEarned - lifetimeSpent;

  const handleClaimPrize = async (tier) => {
    if (redeemablePoints >= tier.cost && !isClaiming) {
      setIsClaiming(tier.id);
      if(onAddPrize) {
        await onAddPrize({
          employeeId: currentUser.id,
          name: tier.label,
          cost: tier.cost,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          acknowledged: true 
        }, null);
      }
      setIsClaiming(null);
    }
  };

  if (!isBonusActive) return (
    <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
      <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-slate-600">Bonus System Inactive</h3>
      <p className="text-sm text-slate-500 mt-2">The rewards platform has been paused by administration.</p>
    </div>
  );

  const topThree = fullLeaderboard.slice(0, 3);
  const globalRankings = fullLeaderboard.slice(3);
  const badgeIcons = [<Trophy className="h-10 w-10 mb-3" />, <Medal className="h-10 w-10 mb-3" />, <Award className="h-10 w-10 mb-3" />];
  const colors = ["bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400", "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400", "bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700"];
  const pastTrophies = currentUser?.pastTrophies || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`bg-white rounded-xl shadow-sm border ${isQualified ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'} p-6 flex flex-col justify-center h-full`}>
           <h3 className="font-bold text-slate-800 flex items-center mb-2">
             {isQualified ? <CheckCircle className="h-5 w-5 mr-2 text-emerald-500"/> : <Clock className="h-5 w-5 mr-2 text-slate-400"/>} Leaderboard Qualification
           </h3>
           <p className="text-xs text-slate-500 mb-4">{isQualified ? 'You have qualified for the global rankings!' : 'Complete 10 shifts to enter the global rankings.'}</p>
           <div className="flex items-center w-full">
             <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200">
               <div className={`h-4 rounded-full transition-all duration-1000 ${isQualified ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${progressPercent}%` }}></div>
             </div>
             <div className="ml-4 font-black text-slate-700 w-16 text-right">{shiftProgress} / 10</div>
           </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Star size={120} /></div>
           <div className="w-full sm:w-2/3 shrink-0 relative z-10">
               <h3 className="font-bold text-amber-400 flex items-center text-lg mb-1"><Star className="h-5 w-5 mr-2 fill-current"/> Current Month Progress</h3>
               <p className="text-xs text-slate-400">Your 'Best Neighbour' Gala points earned so far this month.</p>
           </div>
           <div className="w-full sm:w-1/3 flex items-center justify-start sm:justify-end relative z-10">
               <div className="text-4xl font-black text-amber-400">{currentMonthGalaScore.toLocaleString()} <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">pts</span></div>
           </div>
        </div>
      </div>

      {/* --- INJECTED: NEW WALLET & REDEMPTION STORE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden h-full flex flex-col justify-center">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Award size={150} /></div>
            <div className="relative z-10">
              <h3 className="text-amber-100 font-bold text-sm flex items-center mb-2 uppercase tracking-widest"><Star className="h-4 w-4 mr-1.5" /> My Gala Wallet</h3>
              <div className="text-4xl font-black text-white tracking-tight mb-6">{redeemablePoints.toLocaleString()} <span className="text-lg font-medium text-amber-200">pts</span></div>
              <div className="space-y-2 text-sm font-medium text-amber-100">
                <div className="flex justify-between border-b border-amber-600/50 pb-1">
                  <span>Lifetime Earned:</span>
                  <span className="text-white">{lifetimeEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-amber-600/50 pb-1">
                  <span>Lifetime Spent:</span>
                  <span className="text-white">{lifetimeSpent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Gift className="h-5 w-5 mr-2 text-purple-500"/> Redeem Prizes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {safePrizeTiers.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-8 border border-dashed border-slate-300 rounded-xl bg-slate-50">The prize store is currently empty.</div>
            ) : (
              safePrizeTiers.sort((a,b)=>a.cost - b.cost).map(tier => {
                const hasReachedLimit = tier.limitOnePerYear && myPrizesThisYear.some(p => p.name === tier.label);
                const canAfford = redeemablePoints >= tier.cost && !hasReachedLimit;
                const isProcessing = isClaiming === tier.id;

                return (
                  <div key={tier.id} className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${canAfford ? 'border-amber-200 bg-amber-50 hover:shadow-md' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-3xl">{tier.icon}</span>
                        <span className="text-xs font-black px-2 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700">{Number(tier.cost).toLocaleString()} pts</span>
                      </div>
                      <h4 className="font-black text-slate-800">{tier.label}</h4>
                      <p className="text-xs font-medium text-slate-500 mt-1">{tier.desc}</p>
                      {tier.limitOnePerYear && <div className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-wider">Limit 1 Per Year</div>}
                    </div>
                    <button 
                      onClick={() => handleClaimPrize(tier)} 
                      disabled={!canAfford || isClaiming !== null}
                      className={`mt-4 w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center transition ${isProcessing ? 'bg-slate-800 text-white cursor-wait' : canAfford ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' : hasReachedLimit ? 'bg-rose-100 text-rose-500 border border-rose-200 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : hasReachedLimit ? 'Limit Reached' : canAfford ? 'Claim Reward' : 'Need More Points'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      {/* --- END OF INJECTED SECTION --- */}

      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={200} /></div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between relative z-10 gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black flex items-center tracking-tight"><Star className="mr-2 h-6 w-6 text-yellow-300" fill="currentColor"/> {monthOptions.find(o => o.value === selectedLeaderboardMonth)?.label || 'Leaderboard'}</h2>
            <p className="text-teal-100 text-sm font-medium mt-1">Activity Scores determine rankings. 100pts per shift. 50pts per mileage/expense log.</p>
          </div>
          <select value={selectedLeaderboardMonth} onChange={(e) => setSelectedLeaderboardMonth(e.target.value)} className="px-3 py-1.5 border border-teal-500 rounded-md bg-teal-800 text-white text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        
        {fullLeaderboard.length === 0 ? (
           <div className="relative z-10 bg-black/10 rounded-xl p-8 text-center border border-white/10"><p className="font-semibold text-teal-50">No one qualified for the leaderboard in this period.</p><p className="text-xs text-teal-200 mt-2">Check back soon!</p></div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topThree.map((winner, index) => (
                <div key={winner.emp.id} className={`${colors[index]} rounded-xl p-4 shadow-md flex flex-col items-center text-center transform hover:-translate-y-1 transition duration-300 relative overflow-hidden`}>
                  {winner.emp.id === currentUser.id && (<div className="absolute top-0 w-full bg-black/20 text-white text-[10px] font-black uppercase tracking-widest py-1">You</div>)}
                  <div className={winner.emp.id === currentUser.id ? 'mt-4' : ''}>{badgeIcons[index]}</div>
                  <div className="font-black text-lg leading-tight">{String(winner.emp.name || 'Unknown')}</div>
                  <div className="text-xs font-bold opacity-80 mb-1">{index + 1}{index===0?'st':index===1?'nd':'rd'} Place</div>
                  <div className="text-sm bg-white/30 px-3 py-1 rounded mb-4 font-bold border border-white/20 shadow-inner">{winner.activityScore} pts</div>
                  <div className="mt-auto bg-black/20 rounded-full px-4 py-1.5 font-bold text-sm shadow-sm flex items-center border border-black/10">+${Number(safeBonusSettings.monthly[index] || 0).toFixed(0)} Bonus</div>
                </div>
              ))}
            </div>
            {globalRankings.length > 0 && (
              <div className="mt-6 bg-black/20 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                <h3 className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-3 pl-2 border-b border-white/10 pb-2">Global Rankings</h3>
                <div className="space-y-2">
                  {globalRankings.map((ranked, idx) => (
                    <div key={ranked.emp.id} className={`flex items-center justify-between p-3 rounded-lg ${ranked.emp.id === currentUser.id ? 'bg-teal-500/40 border border-teal-300/50' : 'bg-black/10 border border-transparent'}`}>
                       <div className="flex items-center"><div className="w-8 text-center font-bold text-teal-100">{idx + 4}</div><div className="font-semibold text-white ml-2">{ranked.emp.name} {ranked.emp.id === currentUser.id && <span className="text-[10px] uppercase tracking-wider bg-white text-teal-800 px-1.5 py-0.5 rounded ml-2">You</span>}</div></div>
                       <div className="font-bold text-teal-50 bg-black/20 px-3 py-1 rounded-full text-sm">{ranked.activityScore} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {pastTrophies.length > 0 && (
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden p-6 relative">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Trophy size={200} /></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-amber-400 flex items-center mb-1"><Award className="h-5 w-5 mr-2" /> Hall of Fame</h2>
            <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest">Your Annual Award Victories</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastTrophies.sort((a,b) => b.year - a.year).map(t => {
                const colorClasses = t.color === 'gold' ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400' : t.color === 'silver' ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border-slate-400' : 'bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-700';
                return (
                  <div key={t.id} className={`${colorClasses} rounded-xl p-5 shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition`}>
                    <Trophy className="h-12 w-12 mb-3 drop-shadow-md" />
                    <div className="font-black text-lg leading-tight drop-shadow-sm">{t.title}</div>
                    <div className="text-sm font-bold opacity-80 mt-1 bg-black/20 px-3 py-1 rounded-full">{t.year} Gala</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-slate-800 flex items-center"><Gift className="h-5 w-5 mr-2 text-purple-600" /> Prize Wallet</h2><p className="text-xs text-slate-500 mt-1 font-medium">Digital gift cards & rewards.</p></div>
            <div className="flex items-center space-x-2"><select value={selectedPrizeYear} onChange={(e) => setSelectedPrizeYear(e.target.value)} className="bg-purple-100 border border-purple-200 text-purple-800 font-bold px-2 py-1 rounded text-xs focus:outline-none">{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto max-h-[400px]">
            {filteredPrizes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-white">No prizes awarded in {selectedPrizeYear}.</div>
            ) : (
              <div className="space-y-4">
                {filteredPrizes.map(p => (
                  <div key={p.id} className={`bg-gradient-to-br rounded-xl p-5 shadow-md relative overflow-hidden ${p.status === 'pending' ? 'from-amber-500 to-amber-700 text-white' : 'from-purple-700 to-indigo-900 text-white'}`}>
                     <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10"><Gift size={100} /></div>
                     <div className="relative z-10">
                       <div className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider flex justify-between">
                         <span>{p.date}</span>
                         <div className="flex items-center">
                           {p.value > 0 && <span className="text-emerald-300 font-black">${Number(p.value).toFixed(2)}</span>}
                           {p.cost > 0 && <span className="ml-3 bg-red-400/20 border border-red-400/50 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">-{p.cost} Pts</span>}
                         </div>
                       </div>
                       <div className="text-xl font-black mt-2 mb-2 leading-tight">{p.name}</div>
                       {p.status === 'pending' && <div className="text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg inline-block border border-white/30 animate-pulse"><Clock className="inline h-4 w-4 mr-1"/> Pending Admin Delivery</div>}
                       {p.note && <div className="text-xs bg-black/30 p-2.5 rounded-lg italic border border-white/10 shadow-inner mt-2 mb-3">"{p.note}"</div>}
                       {p.code && <div className="text-sm font-mono bg-black/40 px-3 py-1.5 rounded mt-2 text-center border border-white/20 font-bold tracking-wider">Code: {p.code}</div>}
                       <div className="flex gap-2 mt-2">
                         {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-white text-purple-900 font-bold py-2 rounded text-xs hover:bg-slate-100 transition shadow-sm"><ExternalLink className="h-3 w-3 mr-1.5"/> Redeem Prize</a>}
                         {p.fileUrl && <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-purple-800 border border-purple-500 text-white font-bold py-2 rounded text-xs hover:bg-purple-700 transition shadow-sm"><FileText className="h-3 w-3 mr-1.5"/> View Attachment</a>}
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-slate-800 flex items-center"><Award className="h-5 w-5 mr-2 text-amber-500" /> My Badges & Kudos</h2><p className="text-xs text-slate-500 mt-1 font-medium">Recognition from administration.</p></div>
            <div className="flex items-center space-x-2"><select value={selectedKudosMonth} onChange={(e) => setSelectedKudosMonth(e.target.value)} className="bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2 py-1 rounded text-xs focus:outline-none max-w-[100px]">{kudosMonthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
          </div>
          <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto max-h-[400px]">
            {filteredKudos.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-white">No badges earned in this period. </div>
            ) : (
              <div className="space-y-4">
                {filteredKudos.map(k => (
                  <div key={k.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-start space-x-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                    <div className="text-4xl bg-amber-50 h-14 w-14 rounded-full flex items-center justify-center shrink-0 border border-amber-100 shadow-inner">{k.badgeIcon}</div>
                    <div className="flex-1 pr-12"><div className="font-bold text-slate-800">{k.badgeLabel}</div><div className="text-xs text-slate-500 mb-2">{k.date}</div><div className="text-sm text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">"{k.message}"</div></div>
                    <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 font-black px-2 py-1 rounded shadow-sm text-xs">+{k.points} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden relative mt-8">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none"><Star size={300} /></div>
        <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/80 relative z-10 backdrop-blur-sm">
          <h2 className="text-2xl font-black text-amber-400 flex items-center tracking-tight mb-3"><Trophy className="h-6 w-6 mr-3 text-amber-400" /> The 'Best Neighbour' Annual Awards</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="bg-amber-900/40 border border-amber-500/50 text-amber-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">1st Place: Best Neighbour ($3000)</div>
            <div className="bg-slate-800/60 border border-slate-500/50 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">2nd Place: Great Neighbour ($2000)</div>
            <div className="bg-amber-900/20 border border-amber-700/30 text-amber-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-center shadow-sm whitespace-nowrap">3rd Place: Good Neighbour ($1000)</div>
          </div>
        </div>
        <div className="p-0 overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-800/80 backdrop-blur sticky top-0">
              <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-700">
                <th className="px-6 py-4 font-bold">Rank</th>
                <th className="px-6 py-4 font-bold">Employee</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold text-center text-slate-300">Base Activity Pts</th>
                <th className="px-6 py-4 font-bold text-center text-blue-400">Kudos Pts</th>
                <th className="px-6 py-4 font-bold text-center text-red-400">Points Spent</th>
                <th className="px-6 py-4 font-bold text-right text-amber-400">Total Gala Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
               {annualStandings.length === 0 ? (
                 <tr><td colSpan="7" className="text-center py-10 text-slate-500">No gala data available yet.</td></tr>
               ) : (
                 annualStandings.map((r, idx) => (
                    <tr key={r.emp.id} className={`transition ${r.emp.id === currentUser.id ? 'bg-amber-900/40 border-l-4 border-amber-500' : 'hover:bg-slate-800/50 border-l-4 border-transparent'}`}>
                      <td className="px-6 py-4 font-black text-slate-500">{idx === 0 ? <span className="text-yellow-400 text-lg">1st</span> : idx === 1 ? <span className="text-slate-300 text-lg">2nd</span> : idx === 2 ? <span className="text-amber-600 text-lg">3rd</span> : `${idx + 1}th`}</td>
                      <td className="px-6 py-4 font-bold text-slate-200 flex items-center">{r.emp.name} {r.emp.id === currentUser.id && <span className="ml-3 bg-amber-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">You</span>}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{r.emp.role}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-300">{r.baseActivityScore.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-blue-400">{r.kudosPts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center font-medium text-red-400">{r.prizePts > 0 ? `-${r.prizePts.toLocaleString()}` : '0'}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-400 text-lg">{r.totalGalaScore.toLocaleString()} pts</td>
                    </tr>
                 ))
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
