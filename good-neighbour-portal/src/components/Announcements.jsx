import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';

export default function Announcements({ messages = [], onSendMessage, currentUser, employees = [] }) {
  const [newMsg, setNewMsg] = useState('');
  
  // Added optional chaining (?.) to prevent crashes if currentUser is temporarily undefined
  const canSend = currentUser?.role === 'Administrator' || currentUser?.role === 'admin' || currentUser?.role === 'Block Captain';

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !currentUser) return;
    onSendMessage(newMsg, currentUser.id);
    setNewMsg('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center bg-slate-50">
        <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
        <h2 className="text-lg font-semibold text-slate-800">Team Announcements</h2>
      </div>
      <div className="p-6 flex flex-col gap-6">
        {canSend && (
          <form onSubmit={handleSend} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-sm font-semibold text-slate-700">Broadcast New Message</label>
            <textarea 
              value={newMsg} 
              onChange={(e) => setNewMsg(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
              placeholder="Write an announcement to share with the whole team..." 
              rows="3" 
              required
            />
            <button 
              type="submit" 
              className="self-end bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 flex items-center text-sm font-medium transition"
            >
              <Send className="h-4 w-4 mr-2" /> Send Announcement
            </button>
          </form>
        )}
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No announcements at this time.</p>
          ) : (
            messages.map(msg => {
              const sender = employees.find(e => e.id === msg.senderId) || 
                            (msg.senderId === 'admin1' ? { name: 'Master Admin', role: 'Administrator' } : { name: 'Unknown', role: 'Staff' });
              return (
                <div key={msg.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow transition">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                    <div className="font-semibold text-slate-800 text-sm flex items-center">
                      <User className="h-4 w-4 mr-1.5 text-slate-400" />
                      {sender.name} 
                      <span className={`ml-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                        sender.role === 'Administrator' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {sender.role}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                      {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}