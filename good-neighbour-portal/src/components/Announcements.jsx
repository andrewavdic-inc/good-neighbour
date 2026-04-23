import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';

export default function Announcements({ messages = [], onSendMessage, currentUser, employees = [] }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text, currentUser?.id || 'unknown');
      setText('');
    }
  };

  // Bulletproof date sorting to prevent crashes from malformed Firebase timestamps
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

  // Check if the current user has permission to broadcast messages
  const canSend = currentUser?.role === 'Administrator' || currentUser?.role === 'admin' || currentUser?.role === 'Block Captain';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-bold text-slate-800">Team Announcements</h2>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {!messages || messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No announcements yet.</div>
        ) : (
          safeSortByDateDesc(messages).map(m => {
            if (!m) return null;
            
            const safeSenderId = m.senderId || '';
            const sender = (employees || []).find(e => e && e.id === safeSenderId);
            
            return (
              <div key={m.id || Math.random().toString()} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow transition">
                <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                  <div className="text-sm font-bold text-slate-800 flex items-center">
                    <User className="h-4 w-4 mr-1.5 text-slate-400" />
                    {String(sender?.name || 'Unknown')}
                    <span className="ml-2 bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                      {String(sender?.role || 'Admin')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {m.date ? new Date(m.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </div>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {String(m.text || '')}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {canSend && (
        <form onSubmit={handleSubmit} className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-800">Broadcast New Announcement</label>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 text-sm transition resize-none" 
            placeholder="Write an announcement to share with the whole team..." 
            rows="3"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="self-end bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md px-5 py-2 flex items-center justify-center transition shadow-sm font-medium text-sm"
          >
            <Send className="h-4 w-4 mr-2" /> Broadcast Message
          </button>
        </form>
      )}
    </div>
  );
}
