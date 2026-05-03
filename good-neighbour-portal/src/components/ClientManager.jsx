import React, { useState } from 'react';
import { Heart, Search, Edit, Trash2, User, Phone, Wallet, Image as ImageIcon, Plus, MapPin, CalendarDays, Info, ShieldAlert, AlertCircle, Star, Sun, Moon, TreePine, Sailboat, Cloud, Zap, Coffee, HeartPulse, PieChart, Mail, FileText, ChevronRight, Clock, Upload, Loader2, Archive, RefreshCcw } from 'lucide-react';

const CaptainHatIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10c-1-4 1-6 6-6s7 2 6 6" />
    <path d="M2 14c0-2.5 2-4 5-4h10c3 0 5 1.5 5 4 0 2-4 3-10 3S2 16.5 2 14z" />
    <circle cx="12" cy="10" r="1.5" />
  </svg>
);

const SafeAvatar = ({ url, name, role, className }) => {
  const [imgError, setImgError] = React.useState(false);
  let cleanUrl = url || '';
  if (cleanUrl.startsWith('[')) {
    const match = cleanUrl.match(/\]\((.*?)\)/);
    if (match && match[1]) cleanUrl = match[1];
  }
  const ICONS = ['Star', 'Sun', 'Moon', 'TreePine', 'Sailboat', 'Cloud', 'Zap'];
  const iconIndex = name ? name.length % ICONS.length : 0;
  const iconName = ICONS[iconIndex];

  const renderIcon = () => {
    if (String(role).includes('Admin')) return <CaptainHatIcon className={className} />;
    if (iconName === 'Star') return <Star className={className} fill="currentColor" />;
    if (iconName === 'Sun') return <Sun className={className} />;
    if (iconName === 'Moon') return <Moon className={className} />;
    if (iconName === 'TreePine') return <TreePine className={className} />;
    if (iconName === 'Sailboat') return <Sailboat className={className} />;
    if (iconName === 'Cloud') return <Cloud className={className} />;
    if (iconName === 'Zap') return <Zap className={className} fill="currentColor" />;
    return <User className={className} />;
  };

  if (!cleanUrl || imgError || cleanUrl.includes('dicebear.com')) return renderIcon();
  return <img src={cleanUrl} alt={name || 'Avatar'} className={`h-full w-full object-cover bg-white ${className}`} onError={() => setImgError(true)} />;
};

