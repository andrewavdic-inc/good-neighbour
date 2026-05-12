import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Briefcase, Heart, CalendarDays, AlertCircle } from 'lucide-react';

// --- INLINE HELPERS ---
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

const isBiweeklyPayday = (currentDateStr, startDateStr) => {
  if (!startDateStr || !currentDateStr) return false;
  const [sY, sM, sD] = String(startDateStr).split('-').map(Number);
  const [cY, cM, cD] = String(currentDateStr).split('-').map(Number);
  if(isNaN(sY) || isNaN(cY)) return false; 
  const diffDays = (Date.UTC(cY, cM - 1, cD) - Date.UTC(sY, sM - 1, sD)) / 86400000;
  return diffDays > 0 && diffDays % 14 === 0;
};

const getHoliday = (dateStr) => {
  const holidays = { 
    '2026-01-01': { name: 'New Year\'s Day' }, 
    '2026-02-16': { name: 'Family Day' }, 
    '2026-04-03': { name: 'Good Friday' }, 
    '2026-05-18': { name: 'Victoria Day' }, 
    '2026-07-01': { name: 'Canada Day' }, 
    '2026-08-03': { name: 'Civic Holiday' }, 
    '2026-09-07': { name: 'Labour Day' }, 
    '2026-10-12': { name: 'Thanksgiving Day' }, 
    '2026-12-25': { name: 'Christmas Day' }, 
    '2026-12-26': { name: 'Boxing Day' } 
  };
  return holidays[String(dateStr)] || null;
};

