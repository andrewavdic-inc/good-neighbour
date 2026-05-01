import React, { useState, useMemo } from 'react';
import { Coffee, Plus, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight, AlertCircle, FileText, Download, Receipt, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { parseLocal } from '../utils';

export default function AdminDesk({ notes = [], businessExpenses = [], currentUser, onAddNote, onUpdateNote, onRemoveNote, onAddBusinessExpense, onRemoveBusinessExpense, employees = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Note Form State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteDate, setSelectedNoteDate] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Business Expense Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Office Supplies');
  const [expDescription, setExpDescription] = useState('');
  const [expFile, setExpFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter out ONLY the current user's notes
  const myNotes = useMemo(() => notes.filter(n => n.authorId === currentUser.id), [notes, currentUser.id]);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* LEFT COLUMN: PRIVATE CALENDAR & NOTES */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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

        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-100/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
              <FileText className="h-5 w-5 mr-2" /> My Sticky Notes
            </h2>
            <button onClick={() => handleDayClick(new Date().getDate())} className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold px-3 py-1.5 rounded transition">
              + New Note
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {myNotes.length === 0 ? (
              <div className="text-center py-8 text-yellow-600/60 text-sm font-medium italic">Click any day on the calendar to add a private note.</div>
            ) : (
              myNotes.sort((a,b) => new Date(a.reminderDate) - new Date(b.reminderDate)).map(note => {
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

      {/* RIGHT COLUMN: SHARED BUSINESS EXPENSES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-teal-600" />
            Company Expense Ledger
          </h2>
          <div className="flex space-x-2">
            <button onClick={exportBusinessExpenses} className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center">
              <Download className="h-3 w-3 mr-1" /> Export
            </button>
            <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center">
              <Plus className="h-3 w-3 mr-1" /> Log Expense
            </button>
          </div>
        </div>
        
        <div className="bg-teal-50 p-4 border-b border-teal-100 flex justify-between items-center">
          <div className="text-sm text-teal-800 font-medium">This ledger tracks internal operational costs (software, supplies, marketing) and is shared across all Administrators.</div>
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

      {/* MODALS */}
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
    </div>
  );
}
