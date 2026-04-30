import React from 'react';
import { MapPin, HeartPulse, ShieldAlert, Phone, Mail, User, Shield, Wallet } from 'lucide-react';

export default function ClientProfileModal({ client, remainingBalance = 0, onClose }) {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 overflow-hidden">
              {client.photoUrl && !client.photoUrl.includes('dicebear') ? (
                <img src={client.photoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" />
              ) : (
                <User className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">{client.name}</h3>
              <div className="text-teal-100 text-sm flex items-center mt-0.5">
                <MapPin className="h-3.5 w-3.5 mr-1" /> {client.address || 'No address on file'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-3xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Health & Notes */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <HeartPulse className="h-5 w-5 mr-2 text-rose-500" /> Neighbour Notes & Care Plan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <span className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1 block">Dietary & Allergies</span>
                    <p className="text-sm text-slate-700 font-medium">{client.dietary || 'None specified.'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 block">Mobility Needs</span>
                    <p className="text-sm text-slate-700 font-medium">{client.mobility || 'Fully mobile.'}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 md:col-span-2">
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1 block">Hobbies, Interests & Triggers</span>
                    <p className="text-sm text-slate-700 font-medium">{client.hobbies || 'None specified.'}</p>
                  </div>
                  {client.notes && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 md:col-span-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">General Care Notes</span>
                      <p className="text-sm text-slate-700">{client.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Budget & Contacts */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <Wallet className="h-5 w-5 mr-2 text-emerald-600" /> Authorized Budget
                </h4>
                <div className="mb-2">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Funds Remaining This Month</div>
                  <div className={`text-2xl font-black ${remainingBalance < 20 ? 'text-red-600' : 'text-emerald-600'}`}>${remainingBalance.toFixed(2)}</div>
                </div>
                <div className="text-xs text-slate-500 italic mt-3">This is the max limit authorized for Out-of-Pocket purchases and mileage logs.</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" /> Quick Contacts
                </h4>
                <div className="space-y-3">
                  {/* Primary Contact */}
                  {client.emergencyContactName ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Primary Emergency</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.emergencyContactName}</div>
                      <a href={`tel:${client.emergencyContactPhone}`} className="w-full flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm">
                        <Phone className="h-3 w-3 mr-1.5" /> {client.emergencyContactPhone || 'Call'}
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded">No primary emergency contact.</div>
                  )}

                  {/* Secondary Contact */}
                  {client.secondaryEmergencyName && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Secondary Emergency</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.secondaryEmergencyName}</div>
                      <a href={`tel:${client.secondaryEmergencyPhone}`} className="w-full flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm">
                        <Phone className="h-3 w-3 mr-1.5" /> {client.secondaryEmergencyPhone || 'Call'}
                      </a>
                    </div>
                  )}

                  {/* Billing Contact */}
                  {client.accountHolderName && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account / Billing</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.accountHolderName}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <a href={`tel:${client.accountHolderPhone}`} className="flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm">
                          <Phone className="h-3 w-3 mr-1" /> Call
                        </a>
                        <a href={`mailto:${client.accountHolderEmail}`} className="flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm">
                          <Mail className="h-3 w-3 mr-1" /> Email
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