export default function ScheduleTab({
  myShifts,
  clients,
  myTimeOffLogs,
  payPeriodStart,
  scheduleView,
  setScheduleView,
  upcomingShifts,
  showUpdateBanner,
  scheduleChanges,
  hasNewShift,
  hasChangedShift,
  acknowledgeScheduleUpdates,
  setSelectedClient,
  initiateCancellation
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [agendaDateStr, setAgendaDateStr] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setAgendaDateStr(dateStr);
    setIsDayAgendaOpen(true);
  };

  const renderPunchBadge = (shift) => {
    if (!shift.actualStartTime || !shift.actualEndTime) return null;
    const start = new Date(shift.actualStartTime);
    const end = new Date(shift.actualEndTime);
    const diffMs = end - start;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    
    return (
      <div className="mt-1.5 inline-flex items-center bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider shadow-sm">
        ⏱️ Punch: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({hrs}h {mins}m)
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />
          {monthNames[month]} {year}
        </h2>
        <div className="flex space-x-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-200 transition">
            <span className="text-xl font-bold text-slate-600 px-2">&lsaquo;</span>
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-200 transition">
             <span className="text-xl font-bold text-slate-600 px-2">&rsaquo;</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
        {blanksArray.map(blank => (<div key={`blank-${blank}`} className="bg-white min-h-[100px] opacity-50 p-2"></div>))}
        {daysArray.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPayday = isBiweeklyPayday(dateStr, payPeriodStart);
          const holiday = getHoliday(dateStr);
          const isToday = dateStr === todayStr;
          const dayShifts = myShifts.filter(s => s && s.date === dateStr).sort((a,b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
          
          const cellTime = new Date(year, month, day).getTime();
          const dayTimeOff = myTimeOffLogs.filter(log => {
            if (log.status !== 'approved') return false;
            if (!log.startDate || !log.endDate) return false;
            const start = parseLocalSafe(log.startDate);
            const end = parseLocalSafe(log.endDate);
            const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
            return cellTime >= sTime && cellTime <= eTime;
          });
          
          const maxShifts = 3;
          const visibleShifts = dayShifts.slice(0, maxShifts);
          const hiddenCount = dayShifts.length - maxShifts;

          return (
            <div key={day} onClick={() => handleDayClick(day)} className={`bg-white min-h-[100px] p-2 hover:bg-teal-50 transition group relative cursor-pointer ${holiday ? 'bg-purple-50/50' : ''} ${isToday ? 'border-2 border-teal-500 shadow-sm z-10' : ''}`}>
              <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                <span className={`font-medium text-sm group-hover:text-teal-700 ${holiday ? 'text-purple-700 font-bold' : isToday ? 'text-teal-700 font-bold' : 'text-slate-600'}`}>{day}</span>
                <div className="flex flex-col items-end gap-1">
                  {isToday && (<span className="text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded shadow-sm">TODAY</span>)}
                  {holiday && (<span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" title={holiday.name}>🍁 {String(holiday.name).toUpperCase()}</span>)}
                  {isPayday && (<span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center shadow-sm" title="Payday">💰 PAYDAY</span>)}
                </div>
              </div>

              <div className="space-y-1">
                {dayTimeOff.map(log => {
                  const isSick = log.type === 'sick';
                  const isVacation = log.type === 'vacation';
                  return (
                    <div key={`to_${log.id}`} className={`text-xs p-1.5 rounded relative border shadow-sm mb-1 ${isSick ? 'bg-red-50 text-red-800 border-red-200' : isVacation ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                      <div className="font-semibold truncate flex items-center">
                        {isSick ? '🤒 Sick' : isVacation ? '☀️ Vacay' : '📅 Leave'}
                      </div>
                    </div>
                  );
                })}

                {visibleShifts.map(shift => {
                  const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                  const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : String(client?.name || 'Unknown').split(' ')[0];
                  
                  const bgBorderClass = shift.cancelRequest?.pending ? 'bg-slate-200 text-slate-500 border border-slate-300' : 
                                        shift.isInternal ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 group-hover:bg-indigo-100' : 
                                        'bg-teal-100 text-teal-800 border border-teal-200 group-hover:bg-teal-200';

                  return (
                    <div key={shift.id} className={`text-xs p-1.5 rounded transition shadow-sm ${bgBorderClass}`}>
                      <div className="font-semibold truncate flex items-center">
                        {shift.isInternal ? <Briefcase className="h-2.5 w-2.5 mr-1 shrink-0" /> : <Heart className="h-2.5 w-2.5 mr-1 shrink-0" />}
                        {clientNameDisplay}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-90 flex items-center">
                        <Clock className="h-2.5 w-2.5 mr-1 shrink-0" />
                        {shift.startTime}-{shift.endTime}
                      </div>
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                   <div className="w-full text-center text-[10px] font-bold text-slate-500 group-hover:text-teal-600 mt-1 py-1 bg-slate-100/80 group-hover:bg-teal-50 rounded transition shadow-inner">
                     +{hiddenCount} more...
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* DAILY AGENDA MODAL */}
      {isDayAgendaOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-teal-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-200"/> Daily Agenda: {parseLocalSafe(agendaDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button onClick={() => setIsDayAgendaOpen(false)} className="hover:text-teal-200 transition text-2xl leading-none">&times;</button>
            </div>
            <div className="p-0 bg-slate-50 flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {myShifts.filter(s => s.date === agendaDateStr).length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No shifts scheduled for this day.</div>
                ) : (
                  myShifts.filter(s => s.date === agendaDateStr).sort((a,b) => String(a.startTime).localeCompare(String(b.startTime))).map(shift => {
                    const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                    const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : (client?.name || 'Unknown Client');

                    return (
                      <div key={shift.id} className="p-4 hover:bg-slate-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                        <div className="flex items-start space-x-4">
                          <div className={`bg-teal-50 border border-teal-100 rounded-lg p-2 text-center min-w-[70px] ${shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}`}>
                            <div className="text-xs font-bold text-teal-600 uppercase">{parseLocalSafe(shift.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="text-xl font-extrabold text-teal-800">{parseLocalSafe(shift.date).getDate()}</div>
                          </div>
                          <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                            <h4 className="font-bold text-slate-800 flex items-center">
                              {shift.isInternal && <Briefcase className="h-4 w-4 mr-1.5 text-indigo-600"/>}
                              {clientNameDisplay}
                            </h4>
                            <div className="text-sm text-slate-600 flex items-center mt-1">
                              <Clock className="h-3.5 w-3.5 mr-1.5" /> {shift.startTime} - {shift.endTime}
                            </div>
                            {renderPunchBadge(shift)}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 w-full sm:w-auto">
                          {!shift.isInternal && (
                            <button onClick={() => { setSelectedClient(client); setIsDayAgendaOpen(false); }} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded transition w-full sm:w-auto text-center">
                              Care Plan
                            </button>
                          )}
                          
                          {shift.cancelRequest?.pending ? (
                            <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded cursor-not-allowed text-center w-full sm:w-auto border border-slate-200">
                              Cancellation Pending
                            </button>
                          ) : (
                            <button onClick={() => { initiateCancellation(shift.id); setIsDayAgendaOpen(false); }} className="text-xs font-medium text-slate-500 hover:text-red-500 hover:underline text-center w-full sm:w-auto">
                              Request Cancellation
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
              <button onClick={() => setIsDayAgendaOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition shadow-sm">Close Agenda</button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE BANNER */}
      {showUpdateBanner && scheduleChanges.length > 0 && (
        <div className="mx-6 mt-6 mb-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
            <div className="flex items-start">
              <div className={`h-2.5 w-2.5 rounded-full animate-pulse mr-3 shrink-0 mt-1 ${hasNewShift ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Unread Schedule Updates</h3>
                <ul className="space-y-1.5">
                  {scheduleChanges.map((msg, i) => (
                    <li key={i} className="text-xs text-slate-700 font-medium bg-white px-3 py-2 rounded border border-emerald-100 shadow-sm flex items-start">
                      <span className="mr-2 mt-0.5">{msg.substring(0,2)}</span>
                      <span>{msg.substring(3)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button onClick={acknowledgeScheduleUpdates} className="w-full sm:w-auto px-4 py-2 text-sm font-bold bg-white text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-100 transition shadow-sm whitespace-nowrap shrink-0">
              Acknowledge & Clear
            </button>
          </div>
        </div>
      )}

      {/* TOGGLE CONTROLS */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-end">
        <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
          <button onClick={() => setScheduleView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Agenda View</button>
          <button onClick={() => setScheduleView('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${scheduleView === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Calendar</button>
        </div>
      </div>
      
      {/* RENDER VIEW */}
      {scheduleView === 'list' ? (
        <div className="p-6 bg-slate-100/50 space-y-6">
          {upcomingShifts.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No Upcoming Shifts</h3>
              <p className="text-sm text-slate-500 mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            Object.entries(upcomingShifts.reduce((acc, shift) => {
              if(!acc[shift.date]) acc[shift.date] = [];
              acc[shift.date].push(shift);
              return acc;
            }, {})).sort((a,b) => new Date(a[0]) - new Date(b[0])).map(([dateStr, dayShifts]) => {
              const d = parseLocalSafe(dateStr);
              const isInvalid = isNaN(d.getTime());
              return (
                <div key={dateStr} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-teal-700 text-white px-6 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center">
                      <CalendarDays className="h-5 w-5 mr-2 text-teal-300" />
                      {!isInvalid ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : dateStr}
                    </h3>
                    <span className="text-xs font-bold bg-teal-900/50 px-3 py-1 rounded-full border border-teal-600 shadow-inner">
                      {dayShifts.length} {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {dayShifts.map(shift => {
                      const client = shift.isInternal ? null : clients.find(c => c && c.id === shift.clientId);
                      const clientNameDisplay = shift.isInternal ? (shift.internalTask || 'Internal Task') : (client?.name || 'Unknown Client');
                      return (
                        <div key={shift.id || Math.random()} className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start space-x-4">
                            <div className={`p-3 rounded-xl border shadow-sm flex items-center justify-center shrink-0 ${shift.isInternal ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-teal-50 border-teal-200 text-teal-600'}`}>
                              {shift.isInternal ? <Briefcase className="h-6 w-6" /> : <Heart className="h-6 w-6" />}
                            </div>
                            <div className={shift.cancelRequest?.pending ? 'opacity-50 grayscale' : ''}>
                              <h4 className="font-bold text-slate-800 text-base">{clientNameDisplay}</h4>
                              <div className="text-sm text-slate-600 flex items-center mt-1 font-medium">
                                <Clock className="h-4 w-4 mr-1.5 text-slate-400" /> {shift.startTime} - {shift.endTime}
                              </div>
                              {renderPunchBadge(shift)}
                              {shift.requirePunchClock && !shift.actualStartTime && (
                                <div className="mt-1.5 inline-flex items-center bg-amber-50 border border-amber-200 text-amber-700 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider shadow-sm">
                                  ⏱️ Punch Required
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            {!shift.isInternal && (
                              <button onClick={() => setSelectedClient(client)} className="text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-4 py-2 rounded-lg transition text-center shadow-sm">
                                Care Plan
                              </button>
                            )}
                            {shift.cancelRequest?.pending ? (
                              <button disabled className="text-xs font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-lg cursor-not-allowed text-center border border-slate-200 shadow-inner">
                                Cancellation Pending
                              </button>
                            ) : (
                              <button onClick={() => initiateCancellation(shift.id)} className="text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 px-4 py-2 rounded-lg transition text-center">
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        renderCalendar()
      )}
    </div>
  );
}
