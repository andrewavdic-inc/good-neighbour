import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-bold text-slate-800">Team Feed</h2>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {!messages || messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No announcements yet.</div>
        ) : (
          safeSortByDateDesc(messages).map(m => {
            if (!m) return null;
            
            const safeSenderId = m.senderId || '';
            const sender = (employees || []).find(e => e && e.id === safeSenderId);
            const isMe = currentUser && safeSenderId === currentUser.id;
            
            return (
              <div key={m.id || Math.random().toString()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${isMe ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                  <div className={`text-xs font-bold mb-1 ${isMe ? 'text-teal-100' : 'text-teal-700'}`}>
                    {/* String casts prevent React Object Child rendering crashes */}
                    {String(sender?.name || 'Unknown')}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {String(m.text || '')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white flex gap-3">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm transition" 
          placeholder="Post a message to the team..." 
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition shadow-sm"
        >
          <Send className="h-4 w-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
