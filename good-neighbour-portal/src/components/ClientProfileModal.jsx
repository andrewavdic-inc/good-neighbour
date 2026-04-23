import React from 'react';
import { User, CalendarDays, MapPin, Phone, Mail, Info, Heart, Wallet, ShieldAlert, X } from 'lucide-react';

export default function ClientProfileModal({ client, remainingBalance, onClose }) {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-teal-200 fill-current" />
            <h3 className="text-xl font-bold tracking-wide">Client Care Plan</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-teal-800/50 hover:bg-teal-800 rounded-full transition text-teal-100 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          
          {/* Profile Overview Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {client.photoUrl ? (
              <img src={client.photoUrl} alt={client.name} className="h-24 w-24 rounded-full border-4 border-teal-50 object-cover shadow-sm" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-teal-100 border-4 border-teal-50 flex items-center justify-center shadow-sm">
                <User className="h-12 w-12 text-teal-600" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">{client.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Wallet className="h-3.5 w-3.5 mr-1.5" /> ${Number(remainingBalance || 0).toFixed(2)} Monthly Funds Left
                </span>
                {client.dateOfBirth && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> DOB: {client.dateOfBirth}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Care Notes & Routine */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2" /> Care Notes & Routine
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {client.notes || 'No specific care notes or routine instructions provided.'}
                </p>
              </div>

              {/* Client Location & Contact */}
              {(client.phone || client.address) && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Client Location & Contact</h4>
                  <div className="space-y-4">
                    {client.phone && (
                      <div className="flex items-center text-sm text-slate-700">
                        <div className="p-2 bg-slate-100 rounded-lg mr-3">
                          <Phone className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="font-semibold text-lg">{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start text-sm text-slate-700">
                        <div className="p-2 bg-slate-100 rounded-lg mr-3 mt-0.5">
                          <MapPin className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="font-medium leading-relaxed">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Emergency Contacts */}
              <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center">
                  <ShieldAlert className="h-5 w-5 mr-2" /> Emergency Contacts
                </h4>
                
                <div className="space-y-4">
                  {client.emergencyContactName ? (
                    <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-red-500"></div>
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Primary Contact</div>
                      <div className="font-bold text-slate-800 text-base">{client.emergencyContactName}</div>
                      <div className="text-xl font-black text-red-600 mt-1 flex items-center">
                        <Phone className="h-5 w-5 mr-2" /> {client.emergencyContactPhone}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 italic bg-white p-4 rounded-lg border border-red-100">No primary emergency contact listed.</div>
                  )}

                  {client.secondaryEmergencyName && (
                    <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm opacity-90 relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-red-300"></div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Secondary Contact</div>
                      <div className="font-bold text-slate-800">{client.secondaryEmergencyName}</div>
                      <div className="text-lg font-bold text-red-600 mt-1 flex items-center">
                        <Phone className="h-4 w-4 mr-2" /> {client.secondaryEmergencyPhone}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Holder */}
              {client.accountHolderName && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-indigo-500" /> Account Holder
                  </h4>
                  <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-3">
                    <div className="font-extrabold text-slate-800 text-base pb-2 border-b border-indigo-100/50">{client.accountHolderName}</div>
                    {client.accountHolderPhone && (
                      <div className="flex items-center text-sm text-slate-700 font-medium">
                        <Phone className="h-4 w-4 mr-2.5 text-indigo-400" /> {client.accountHolderPhone}
                      </div>
                    )}
                    {client.accountHolderEmail && (
                      <div className="flex items-center text-sm text-slate-700 font-medium">
                        <Mail className="h-4 w-4 mr-2.5 text-indigo-400" /> {client.accountHolderEmail}
                      </div>
                    )}
                    {client.accountHolderAddress && (
                      <div className="flex items-start text-sm text-slate-700 font-medium mt-1">
                        <MapPin className="h-4 w-4 mr-2.5 text-indigo-400 mt-0.5" /> 
                        <span className="leading-relaxed">{client.accountHolderAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition shadow-sm">
            Close Care Plan
          </button>
        </div>

      </div>
    </div>
  );
}
