import React, { useState, useMemo, useEffect } from 'react';
import { Coffee, Plus, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight, FileText, Download, Receipt, Upload, Loader2, Image as ImageIcon, Archive, FolderLock, Camera, CloudSun, Clock, BookOpen, Folder } from 'lucide-react';

export default function AdminDesk({ 
  notes = [], businessExpenses = [], currentUser, onAddNote, onUpdateNote, onRemoveNote, 
  onAddBusinessExpense, onRemoveBusinessExpense, employees = [], officeLocation, 
  adminDrawer = [], onAddDrawerFile, onRemoveDrawerFile, 
  cabinetDocuments = [], onAddCabinetDocument, onRemoveCabinetDocument, onUpdateDeskPicture 
}) {
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Note Form State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteDate, setSelectedNoteDate] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [noteSort, setNoteSort] = useState('asc'); // Sort toggle

  // Business Expense Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Office Supplies');
  const [expDescription, setExpDescription] = useState('');
  const [expFile, setExpFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Bottom Cabinet State
  const [cabinetTab, setCabinetTab] = useState('expenses');
  
  // Cabinet Document State
  const [cabDocTitle, setCabDocTitle] = useState('');
  const [cabDocFile, setCabDocFile] = useState(null);
  const [isCabDocUploading, setIsCabDocUploading] = useState(false);

  // Private Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerUploading, setIsDrawerUploading] = useState(false);

  // Weather & Clock Widget State
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
        setWeather({
          temp: data.current_condition[0].temp_C,
          condition: data.current_condition[0].weatherDesc[0].value,
          icon: '☁️'
        });
      } catch(e) {
        setWeather({ temp: '--', condition: 'Weather Unavailable', icon: '🌤️' });
      }
    };
    fetchWeather();
  }, [officeLocation]);

  // Scoped Data
  const myNotes = useMemo(() => notes.filter(n => n.authorId === currentUser.id), [notes, currentUser.id]);
  const myDrawerFiles = useMemo(() => adminDrawer.filter(f => f.authorId === currentUser.id), [adminDrawer, currentUser.id]);
  const safeCabinetDocs = Array.isArray(cabinetDocuments) ? cabinetDocuments : [];

  const sortedNotes = useMemo(() => {
    return [...myNotes].sort((a,b) => {
      const diff = new Date(a.reminderDate) - new Date(b.reminderDate);
      return noteSort === 'asc' ? diff : -diff;
    });
  }, [myNotes, noteSort]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDayClick = (day) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedNoteDate(formattedDate);
    setNoteText('');
    setIsUrgent(false);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote({
      authorId: currentUser.id,
      text: noteText,
      reminderDate: selectedNoteDate,
      isUrgent,
      dateCreated: new Date().toISOString()
    });
    setIsNoteModalOpen(false);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || !expDate) return;
    setIsUploading(true);
    await onAddBusinessExpense({
      date: expDate,
      amount: Number(expAmount),
      category: expCategory,
      description: expDescription,
      loggedBy: currentUser.id
    }, expFile);
    setIsUploading(false);
    setIsExpenseModalOpen(false);
    setExpAmount(''); setExpDescription(''); setExpFile(null);
  };

  const handleSaveDrawerFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsDrawerUploading(true);
    await onAddDrawerFile({
      authorId: currentUser.id,
      fileName: file.name,
      uploadDate: new Date().toISOString()
    }, file);
    setIsDrawerUploading(false);
  };

  const handleSaveCabinetDocument = async (e) => {
    e.preventDefault();
    if (!cabDocTitle || !cabDocFile) return;
    setIsCabDocUploading(true);
    await onAddCabinetDocument({
      title: cabDocTitle,
      fileName: cabDocFile.name,
      uploadDate: new Date().toISOString()
    }, cabDocFile);
    setIsCabDocUploading(false);
    setCabDocTitle('');
    setCabDocFile(null);
  };

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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Company_Expenses_${year}_${monthNames[month]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 shadow-inner min-h-[900px] flex flex-col">
      
      {/* --- TOP SECTION: ON THE DESK --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: WIDGET, PICTURE, & DRAWER */}
        <div className="flex flex-col space-y-6">
          
          {/* Live Clock & Weather Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><CloudSun size={120}/></div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter mb-1 relative z-10">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm font-bold text-teal-600 mb-4 relative z-10 uppercase tracking-widest">
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 w-full justify-center relative z-10">
              <span className="text-2xl">{weather.icon}</span>
              <div>
                <div className="text-sm font-bold text-slate-700">{weather.temp}°C &bull; {weather.condition}</div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{officeLocation || 'Location not set'}</div>
              </div>
            </div>
          </div>

          {/* Framed Picture */}
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

          {/* Private Drawer Button */}
          <button onClick={() => setIsDrawerOpen(true)} className="w-full flex items-center justify-center p-5 bg-slate-800 text-white rounded-xl shadow-md hover:bg-slate-700 transition group mt-auto">
            <FolderLock className="h-7 w-7 mr-3 group-hover:scale-110 transition-transform text-amber-400" />
            <div className="text-left">
              <div className="font-bold text-lg leading-tight">Private Drawer</div>
              <div className="text-xs text-slate-400">Locked Personal Files</div>
            </div>
          </button>
        </div>

        {/* COL 2: PRIVATE CALENDAR */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-teal-600" />
              Private Planner
            </h2>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-slate-200 transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
              <span className="text-sm font-bold text-slate-700 w-24 text-center">{monthNames[month]} {year}</span>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-slate-200 transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanksArray.map(blank => <div key={`blank-${blank}`} className="h-10 rounded"></div>)}
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayNotes = myNotes.filter(n => n.reminderDate === dateStr);
                const hasUrgent = dayNotes.some(n => n.isUrgent);
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`h-12 border rounded cursor-pointer transition flex flex-col items-center justify-center relative hover:border-teal-400 hover:bg-teal-50 ${isToday ? 'border-teal-500 bg-teal-50 font-bold text-teal-700' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                  >
                    {day}
                    {dayNotes.length > 0 && (
                      <div className="absolute bottom-1 flex space-x-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${hasUrgent ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* COL 3: SORTABLE STICKY NOTES */}
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-100/50 flex flex-col space-y-3">
            <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
              <FileText className="h-5 w-5 mr-2" /> My Sticky Notes
            </h2>
            <div className="flex space-x-2 w-full">
              <button onClick={() => setNoteSort(s => s === 'asc' ? 'desc' : 'asc')} className="flex-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold px-2 py-1.5 rounded transition flex items-center justify-center">
                Sort: {noteSort === 'asc' ? 'Earliest First' : 'Latest First'}
              </button>
              <button onClick={() => handleDayClick(new Date().getDate())} className="flex-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold px-2 py-1.5 rounded transition">
                + New Note
              </button>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {sortedNotes.length === 0 ? (
              <div className="text-center py-8 text-yellow-600/60 text-sm font-medium italic">Click any day on the calendar to add a private note.</div>
            ) : (
              sortedNotes.map(note => {
                const isPast = new Date(note.reminderDate) < new Date(new Date().toISOString().split('T')[0]);
                return (
                  <div key={note.id} className={`p-4 rounded-lg shadow-sm border relative ${note.isUrgent ? 'bg-red-50 border-red-200 text-red-900' : isPast ? 'bg-white opacity-60 border-slate-200 text-slate-500' : 'bg-white border-yellow-200 text-slate-800'}`}>
                    <button onClick={() => onRemoveNote(note.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition"><Trash2 className="h-4 w-4"/></button>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center opacity-70">
                      <CalendarIcon className="h-3 w-3 mr-1" /> {note.reminderDate}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: THE FILING CABINET --- */}
      <div className="mt-8 border-t-4 border-slate-800 pt-8 flex-1 flex flex-col">
        
        {/* Cabinet Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-end justify-between mb-4 gap-4">
          <div className="flex items-center text-2xl font-black text-slate-800 shrink-0">
            <Archive className="h-8 w-8 mr-3 text-slate-800" />
            The Filing Cabinet
          </div>
          <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setCabinetTab('expenses')} 
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Company Ledger
            </button>
            <button 
              onClick={() => setCabinetTab('documents')} 
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition whitespace-nowrap ${cabinetTab === 'documents' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Private Company Documents
            </button>
          </div>
        </div>

        {/* Cabinet Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden min-h-[500px]">
          
          {/* TAB 1: SHARED EXPENSE LEDGER */}
          {cabinetTab === 'expenses' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <Receipt className="h-5 w-5 mr-2 text-teal-600" />
                  Internal Business Expenses
                </h2>
                <div className="flex space-x-2">
                  <button onClick={exportBusinessExpenses} className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center">
                    <Download className="h-3 w-3 mr-1" /> Export CSV
                  </button>
                  <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center">
                    <Plus className="h-3 w-3 mr-1" /> Log Bill
                  </button>
                </div>
              </div>
              
              <div className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {businessExpenses.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">No business expenses have been logged yet.</div>
                  ) : (
                    businessExpenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => {
                      const emp = employees.find(e => e.id === exp.loggedBy);
                      return (
                        <div key={exp.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center text-sm">
                                {exp.category}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {exp.date} &bull; Logged by {emp?.name || 'Admin'}
                              </div>
                              {exp.description && <div className="text-xs text-slate-600 italic mt-1">"{exp.description}"</div>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-black text-slate-800">${Number(exp.amount).toFixed(2)}</div>
                            <div className="flex flex-col space-y-1">
                              {exp.receiptUrl && (
                                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-2 py-1 rounded font-semibold text-center transition border border-teal-200">
                                  Receipt
                                </a>
                              )}
                              <button onClick={() => { if(window.confirm('Delete this expense?')) onRemoveBusinessExpense(exp.id); }} className="text-xs text-slate-400 hover:text-red-600 transition text-right">Delete</button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVATE COMPANY DOCUMENTS */}
          {cabinetTab === 'documents' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <Folder className="h-5 w-5 mr-2 text-teal-600" />
                  Private Company Documents
                </h2>
              </div>
              
              <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                <form onSubmit={handleSaveCabinetDocument} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label>
                    <input type="text" value={cabDocTitle} onChange={(e) => setCabDocTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required disabled={isCabDocUploading} placeholder="e.g. 2026 Tax Return" />
                  </div>
                  <div className="w-full sm:w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                    <div className={`flex justify-center px-4 py-2 border-2 border-slate-300 border-dashed rounded-md bg-white transition ${isCabDocUploading ? 'opacity-50' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isCabDocUploading && document.getElementById('cab-doc-upload').click()}>
                      <div className="text-center text-sm font-medium text-teal-600 truncate">
                        {cabDocFile ? cabDocFile.name : 'Select File'}
                      </div>
                      <input id="cab-doc-upload" type="file" accept=".pdf,image/*,.doc,.docx" className="sr-only" onChange={(e) => setCabDocFile(e.target.files[0])} disabled={isCabDocUploading} />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/3">
                    <button type="submit" disabled={isCabDocUploading || !cabDocTitle || !cabDocFile} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center transition shadow-sm text-sm">
                      {isCabDocUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : <><Plus className="h-4 w-4 mr-2"/> File Document</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-6 bg-white flex-1 overflow-y-auto">
                {safeCabinetDocs.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">The filing cabinet is empty.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeCabinetDocs.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(doc => (
                      <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-slate-50 group">
                        <div className="flex items-center space-x-4 overflow-hidden pr-4">
                          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div className="truncate">
                            <h3 className="font-bold text-slate-800 truncate leading-tight">{doc.title}</h3>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                              {doc.fileName} &bull; {new Date(doc.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <a href={doc.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:bg-teal-50 p-2 rounded transition inline-flex" title="Download/View">
                            <Download className="h-5 w-5" />
                          </a>
                          <button onClick={() => { if(window.confirm(`Delete "${doc.title}" permanently?`)) onRemoveCabinetDocument(doc.id); }} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition ml-1" title="Delete">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-yellow-50 text-yellow-800 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center"><FileText className="h-5 w-5 mr-2"/> Add Private Note</h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="hover:text-yellow-600 transition text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                <input type="date" value={selectedNoteDate} onChange={(e) => setSelectedNoteDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note Details</label>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 text-sm" rows="4" placeholder="Reminder to..." required />
              </div>
              <label className="flex items-center space-x-2 text-sm text-red-700 font-semibold cursor-pointer">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 h-4 w-4" />
                <span>Mark as Urgent (Triggers Red Notification Dot)</span>
              </label>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-yellow-900 bg-yellow-400 rounded-md hover:bg-yellow-500 transition">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Expense Modal */}
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

      {/* 3. Private Drawer Modal */}
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
