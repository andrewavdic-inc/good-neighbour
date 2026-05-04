import React, { useState } from 'react';
import { MessageSquare, Send, User, Trash2, AlertTriangle, CheckCircle, Camera, Loader2, Image as ImageIcon, Users, CheckSquare, XCircle, Download, Archive } from 'lucide-react';

export default function Announcements({ 
  messages = [], 
  onSendMessage, 
  currentUser, 
  employees = [],
  onDeleteMessage,
  onAcknowledgeMessage,
  announcementPictureUrl,
  onUpdateAnnouncementPicture
}) {
  const [text, setText] = useState('');
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [expandedTrackerId, setExpandedTrackerId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      if (onSendMessage) onSendMessage(text, currentUser?.id || 'unknown', isHighPriority);
      setText('');
      setIsHighPriority(false);
    }
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onUpdateAnnouncementPicture) {
      setIsUploadingPic(true);
      await onUpdateAnnouncementPicture(file);
      setIsUploadingPic(false);
    }
  };

  // Bulletproof date sorting
  const safeSortByDateDesc = (arr) => {
    if (!arr || !Array.isArray(arr)) return [];
    return [...arr].filter(Boolean).sort((a, b) => {
      let dA = 0;
      let dB = 0;
      try { dA = a.date ? new Date(a.date).getTime() : 0; } catch(e) {}
      try { dB = b.date ? new Date(b.date).getTime() : 0; } catch(e) {}
      return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
    });
  };

  // --- PERMISSIONS ---
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'admin' || currentUser?.role === 'Master Admin';
  const canSend = isAdmin || currentUser?.role === 'Block Captain';
  
  // Strict Owner Check (Only the owner doesn't need to acknowledge)
  const isOwner = currentUser?.id === 'admin1' || currentUser?.name === 'Master Admin' || currentUser?.role === 'Master Admin';

  // Filter out the owner from the tracker so they don't show up in "Pending"
  const trackableEmployees = employees.filter(e => e.isActive !== false && e.id !== 'admin1' && e.name !== 'Master Admin' && e.role !== 'Master Admin');

  // --- MONTHLY ARCHIVE LOGIC ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const sortedMessages = safeSortByDateDesc(messages);
  
  const currentMessages = sortedMessages.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const archivedMessages = sortedMessages.filter(m => {
    if (!m.date) return true;
    const d = new Date(m.date);
    return d.getMonth() !== currentMonth || d.getFullYear() !== currentYear;
  });

  const displayMessages = showArchived ? [...currentMessages, ...archivedMessages] : currentMessages;

  // --- CSV COMPLIANCE EXPORT ---
  const exportTrackerCSV = (m, acknowledgedStaff, pendingStaff) => {
    const sender = employees.find(e => e.id === m.senderId);
    const dateStr = m.date ? new Date(m.date).toLocaleString() : 'Unknown Date';
    
    let csv = `Message Date,${dateStr}\n`;
    csv += `Sender,${sender?.name || 'Unknown Admin'}\n`;
    csv += `Message,"${(m.text || '').replace(/"/g, '""')}"\n\n`;
    
    csv += `Employee Name,Role,Status\n`;
    acknowledgedStaff.forEach(emp => {
      csv += `"${emp.name}","${emp.role}","Acknowledged"\n`;
    });
    pendingStaff.forEach(emp => {
      csv += `"${emp.name}","${emp.role}","Pending"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeDate = dateStr.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Compliance_Audit_${safeDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-800">Team Feed & Announcements</h2>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
        
        {/* --- 1. SHARED COMMUNITY PICTURE FRAME --- */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group">
          <div className="bg-slate-100 min-h-[160px] flex items-center justify-center relative">
            {isUploadingPic ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2 text-teal-600" />
                <span className="text-sm font-medium">Updating Poster...</span>
              </div>
            ) : announcementPictureUrl ? (
              <img src={announcementPictureUrl} alt="Community Announcement" className="w-full object-cover max-h-[350px]" />
            ) : (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                <span className="text-sm font-medium">Company Bulletin Board</span>
              </div>
            )}

            {/* Admin Upload Overlay */}
            {isAdmin && (
              <label className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/40 transition-all flex items-center justify-center cursor-pointer group-hover:opacity-100 opacity-0">
                <div className="bg-white/90 text-slate-800 px-4 py-2 rounded-lg shadow font-bold text-sm flex items-center transform translate-y-4 group-hover:translate-y-0 transition-all">
                  <Camera className="h-4 w-4 mr-2" /> Change Picture
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePicUpload} disabled={isUploadingPic} />
              </label>
            )}
          </div>
        </div>

        {/* --- 2. THE MESSAGE FEED --- */}
        <div className="space-y-4">
          {displayMessages.length === 0 ? (
            <div className="text-center text-slate-500 py-8 italic border border-dashed border-slate-300 rounded-xl bg-slate-50">No announcements for this period.</div>
          ) : (
            displayMessages.map(m => {
              if (!m) return null;
              
              const safeSenderId = m.senderId || '';
              const sender = (employees || []).find(e => e && e.id === safeSenderId);
              
              const isUrgent = m.isHighPriority;
              const acks = m.acknowledgements || [];
              const hasAcknowledged = acks.includes(currentUser?.id);

              // Calculate Tracker Data
              const acknowledgedStaff = trackableEmployees.filter(e => acks.includes(e.id));
              const pendingStaff = trackableEmployees.filter(e => !acks.includes(e.id));

              return (
                <div key={m.id || Math.random().toString()} className={`bg-white border rounded-lg p-5 shadow-sm transition relative overflow-hidden ${isUrgent ? 'border-yellow-300' : 'border-slate-200'}`}>
                  
                  {isUrgent && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                  )}

                  <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                    <div className="text-sm font-bold text-slate-800 flex items-center">
                      <User className="h-4 w-4 mr-1.5 text-slate-400" />
                      {String(sender?.name || 'Unknown Admin')}
                      <span className="ml-2 bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                        {String(sender?.role || 'Admin')}
                      </span>
                      {isUrgent && (
                        <span className="ml-2 bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" /> High Priority
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-slate-500 font-medium">
                        {m.date ? new Date(m.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </div>
                      {/* Delete Button for Admins */}
                      {isAdmin && (
                        <button onClick={() => onDeleteMessage && onDeleteMessage(m.id)} className="text-slate-400 hover:text-red-600 transition p-1 bg-slate-50 hover:bg-red-50 rounded" title="Delete Message">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {String(m.text || '')}
                  </div>

                  {/* --- 3. ACKNOWLEDGEMENT ACTIONS & TRACKER --- */}
                  {isUrgent && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      
                      {/* Everyone EXCEPT the Owner needs to acknowledge */}
                      {!isOwner && (
                        hasAcknowledged ? (
                          <div className="flex items-center text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit shrink-0">
                            <CheckCircle className="h-4 w-4 mr-1.5" /> You acknowledged this.
                          </div>
                        ) : (
                          <button 
                            onClick={() => onAcknowledgeMessage && onAcknowledgeMessage(m.id, currentUser.id)}
                            className="flex items-center text-yellow-900 bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-md font-bold text-sm transition shadow-sm w-full sm:w-auto justify-center shrink-0"
                          >
                            <CheckSquare className="h-4 w-4 mr-2" /> I Acknowledge
                          </button>
                        )
                      )}

                      {/* Admin Tracker Button */}
                      {isAdmin && (
                        <div className="w-full flex flex-col items-end">
                          <button 
                            onClick={() => setExpandedTrackerId(expandedTrackerId === m.id ? null : m.id)}
                            className="flex items-center text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition w-full sm:w-auto justify-center"
                          >
                            <Users className="h-4 w-4 mr-2 text-slate-500" />
                            Tracker: {acknowledgedStaff.length} / {trackableEmployees.length} Acknowledged
                          </button>

                          {/* Expanded Tracker UI */}
                          {expandedTrackerId === m.id && (
                            <div className="mt-3 w-full bg-slate-50 p-4 rounded-lg border border-slate-200">
                              
                              <div className="flex justify-end mb-3">
                                <button 
                                  onClick={() => exportTrackerCSV(m, acknowledgedStaff, pendingStaff)}
                                  className="flex items-center text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-1 rounded shadow-sm transition"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Export Audit CSV
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-emerald-800 flex items-center mb-2"><CheckCircle className="h-3.5 w-3.5 mr-1"/> Acknowledged ({acknowledgedStaff.length})</h4>
                                  <ul className="space-y-1 max-h-32 overflow-y-auto pr-2">
                                    {acknowledgedStaff.length === 0 ? <li className="text-[11px] text-slate-400 italic">No one yet.</li> : acknowledgedStaff.map(e => (
                                      <li key={e.id} className="text-xs text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded truncate">{e.name} <span className="text-[10px] text-slate-400 ml-1">({e.role})</span></li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-amber-800 flex items-center mb-2"><XCircle className="h-3.5 w-3.5 mr-1"/> Pending ({pendingStaff.length})</h4>
                                  <ul className="space-y-1 max-h-32 overflow-y-auto pr-2">
                                    {pendingStaff.length === 0 ? <li className="text-[11px] text-slate-400 italic">Everyone acknowledged!</li> : pendingStaff.map(e => (
                                      <li key={e.id} className="text-xs text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded truncate opacity-70">{e.name} <span className="text-[10px] text-slate-400 ml-1">({e.role})</span></li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
          
          {/* ARCHIVE TOGGLE BUTTON */}
          {archivedMessages.length > 0 && (
            <div className="pt-6 pb-2 flex justify-center border-t border-slate-200 border-dashed mt-8">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-300 px-4 py-2 rounded-full transition shadow-sm"
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? 'Hide Archived Announcements' : `View Archived Announcements (${archivedMessages.length})`}
              </button>
            </div>
          )}

        </div>
      </div>
      
      {canSend && (
        <form onSubmit={handleSubmit} className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-3 shrink-0">
          <label className="text-sm font-semibold text-slate-800">Broadcast New Announcement</label>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 text-sm transition resize-none" 
            placeholder="Write an announcement to share with the whole team..." 
            rows="3"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition w-full sm:w-auto">
              <input 
                type="checkbox" 
                checked={isHighPriority} 
                onChange={(e) => setIsHighPriority(e.target.checked)} 
                className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 h-4 w-4" 
              />
              <span className="flex items-center"><AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500" /> Require Acknowledgement (High Priority)</span>
            </label>

            <button 
              type="submit" 
              disabled={!text.trim()}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md px-6 py-2.5 flex items-center justify-center transition shadow-sm font-bold text-sm"
            >
              <Send className="h-4 w-4 mr-2" /> Broadcast Message
            </button>

          </div>
        </form>
      )}
    </div>
  );
}