function ClientCarePlanModal({ client, shifts = [], employees = [], clientExpenses = [], expenses = [], onClose }) {
  if (!client) return null;

  const safeClientExpenses = Array.isArray(clientExpenses) ? clientExpenses : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const oopSpentThisMonth = safeClientExpenses
    .filter(e => e.clientId === client.id && e.status === 'approved' && new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const mileageSpentThisMonth = safeExpenses
    .filter(e => e.clientId === client.id && e.status === 'approved' && new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);

  const spentThisMonth = oopSpentThisMonth + mileageSpentThisMonth;
  const allowance = Number(client.monthlyAllowance || 0);
  const remaining = allowance - spentThisMonth;
  const percentUsed = allowance > 0 ? Math.min((spentThisMonth / allowance) * 100, 100) : 0;

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const now = new Date();
  
  const clientShifts = safeShifts.filter(s => s.clientId === client.id).sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingShifts = clientShifts.filter(s => new Date(`${s.date}T${s.endTime || '23:59'}`) >= now).slice(0, 3);
  const pastShifts = clientShifts.filter(s => new Date(`${s.date}T${s.endTime || '23:59'}`) < now).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  const getEmpName = (id) => safeEmployees.find(e => e.id === id)?.name || 'Unassigned';

  // --- NEW: DYNAMIC SHIFT BALANCE CALCULATION ---
  const totalPurchased = Number(client.purchasedShifts || 0);
  const shiftsUsedOrScheduled = clientShifts.length;
  const remainingShifts = totalPurchased - shiftsUsedOrScheduled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 overflow-hidden">
              <SafeAvatar url={client.photoUrl} name={client.name} role="" className="h-6 w-6 text-white"/>
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">{client.name} {client.isActive === false && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded ml-2 align-middle">DEACTIVATED</span>}</h3>
              <div className="text-teal-100 text-sm flex items-center mt-0.5">
                <MapPin className="h-3.5 w-3.5 mr-1" /> {client.address || 'No address on file'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-3xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <CalendarDays className="h-5 w-5 mr-2 text-teal-600" /> Visit History
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming Visits</h5>
                    <div className="space-y-2">
                      {upcomingShifts.length === 0 ? <p className="text-sm text-slate-500 italic">No upcoming visits scheduled.</p> : upcomingShifts.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-teal-50 border border-teal-100 p-2.5 rounded-lg">
                          <div>
                            <div className="text-sm font-bold text-teal-900">{new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                            <div className="text-xs text-teal-700">{s.startTime} - {s.endTime}</div>
                          </div>
                          <div className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm text-slate-600">{getEmpName(s.employeeId)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Past</h5>
                    <div className="space-y-2">
                      {pastShifts.length === 0 ? <p className="text-sm text-slate-500 italic">No past visits logged.</p> : pastShifts.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg opacity-80">
                          <div><div className="text-sm font-bold text-slate-700">{new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
                          <div className="text-xs font-semibold text-slate-500">{getEmpName(s.employeeId)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* --- NEW: SHIFT BALANCE TRACKER --- */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <CalendarDays className="h-5 w-5 mr-2 text-blue-600" /> Shift Balance
                </h4>
                <div className="mb-2 flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Remaining</div>
                    <div className={`text-2xl font-black ${remainingShifts <= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {remainingShifts}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 text-right mb-1">of {totalPurchased} purchased</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <PieChart className="h-5 w-5 mr-2 text-emerald-600" /> Expense Budget
                </h4>
                <div className="mb-2 flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Remaining (This Month)</div>
                    <div className={`text-2xl font-black ${remaining < 20 ? 'text-red-600' : 'text-emerald-600'}`}>${remaining.toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-slate-400 text-right mb-1">of ${allowance.toFixed(2)}</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div className={`h-2.5 rounded-full ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${percentUsed}%` }}></div>
                </div>
                <div className="text-right text-[10px] font-semibold text-slate-400">{percentUsed.toFixed(0)}% Utilized</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                  <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" /> Quick Contacts
                </h4>
                <div className="space-y-3">
                  {client.emergencyContactName ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Primary Emergency</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.emergencyContactName}</div>
                      <a href={`tel:${client.emergencyContactPhone}`} className="w-full flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm"><Phone className="h-3 w-3 mr-1.5" /> {client.emergencyContactPhone || 'Call'}</a>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded">No primary emergency contact.</div>
                  )}

                  {client.secondaryEmergencyName && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Secondary Emergency</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.secondaryEmergencyName}</div>
                      <a href={`tel:${client.secondaryEmergencyPhone}`} className="w-full flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm"><Phone className="h-3 w-3 mr-1.5" /> {client.secondaryEmergencyPhone || 'Call'}</a>
                    </div>
                  )}

                  {client.accountHolderName && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account / Billing</div>
                      <div className="font-bold text-slate-800 text-sm mb-2">{client.accountHolderName}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <a href={`tel:${client.accountHolderPhone}`} className="flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm"><Phone className="h-3 w-3 mr-1" /> Call</a>
                        <a href={`mailto:${client.accountHolderEmail}`} className="flex items-center justify-center bg-white border border-slate-300 hover:border-teal-400 hover:text-teal-700 text-slate-600 font-medium py-1.5 rounded transition text-xs shadow-sm"><Mail className="h-3 w-3 mr-1" /> Email</a>
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

function EditClientModal({ client, onClose, onSave, onClientFileUpload }) {
  const [formData, setFormData] = useState({
    name: client.name || '', dateOfBirth: client.dateOfBirth || '', phone: client.phone || '', address: client.address || '',
    notes: client.notes || '', dietary: client.dietary || '', mobility: client.mobility || '', hobbies: client.hobbies || '',
    emergencyContactName: client.emergencyContactName || '', emergencyContactPhone: client.emergencyContactPhone || '',
    secondaryEmergencyName: client.secondaryEmergencyName || '', secondaryEmergencyPhone: client.secondaryEmergencyPhone || '',
    accountHolderName: client.accountHolderName || '', accountHolderAddress: client.accountHolderAddress || '',
    accountHolderPhone: client.accountHolderPhone || '', accountHolderEmail: client.accountHolderEmail || '',
    monthlyAllowance: client.monthlyAllowance?.toString() || '0',
    purchasedShifts: client.purchasedShifts?.toString() || '0' // --- NEW: PURCHASED SHIFTS STATE ---
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isUploading, setIsUploading] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);

  const clientUploads = client.uploadedFiles || [];
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsUploading(true);
    const updatedData = { 
      ...formData, 
      monthlyAllowance: Number(formData.monthlyAllowance) || 0,
      purchasedShifts: Number(formData.purchasedShifts) || 0 // --- NEW: PARSE PURCHASED SHIFTS ---
    };
    if (onSave) await onSave(client.id, updatedData, photoFile);
    setIsUploading(false);
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onClientFileUpload) {
      setIsDocUploading(true);
      await onClientFileUpload(client.id, file);
      setIsDocUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white">
          <h3 className="text-lg font-bold flex items-center"><Edit className="h-5 w-5 mr-2 text-teal-200"/> Edit Client: {client.name}</h3>
          <button onClick={onClose} disabled={isUploading} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6 overflow-x-auto scrollbar-hide shrink-0">
          <button type="button" onClick={() => setActiveTab('profile')} className={`whitespace-nowrap pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Profile & Care Notes</button>
          <button type="button" onClick={() => setActiveTab('uploads')} className={`whitespace-nowrap pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'uploads' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Uploaded Documents</button>
        </div>

        <div className="overflow-y-auto p-6 bg-slate-50/50">
          <form id="edit-client-form" onSubmit={handleSubmit} className={activeTab === 'profile' ? 'space-y-6' : 'hidden'}>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Client Details</h4>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" disabled={isUploading} value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label><input type="date" disabled={isUploading} value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label><input type="text" disabled={isUploading} value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Client Home Address</label><input type="text" disabled={isUploading} value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Neighbour Notes & Care Plan</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Dietary Restrictions & Allergies</label><input type="text" disabled={isUploading} value={formData.dietary} onChange={(e) => handleChange('dietary', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. Gluten free, no nuts" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Mobility Notes</label><input type="text" disabled={isUploading} value={formData.mobility} onChange={(e) => handleChange('mobility', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. Uses a walker" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Hobbies & Triggers</label><input type="text" disabled={isUploading} value={formData.hobbies} onChange={(e) => handleChange('hobbies', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. Loves gardening." /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">General Care Notes</label><textarea disabled={isUploading} value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" rows="3" /></div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Account Holder & Billing</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Full Name</label><input type="text" disabled={isUploading} value={formData.accountHolderName} onChange={(e) => handleChange('accountHolderName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label><input type="number" disabled={isUploading} min="0" value={formData.monthlyAllowance} onChange={(e) => handleChange('monthlyAllowance', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" required /></div>
              </div>
              {/* --- NEW: TOTAL PURCHASED SHIFTS INPUT --- */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Purchased Shifts *</label>
                  <input type="number" disabled={isUploading} min="0" value={formData.purchasedShifts} onChange={(e) => handleChange('purchasedShifts', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Account Phone</label><input type="text" disabled={isUploading} value={formData.accountHolderPhone} onChange={(e) => handleChange('accountHolderPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Account Email</label><input type="email" disabled={isUploading} value={formData.accountHolderEmail} onChange={(e) => handleChange('accountHolderEmail', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" /></div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Emergency Contacts</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Primary Emergency Contact</label><input type="text" disabled={isUploading} value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name (e.g. Son)" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone</label><input type="text" disabled={isUploading} value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Secondary Contact (Optional)</label><input type="text" disabled={isUploading} value={formData.secondaryEmergencyName} onChange={(e) => handleChange('secondaryEmergencyName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Secondary Phone</label><input type="text" disabled={isUploading} value={formData.secondaryEmergencyPhone} onChange={(e) => handleChange('secondaryEmergencyPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" /></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo</label>
              <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer bg-white'}`} onClick={() => !isUploading && document.getElementById('edit-client-photo-upload').click()}>
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative font-medium text-teal-600">
                      {photoFile ? photoFile.name : <span>Upload a new photo</span>}
                    </span>
                  </div>
                </div>
                <input id="edit-client-photo-upload" disabled={isUploading} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhotoFile(e.target.files[0])} />
              </div>
            </div>
          </form>

          <div className={activeTab === 'uploads' ? 'block' : 'hidden'}>
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-teal-600"/> 
                Forms & Documents for {client.name}
              </h4>
              <div className="mb-6">
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isDocUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isDocUploading ? <Loader2 className="w-6 h-6 mb-2 text-teal-600 animate-spin" /> : <Upload className="w-6 h-6 mb-2 text-slate-400" />}
                      <p className="text-sm text-slate-500">{isDocUploading ? <span className="font-semibold text-teal-600">Uploading securely...</span> : <><span className="font-semibold text-teal-600">Click to upload</span> intake form or email</>}</p>
                    </div>
                    <input type="file" className="hidden" disabled={isDocUploading} onChange={handleDocumentUpload} />
                  </label>
                </div>
              </div>

              {clientUploads.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">No documents have been uploaded to this file.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientUploads.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50 transition border border-slate-200 rounded-md">
                      <div className="flex items-center overflow-hidden pr-4">
                        <FileText className="h-6 w-6 mr-3 text-teal-600 shrink-0" />
                        <div className="truncate">
                          <div className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{new Date(file.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded transition text-xs font-semibold shadow-sm shrink-0">View</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button type="button" disabled={isUploading} onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isUploading} form="edit-client-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition disabled:bg-slate-400 flex items-center">
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Saving...</> : 'Save Profile Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientManager({ clients = [], shifts = [], employees = [], clientExpenses = [], expenses = [], onAddClient, onRemoveClient, updateClient, onClientFileUpload }) {
  const [formData, setFormData] = useState({
    name: '', dateOfBirth: '', phone: '', address: '', notes: '', dietary: '', mobility: '', hobbies: '',
    accountHolderName: '', accountHolderAddress: '', accountHolderPhone: '', accountHolderEmail: '',
    emergencyContactName: '', emergencyContactPhone: '', secondaryEmergencyName: '', secondaryEmergencyPhone: '',
    monthlyAllowance: '100',
    purchasedShifts: '0' // --- NEW: PURCHASED SHIFTS STATE ---
  });
  
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [clientStatusView, setClientStatusView] = useState('active'); 

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeShifts = Array.isArray(shifts) ? shifts : []; // Make sure shifts is accessible

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const newClient = {
      ...formData,
      id: `client_${Date.now()}`,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : '', 
      monthlyAllowance: Number(formData.monthlyAllowance) || 0,
      purchasedShifts: Number(formData.purchasedShifts) || 0, // --- NEW: PARSE PURCHASED SHIFTS ---
      isActive: true 
    };
    if (onAddClient) onAddClient(newClient);

    setFormData({
      name: '', dateOfBirth: '', phone: '', address: '', notes: '', dietary: '', mobility: '', hobbies: '',
      accountHolderName: '', accountHolderAddress: '', accountHolderPhone: '', accountHolderEmail: '',
      emergencyContactName: '', emergencyContactPhone: '', secondaryEmergencyName: '', secondaryEmergencyPhone: '',
      monthlyAllowance: '100',
      purchasedShifts: '0'
    });
    setNewPhotoFile(null);
  };

  const filteredClients = safeClients.filter(client => {
    const isMatch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isStatusMatch = clientStatusView === 'active' 
      ? client.isActive !== false 
      : client.isActive === false;
      
    return isMatch && isStatusMatch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Client List */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Client Directory</h2>
            <span className="ml-3 bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredClients.length} Profiles</span>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>

        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide bg-slate-50/50">
          <button 
            onClick={() => setClientStatusView('active')} 
            className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors whitespace-nowrap ${clientStatusView === 'active' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Active Clients
          </button>
          <button 
            onClick={() => setClientStatusView('deactivated')} 
            className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors whitespace-nowrap ${clientStatusView === 'deactivated' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Deactivated Profiles
          </button>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-5 flex-1 overflow-y-auto bg-slate-50/50">
          {filteredClients.map(client => {
            // --- NEW: DYNAMIC SHIFT BALANCE CALCULATION FOR CARD ---
            const clientShiftsCount = safeShifts.filter(s => s.clientId === client.id).length;
            const remainingShifts = (Number(client.purchasedShifts) || 0) - clientShiftsCount;

            return (
              <div key={client.id} className={`border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition duration-200 bg-white relative group ${client.isActive === false ? 'opacity-80' : 'hover:shadow-md'}`}>
                
                <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-1 z-10">
                  <button onClick={() => setEditingClient(client)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit Profile & Documents">
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  {client.isActive !== false ? (
                    <button 
                      onClick={() => {
                        if(window.confirm(`Deactivate ${client.name}? They will be hidden from the active schedule and assignments, but their history will be saved.`)) {
                          updateClient(client.id, { isActive: false }, null);
                        }
                      }} 
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition" 
                      title="Deactivate Client"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if(window.confirm(`Reactivate ${client.name}? They will be placed back into the active rotation.`)) {
                          updateClient(client.id, { isActive: true }, null);
                        }
                      }} 
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition" 
                      title="Reactivate Client"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mb-4 pr-16">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center border-2 shadow-sm shrink-0 overflow-hidden ${client.isActive === false ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-teal-100 text-teal-600 border-teal-50'}`}>
                    <SafeAvatar url={client.photoUrl} name={client.name} role="" className="h-7 w-7"/>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{client.name}</h3>
                    <div className="flex space-x-2 mt-1">
                      <div className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${client.isActive === false ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                        Client
                      </div>
                      {client.isActive === false && (
                        <div className="text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Deactivated
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2.5 mb-5 text-sm text-slate-600 flex-1">
                  {client.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> {client.phone}</div>}
                  {client.address && <div className="flex items-start"><MapPin className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{client.address}</span></div>}
                  {/* --- NEW: SHIFTS REMAINING PILL --- */}
                  <div className="flex items-center mt-2 pt-2 border-t border-slate-50">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${remainingShifts <= 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {remainingShifts} Shifts Remaining
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto border-t border-slate-100 pt-4">
                  <button 
                    onClick={() => setViewingClient(client)}
                    className="w-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg transition border border-slate-200 text-sm"
                  >
                    <HeartPulse className="h-4 w-4 mr-2" /> View Care Plan Hub
                  </button>
                </div>

              </div>
            )
          })}
          {filteredClients.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500">
              {clientStatusView === 'active' ? `No active clients found matching "${searchTerm}".` : "No deactivated clients on file."}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Add Client */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Client</h2>
        </div>
        <form onSubmit={handleAddClient} className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Client Details</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Neighbour Notes & Care Plan</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">General Care Plan</label>
              <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="List general needs..." rows="2" />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Account Holder & Billing</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                <input type="text" value={formData.accountHolderName} onChange={(e) => handleChange('accountHolderName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Allowance ($) *</label>
                <input type="number" min="0" value={formData.monthlyAllowance} onChange={(e) => handleChange('monthlyAllowance', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" required />
              </div>
            </div>
            {/* --- NEW: TOTAL PURCHASED SHIFTS INPUT --- */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Purchased Shifts *</label>
                <input type="number" min="0" value={formData.purchasedShifts} onChange={(e) => handleChange('purchasedShifts', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" required />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Emergency Contacts</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Emergency Contact</label>
                <input type="text" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name (e.g. Son)" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone</label>
                <input type="text" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Contact</label>
                <input type="text" value={formData.secondaryEmergencyName} onChange={(e) => handleChange('secondaryEmergencyName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Phone</label>
                <input type="text" value={formData.secondaryEmergencyPhone} onChange={(e) => handleChange('secondaryEmergencyPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('client-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative font-medium text-teal-600">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input id="client-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setNewPhotoFile(e.target.files[0])} />
            </div>
          </div>

          <button type="submit" className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition">
            <Plus className="h-4 w-4" /><span>Add Basic Profile</span>
          </button>
        </form>
      </div>

      {editingClient && <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} onSave={async (id, data, file) => { if (updateClient) await updateClient(id, data, file); setEditingClient(null); }} onClientFileUpload={onClientFileUpload} />}
      {viewingClient && <ClientCarePlanModal client={viewingClient} shifts={shifts} employees={employees} clientExpenses={clientExpenses} expenses={expenses} onClose={() => setViewingClient(null)} />}
    </div>
  );
}
