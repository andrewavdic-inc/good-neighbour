import React, { useState, useMemo, useEffect } from 'react';
import { Coffee, Plus, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight, FileText, Download, Receipt, Upload, Loader2, Image as ImageIcon, Archive, FolderLock, Camera, CloudSun, Clock, BookOpen, Folder, Edit, CheckSquare, Square, AlertCircle, MapPin } from 'lucide-react';
import DocumentManager from './DocumentManager';

// --- ADDED MISSING DATE HELPER ---
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

export default function AdminDesk({ 
  notes = [], businessExpenses = [], currentUser, onAddNote, onUpdateNote, onRemoveNote, 
  onAddBusinessExpense, onRemoveBusinessExpense, employees = [], officeLocation, 
  adminDrawer = [], onAddDrawerFile, onRemoveDrawerFile, 
  cabinetDocuments = [], onAddCabinetDocument, onRemoveCabinetDocument, onUpdateDeskPicture,
  onUpdateDeskBoard, appointments = [], onAddAppointment, onUpdateAppointment, onRemoveAppointment
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // --- Modals State ---
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  
  // --- Note Form State ---
  const [noteType, setNoteType] = useState('text'); // 'text' or 'list'
  const [noteText, setNoteText] = useState('');
  const [noteItems, setNoteItems] = useState([{ id: Date.now().toString(), text: '', isCompleted: false }]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [noteSort, setNoteSort] = useState('asc'); 

  // --- Appt Form State ---
  const [apptTitle, setApptTitle] = useState('');
  const [apptStartTime, setApptStartTime] = useState('09:00');
  const [apptEndTime, setApptEndTime] = useState('10:00');
  const [apptLocation, setApptLocation] = useState('');
  const [apptNotes, setApptNotes] = useState('');

  // --- Board Form State ---
  const [isBoardEditing, setIsBoardEditing] = useState(false);
  const [boardText, setBoardText] = useState(currentUser.deskBoard?.text || '');
  const [boardColor, setBoardColor] = useState(currentUser.deskBoard?.color || 'text-slate-800');
  const [boardFont, setBoardFont] = useState(currentUser.deskBoard?.font || 'font-sans');
  const [boardBg, setBoardBg] = useState(currentUser.deskBoard?.bg || 'bg-white');

  // --- Business Expense Form State ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Office Supplies');
  const [expDescription, setExpDescription] = useState('');
  const [expFile, setExpFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Bottom Cabinet & Drawer State ---
  const [cabinetTab, setCabinetTab] = useState('expenses');
  const [cabDocTitle, setCabDocTitle] = useState('');
  const [cabDocFile, setCabDocFile] = useState(null);
  const [isCabDocUploading, setIsCabDocUploading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerUploading, setIsDrawerUploading] = useState(false);

  // --- Widget State ---
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', condition: 'Fetching...', icon: '⛅' });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(officeLocation || 'Port Colborne, ON')}?format=j1`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setWeather({ temp: data.current_condition[0].temp_C, condition: data.current_condition[0].weatherDesc[0].value, icon: '☁️' });
      } catch(e) {
        setWeather({ temp: '--', condition: 'Weather Unavailable', icon: '🌤️' });
      }
    };
    fetchWeather();
  }, [officeLocation]);

  // --- Scoped Data ---
  const myNotes = useMemo(() => notes.filter(n => n.authorId === currentUser.id), [notes, currentUser.id]);
  const myAppointments = useMemo(() => appointments.filter(a => a.authorId === currentUser.id), [appointments, currentUser.id]);
  const myDrawerFiles = useMemo(() => adminDrawer.filter(f => f.authorId === currentUser.id), [adminDrawer, currentUser.id]);
  const safeCabinetDocs = Array.isArray(cabinetDocuments) ? cabinetDocuments : [];

  const sortedNotes = useMemo(() => {
    return [...myNotes].sort((a,b) => {
      const diff = new Date(a.reminderDate) - new Date(b.reminderDate);
      return noteSort === 'asc' ? diff : -diff;
    });
  }, [myNotes, noteSort]);

  const todayStr = new Date().toISOString().split('T')[0];
  const urgentAlerts = myNotes.filter(n => n.isUrgent || n.reminderDate === todayStr);
  const todayAppts = myAppointments.filter(a => a.date === todayStr);

  const upcomingItinerary = useMemo(() => {
    return [...myAppointments].filter(a => a.date >= todayStr).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
  }, [myAppointments, todayStr]);

  // --- Calendar Math ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // --- Handlers ---
  const handleDayClick = (day) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formattedDate);
    setIsDayModalOpen(true);
  };

  const openNewNoteModal = (dateStr = todayStr) => {
    setEditingNote(null);
    setSelectedDateStr(dateStr);
    setNoteType('text'); setNoteText(''); setNoteItems([{ id: Date.now().toString(), text: '', isCompleted: false }]); setIsUrgent(false);
    setIsNoteModalOpen(true);
  };

  const openEditNoteModal = (note) => {
    setEditingNote(note);
    setSelectedDateStr(note.reminderDate);
    setNoteType(note.type || 'text');
    setNoteText(note.text || '');
    setNoteItems(note.items && note.items.length > 0 ? note.items : [{ id: Date.now().toString(), text: '', isCompleted: false }]);
    setIsUrgent(note.isUrgent || false);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    const cleanItems = noteItems.filter(i => i.text.trim() !== '');
    
    const noteData = {
      authorId: currentUser.id,
      type: noteType,
      text: noteType === 'text' ? noteText : '',
      items: noteType === 'list' ? cleanItems : [],
      reminderDate: selectedDateStr,
      isUrgent,
      dateUpdated: new Date().toISOString()
    };

    if (editingNote) {
      onUpdateNote(editingNote.id, noteData);
    } else {
      noteData.dateCreated = new Date().toISOString();
      onAddNote(noteData);
    }
    setIsNoteModalOpen(false);
  };

  const toggleChecklistItem = (noteId, itemId, currentItems) => {
    const newItems = currentItems.map(i => i.id === itemId ? { ...i, isCompleted: !i.isCompleted } : i);
    onUpdateNote(noteId, { items: newItems });
  };

  const openNewApptModal = (dateStr = todayStr) => {
    setEditingAppt(null);
    setSelectedDateStr(dateStr);
    setApptTitle(''); setApptStartTime('09:00'); setApptEndTime('10:00'); setApptLocation(''); setApptNotes('');
    setIsApptModalOpen(true);
  };

  const openEditApptModal = (appt) => {
    setEditingAppt(appt);
    setSelectedDateStr(appt.date);
    setApptTitle(appt.title || ''); setApptStartTime(appt.startTime || '09:00'); setApptEndTime(appt.endTime || '10:00'); setApptLocation(appt.location || ''); setApptNotes(appt.notes || '');
    setIsApptModalOpen(true);
  };

  const handleSaveAppt = (e) => {
    e.preventDefault();
    if (!apptTitle.trim()) return;
    const apptData = {
      authorId: currentUser.id,
      date: selectedDateStr,
      title: apptTitle,
      startTime: apptStartTime,
      endTime: apptEndTime,
      location: apptLocation,
      notes: apptNotes
    };
    if (editingAppt) {
      onUpdateAppointment(editingAppt.id, apptData);
    } else {
      onAddAppointment(apptData);
    }
    setIsApptModalOpen(false);
  };

  const handleSaveBoard = () => {
    onUpdateDeskBoard({ text: boardText, color: boardColor, font: boardFont, bg: boardBg });
    setIsBoardEditing(false);
  };

  // Basic list manipulators
  const updateNoteItem = (id, text) => {
    setNoteItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
    if (text.trim() !== '' && noteItems[noteItems.length - 1].id === id) {
      setNoteItems(prev => [...prev, { id: Date.now().toString(), text: '', isCompleted: false }]);
    }
  };
  const removeNoteItem = (id) => setNoteItems(prev => prev.filter(item => item.id !== id));

  const handleSaveExpense = async (e) => { e.preventDefault(); if (!expAmount || !expDate) return; setIsUploading(true); await onAddBusinessExpense({ date: expDate, amount: Number(expAmount), category: expCategory, description: expDescription, loggedBy: currentUser.id }, expFile); setIsUploading(false); setIsExpenseModalOpen(false); setExpAmount(''); setExpDescription(''); setExpFile(null); };
  const handleSaveDrawerFile = async (e) => { const file = e.target.files[0]; if (!file) return; setIsDrawerUploading(true); await onAddDrawerFile({ authorId: currentUser.id, fileName: file.name, uploadDate: new Date().toISOString() }, file); setIsDrawerUploading(false); };
  const handleSaveCabinetDocument = async (e) => { e.preventDefault(); if (!cabDocTitle || !cabDocFile) return; setIsCabDocUploading(true); await onAddCabinetDocument({ title: cabDocTitle, fileName: cabDocFile.name, uploadDate: new Date().toISOString() }, cabDocFile); setIsCabDocUploading(false); setCabDocTitle(''); setCabDocFile(null); };

  const exportBusinessExpenses = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount ($)', 'Logged By'];
    const rows = businessExpenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => {
      const emp = employees.find(e => e.id === exp.loggedBy);
      return [
        exp.date,
        `"${exp.category}"`,
        `"${exp.description || ''}"`,
        Number(exp.amount || 0).toFixed(2),
        `"${emp?.name || 'Admin'}"`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Company_Expenses_${year}_${monthNames[month]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-200/50 p-6 rounded-2xl border border-slate-300 shadow-inner min-h-[900px] flex flex-col">
      
      {/* URGENT BANNER */}
      {(urgentAlerts.length > 0 || todayAppts.length > 0) && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-center justify-between mb-6 shadow-md animate-pulse">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 mr-3" />
            <div>
              <div className="font-bold text-lg leading-tight">Requires Attention</div>
              <div className="text-sm text-red-100">You have {urgentAlerts.length} urgent note(s) and {todayAppts.length} appointment(s) today.</div>
            </div>
          </div>
          <button onClick={() => handleDayClick(new Date().getDate())} className="bg-white text-red-700 hover:bg-red-50 font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm">View Today</button>
        </div>
      )}

      {/* --- TOP SECTION: ON THE DESK --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: WIDGET, BOARD, PICTURE, & DRAWER */}
        <div className="flex flex-col space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><CloudSun size={120}/></div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter mb-1 relative z-10">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-sm font-bold text-teal-600 mb-4 relative z-10 uppercase tracking-widest">{time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 w-full justify-center relative z-10">
              <span className="text-2xl">{weather.icon}</span>
              <div>
                <div className="text-sm font-bold text-slate-700">{weather.temp}°C &bull; {weather.condition}</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{officeLocation || 'Location not set'}</div>
              </div>
            </div>
          </div>

          <div 
            onClick={() => !isBoardEditing && setIsBoardEditing(true)} 
            className={`min-h-[120px] rounded-lg shadow-sm border-4 border-slate-300 p-4 flex items-center justify-center text-center cursor-pointer transition ${isBoardEditing ? 'bg-slate-50' : currentUser.deskBoard?.bg || 'bg-white'}`}
          >
            {isBoardEditing ? (
              <div className="w-full space-y-3" onClick={e => e.stopPropagation()}>
                <input type="text" value={boardText} onChange={e => setBoardText(e.target.value)} placeholder="Write a quote or reminder..." className="w-full text-center px-2 py-1 border border-slate-300 rounded text-sm" />
                <div className="flex space-x-2">
                  <select value={boardFont} onChange={e => setBoardFont(e.target.value)} className="flex-1 text-xs border border-slate-300 rounded p-1">
                    <option value="font-sans">Standard</option><option value="font-serif">Elegant</option><option value="font-mono">Typewriter</option>
                  </select>
                  <select value={boardColor} onChange={e => setBoardColor(e.target.value)} className="flex-1 text-xs border border-slate-300 rounded p-1">
                    <option value="text-slate-800">Black</option><option value="text-teal-700">Teal</option><option value="text-red-600">Red</option><option value="text-blue-600">Blue</option>
                  </select>
                  <select value={boardBg} onChange={e => setBoardBg(e.target.value)} className="flex-1 text-xs border border-slate-300 rounded p-1">
                    <option value="bg-white">White</option><option value="bg-yellow-50">Yellow</option><option value="bg-slate-800">Dark</option>
                  </select>
                </div>
                <button onClick={handleSaveBoard} className="w-full bg-teal-600 text-white text-xs font-bold py-1.5 rounded">Save Board</button>
              </div>
            ) : (
              <div className={`w-full ${currentUser.deskBoard?.font || 'font-sans'} ${currentUser.deskBoard?.color || 'text-slate-800'}`}>
                {currentUser.deskBoard?.text ? (
                  <p className="text-lg leading-snug font-medium whitespace-pre-wrap">{currentUser.deskBoard.text}</p>
                ) : (
                  <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Click to write on board</p>
                )}
              </div>
            )}
          </div>

          <div className="relative group w-full h-56 bg-white border-8 border-white shadow-lg rounded-sm overflow-hidden flex items-center justify-center bg-slate-100 cursor-pointer transition transform hover:scale-[1.02]">
            {currentUser.deskPictureUrl ? (
              <img src={currentUser.deskPictureUrl} alt="Desk Frame" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Add a Photo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm font-bold flex items-center"><Camera className="h-4 w-4 mr-2"/> Change Picture</span>
            </div>
            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onUpdateDeskPicture(e.target.files[0])} />
          </div>

          <button onClick={() => setIsDrawerOpen(true)} className="w-full flex items-center justify-center p-5 bg-slate-800 text-white rounded-xl shadow-md hover:bg-slate-700 transition group mt-auto">
            <FolderLock className="h-7 w-7 mr-3 group-hover:scale-110 transition-transform text-amber-400" />
            <div className="text-left">
              <div className="font-bold text-lg leading-tight">Private Drawer</div>
              <div className="text-xs text-slate-400">Locked Personal Files</div>
            </div>
          </button>
        </div>

        {/* COL 2: PRIVATE CALENDAR & ITINERARY */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-600" /> Private Planner</h2>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                <span className="text-sm font-bold text-slate-700 w-24 text-center">{monthNames[month]} {year}</span>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (<div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase">{day}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {blanksArray.map(blank => <div key={`blank-${blank}`} className="h-10 rounded"></div>)}
                {daysArray.map(day => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayNotes = myNotes.filter(n => n.reminderDate === dateStr);
                  const hasAppts = myAppointments.some(a => a.date === dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div 
                      key={day} 
                      onClick={() => handleDayClick(day)}
                      className={`h-12 border rounded cursor-pointer transition flex flex-col items-center justify-center relative hover:border-teal-400 hover:bg-teal-50 ${isToday ? 'border-teal-500 bg-teal-50 font-bold text-teal-700' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                    >
                      {day}
                      <div className="absolute bottom-1 flex space-x-1">
                        {dayNotes.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${dayNotes.some(n=>n.isUrgent) ? 'bg-red-500' : 'bg-yellow-400'}`}></span>}
                        {hasAppts && <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col flex-1 min-h-[300px]">
            <div className="px-6 py-4 border-b border-blue-200 bg-blue-100/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-900 flex items-center"><Clock className="h-5 w-5 mr-2" /> Upcoming Itinerary</h2>
              <button onClick={() => openNewApptModal()} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded transition">+ Appt</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {upcomingItinerary.length === 0 ? (
                <div className="text-center py-8 text-blue-600/60 text-sm font-medium italic">No upcoming appointments scheduled.</div>
              ) : (
                upcomingItinerary.map(appt => (
                  <div key={appt.id} onClick={() => openEditApptModal(appt)} className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm cursor-pointer hover:border-blue-300 transition group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-slate-800 text-sm">{appt.title}</div>
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{appt.date === todayStr ? 'Today' : parseLocalSafe(appt.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center mt-1"><Clock className="h-3 w-3 mr-1"/> {appt.startTime} - {appt.endTime}</div>
                    {appt.location && <div className="text-xs text-slate-500 flex items-center mt-1"><MapPin className="h-3 w-3 mr-1"/> {appt.location}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COL 3: SORTABLE STICKY NOTES */}
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-[750px]">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-100/50 flex flex-col space-y-3">
            <h2 className="text-lg font-semibold text-yellow-800 flex items-center"><FileText className="h-5 w-5 mr-2" /> My Sticky Notes</h2>
            <div className="flex space-x-2 w-full">
              <button onClick={() => setNoteSort(s => s === 'asc' ? 'desc' : 'asc')} className="flex-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold px-2 py-1.5 rounded transition flex items-center justify-center">Sort: {noteSort === 'asc' ? 'Earliest First' : 'Latest First'}</button>
              <button onClick={() => openNewNoteModal()} className="flex-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold px-2 py-1.5 rounded transition">+ New Note</button>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {sortedNotes.length === 0 ? (
              <div className="text-center py-8 text-yellow-600/60 text-sm font-medium italic">Click any day on the calendar to add a private note.</div>
            ) : (
              sortedNotes.map(note => {
                const isPast = new Date(note.reminderDate) < new Date(todayStr);
                return (
                  <div key={note.id} className={`p-4 rounded-lg shadow-sm border relative group ${note.isUrgent ? 'bg-red-50 border-red-200 text-red-900' : isPast ? 'bg-white opacity-60 border-slate-200 text-slate-500' : 'bg-white border-yellow-200 text-slate-800'}`}>
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditNoteModal(note)} className="text-slate-400 hover:text-blue-500 p-1"><Edit className="h-4 w-4"/></button>
                      <button onClick={() => onRemoveNote(note.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4"/></button>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center opacity-70"><CalendarIcon className="h-3 w-3 mr-1" /> {note.reminderDate}</div>
                    
                    {note.type === 'list' ? (
                      <div className="space-y-2 mt-2">
                        {(note.items || []).map(item => (
                          <div key={item.id} className="flex items-start">
                            <button onClick={() => toggleChecklistItem(note.id, item.id, note.items)} className={`mt-0.5 mr-2 shrink-0 ${item.isCompleted ? 'text-teal-600' : 'text-slate-300 hover:text-slate-400'}`}>
                              {item.isCompleted ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                            <span className={`text-sm ${item.isCompleted ? 'line-through opacity-50 text-slate-500' : 'text-slate-800'}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: THE FILING CABINET --- */}
      <div className="mt-8 border-t-4 border-slate-800 pt-8 flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row items-end justify-between mb-4 gap-4">
          <div className="flex items-center text-2xl font-black text-slate-800 shrink-0"><Archive className="h-8 w-8 mr-3 text-slate-800" /> The Filing Cabinet</div>
          <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button onClick={() => setCabinetTab('expenses')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company Ledger</button>
            <button onClick={() => setCabinetTab('documents')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'documents' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Private Documents</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden min-h-[500px]">
          {cabinetTab === 'expenses' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center"><Receipt className="h-5 w-5 mr-2 text-teal-600" /> Internal Business Expenses</h2>
                <div className="flex space-x-2">
                  <button onClick={exportBusinessExpenses} className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center"><Download className="h-3 w-3 mr-1" /> Export CSV</button>
                  <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center"><Plus className="h-3 w-3 mr-1" /> Log Bill</button>
                </div>
              </div>
              <div className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {businessExpenses.length === 0 ? <div className="text-center py-12 text-slate-500 text-sm">No business expenses have been logged yet.</div> :
                    businessExpenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => {
                      const emp = employees.find(e => e.id === exp.loggedBy);
                      return (
                        <div key={exp.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Receipt className="h-5 w-5" /></div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center text-sm">{exp.category}</div>
                              <div className="text-xs text-slate-500 mt-1">{exp.date} &bull; Logged by {emp?.name || 'Admin'}</div>
                              {exp.description && <div className="text-xs text-slate-600 italic mt-1">"{exp.description}"</div>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-black text-slate-800">${Number(exp.amount).toFixed(2)}</div>
                            <div className="flex flex-col space-y-1">
                              {exp.receiptUrl && <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-2 py-1 rounded font-semibold text-center transition border border-teal-200">Receipt</a>}
                              <button onClick={() => { if(window.confirm('Delete this expense?')) onRemoveBusinessExpense(exp.id); }} className="text-xs text-slate-400 hover:text-red-600 transition text-right">Delete</button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          )}

          {cabinetTab === 'documents' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-800 flex items-center"><Folder className="h-5 w-5 mr-2 text-teal-600" /> Private Company Documents</h2></div>
              <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                <form onSubmit={handleSaveCabinetDocument} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-1/3"><label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label><input type="text" value={cabDocTitle} onChange={(e) => setCabDocTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required disabled={isCabDocUploading} placeholder="e.g. 2026 Tax Return" /></div>
                  <div className="w-full sm:w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                    <div className={`flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md bg-white transition ${isCabDocUploading ? 'opacity-50' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isCabDocUploading && document.getElementById('cab-doc-upload').click()}>
                      <div className="text-center text-sm font-medium text-teal-600 truncate">{cabDocFile ? cabDocFile.name : 'Select File'}</div>
                      <input id="cab-doc-upload" type="file" accept=".pdf,image/*,.doc,.docx" className="sr-only" onChange={(e) => setCabDocFile(e.target.files[0])} disabled={isCabDocUploading} />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/3"><button type="submit" disabled={isCabDocUploading || !cabDocTitle || !cabDocFile} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center transition shadow-sm text-sm">{isCabDocUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : <><Plus className="h-4 w-4 mr-2"/> File Document</>}</button></div>
                </form>
              </div>
              <div className="p-6 bg-white flex-1 overflow-y-auto">
                {safeCabinetDocs.length === 0 ? <div className="text-center text-slate-500 py-8">The filing cabinet is empty.</div> :
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeCabinetDocs.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(doc => (
                      <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-slate-50 group">
                        <div className="flex items-center space-x-4 overflow-hidden pr-4"><div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0"><BookOpen className="h-6 w-6" /></div><div className="truncate"><h3 className="font-bold text-slate-800 truncate leading-tight">{doc.title}</h3><p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{doc.fileName} &bull; {new Date(doc.uploadDate).toLocaleDateString()}</p></div></div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <a href={doc.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:bg-teal-50 p-2 rounded transition inline-flex" title="Download/View"><Download className="h-5 w-5" /></a>
                          <button onClick={() => { if(window.confirm(`Delete "${doc.title}" permanently?`)) onRemoveCabinetDocument(doc.id); }} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition ml-1" title="Delete"><Trash2 className="h-5 w-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Day View Modal */}
      {isDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-teal-400"/> Daily Agenda: {parseLocalSafe(selectedDateStr).toLocaleDateString()}</h3>
              <button onClick={() => setIsDayModalOpen(false)} className="hover:text-slate-300 transition text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-blue-900 flex items-center"><Clock className="h-4 w-4 mr-1.5 text-blue-600"/> Formal Appointments</h4>
                  <button onClick={() => openNewApptModal(selectedDateStr)} className="text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded transition">+ Add Appt</button>
                </div>
                <div className="space-y-2">
                  {myAppointments.filter(a => a.date === selectedDateStr).length === 0 ? (
                    <div className="text-sm text-slate-500 italic p-4 border border-dashed border-slate-300 rounded-lg text-center">No appointments scheduled.</div>
                  ) : (
                    myAppointments.filter(a => a.date === selectedDateStr).sort((a,b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`)).map(appt => (
                      <div key={appt.id} className="bg-white border border-blue-200 rounded-lg p-3 flex justify-between items-start shadow-sm group">
                        <div>
                          <div className="font-bold text-slate-800">{appt.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{appt.startTime} - {appt.endTime} {appt.location && <span>&bull; {appt.location}</span>}</div>
                          {appt.notes && <div className="text-xs text-slate-500 mt-1 italic">"{appt.notes}"</div>}
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditApptModal(appt)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit className="h-4 w-4"/></button>
                          <button onClick={() => { if(window.confirm('Delete this appointment?')) onRemoveAppointment(appt.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-yellow-900 flex items-center"><FileText className="h-4 w-4 mr-1.5 text-yellow-600"/> Sticky Notes & Tasks</h4>
                  <button onClick={() => openNewNoteModal(selectedDateStr)} className="text-xs font-bold bg-yellow-200 text-yellow-800 hover:bg-yellow-300 px-3 py-1.5 rounded transition">+ Add Note</button>
                </div>
                <div className="space-y-2">
                  {myNotes.filter(n => n.reminderDate === selectedDateStr).length === 0 ? (
                    <div className="text-sm text-slate-500 italic p-4 border border-dashed border-slate-300 rounded-lg text-center">No notes for this day.</div>
                  ) : (
                    myNotes.filter(n => n.reminderDate === selectedDateStr).map(note => (
                      <div key={note.id} className={`p-3 rounded-lg border shadow-sm group flex justify-between items-start ${note.isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex-1">
                          {note.type === 'list' ? (
                            <div className="space-y-1.5">
                              {(note.items || []).map(item => (
                                <div key={item.id} className="flex items-start">
                                  <button onClick={() => toggleChecklistItem(note.id, item.id, note.items)} className={`mt-0.5 mr-2 shrink-0 ${item.isCompleted ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {item.isCompleted ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                  </button>
                                  <span className={`text-sm ${item.isCompleted ? 'line-through opacity-50 text-slate-500' : 'text-slate-800'}`}>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={`text-sm whitespace-pre-wrap ${note.isUrgent ? 'text-red-900 font-medium' : 'text-slate-800'}`}>{note.text}</p>
                          )}
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                          <button onClick={() => openEditNoteModal(note)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit className="h-4 w-4"/></button>
                          <button onClick={() => { if(window.confirm('Delete this note?')) onRemoveNote(note.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setIsDayModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Close Agenda</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Note Form Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-yellow-50 text-yellow-800 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><FileText className="h-5 w-5 mr-2"/> {editingNote ? 'Edit Note' : 'Add Note'}</h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="hover:text-yellow-600 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveNote} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                  <input type="date" value={selectedDateStr} onChange={(e) => setSelectedDateStr(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                </div>
                
                <div>
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                    <button type="button" onClick={() => setNoteType('text')} className={`flex-1 text-xs font-bold py-1.5 rounded transition ${noteType === 'text' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Standard Note</button>
                    <button type="button" onClick={() => setNoteType('list')} className={`flex-1 text-xs font-bold py-1.5 rounded transition ${noteType === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Checklist</button>
                  </div>

                  {noteType === 'text' ? (
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" rows="5" placeholder="Write your note here..." required />
                  ) : (
                    <div className="space-y-2">
                      {noteItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          <input type="text" value={item.text} onChange={(e) => updateNoteItem(item.id, e.target.value)} placeholder={`List item ${idx + 1}...`} className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-teal-500" />
                          {noteItems.length > 1 && <button type="button" onClick={() => removeNoteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4"/></button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center space-x-2 text-sm text-red-700 font-semibold cursor-pointer pt-2">
                  <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 h-4 w-4" />
                  <span>Mark as Urgent (Triggers Red Alert Banner)</span>
                </label>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-yellow-900 bg-yellow-400 rounded-md hover:bg-yellow-500 transition">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Appointment Modal */}
      {isApptModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-blue-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><Clock className="h-5 w-5 mr-2"/> {editingAppt ? 'Edit Appointment' : 'New Appointment'}</h3>
              <button onClick={() => setIsApptModalOpen(false)} className="hover:text-blue-200 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveAppt} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appointment Title *</label>
                <input type="text" value={apptTitle} onChange={(e) => setApptTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="e.g. Interview with Sarah" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" value={selectedDateStr} onChange={(e) => setSelectedDateStr(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                  <input type="time" value={apptStartTime} onChange={(e) => setApptStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
                  <input type="time" value={apptEndTime} onChange={(e) => setApptEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input type="text" value={apptLocation} onChange={(e) => setApptLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="e.g. Main Office" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" rows="2" />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsApptModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">Save Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Internal Business Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-teal-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><Receipt className="h-5 w-5 mr-2"/> Log Internal Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} disabled={isUploading} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" disabled={isUploading} value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($) *</label>
                  <input type="number" disabled={isUploading} min="0.01" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm font-bold text-slate-800" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select disabled={isUploading} value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm">
                  <option>Software Subscriptions</option>
                  <option>Office Supplies</option>
                  <option>Marketing & Advertising</option>
                  <option>Insurance</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" disabled={isUploading} value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" placeholder="e.g. Printer ink" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload Receipt Image (Optional)</label>
                <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('biz-receipt-upload').click()}>
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                    <div className="flex text-xs text-slate-600 justify-center">
                      <span className="relative font-medium text-teal-600">{expFile ? expFile.name : <span>Attach receipt</span>}</span>
                    </div>
                  </div>
                  <input disabled={isUploading} id="biz-receipt-upload" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setExpFile(e.target.files[0])} />
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" disabled={isUploading} onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex items-center px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-slate-400 transition">
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : 'Save to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Private Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><FolderLock className="h-5 w-5 mr-2 text-amber-400"/> Private Drawer</h3>
              <button onClick={() => setIsDrawerOpen(false)} disabled={isDrawerUploading} className="hover:text-slate-300 transition text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto">
              <div className="mb-6">
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isDrawerUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isDrawerUploading ? <Loader2 className="w-6 h-6 mb-2 text-slate-600 animate-spin" /> : <Upload className="w-6 h-6 mb-2 text-slate-400" />}
                    <p className="text-sm text-slate-600 font-semibold">{isDrawerUploading ? 'Locking away securely...' : 'Click to securely file a document'}</p>
                  </div>
                  <input type="file" className="hidden" disabled={isDrawerUploading} onChange={handleSaveDrawerFile} />
                </label>
              </div>

              <div className="space-y-3">
                {myDrawerFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">Your drawer is empty.</div>
                ) : (
                  myDrawerFiles.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition">
                      <div className="flex items-center overflow-hidden pr-4">
                        <FileText className="h-5 w-5 mr-3 text-slate-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-sm font-semibold text-slate-800 truncate" title={file.fileName}>{file.fileName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{new Date(file.uploadDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <a href={file.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:bg-slate-100 p-2 rounded transition" title="View"><Download className="h-4 w-4" /></a>
                        <button onClick={() => { if(window.confirm('Delete this file permanently?')) onRemoveDrawerFile(file.id); }} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button type="button" onClick={() => setIsDrawerOpen(false)} disabled={isDrawerUploading} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Close Drawer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
