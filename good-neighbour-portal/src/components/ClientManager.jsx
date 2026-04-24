import React, { useState } from 'react';
import { Heart, Search, Edit, Trash2, User, Phone, Wallet, Image as ImageIcon, Plus, MapPin, CalendarDays, Info, ShieldAlert, AlertCircle, Star, Sun, Moon, TreePine, Sailboat, Cloud, Zap } from 'lucide-react';

// --- CUSTOM CAPTAIN HAT ICON ---
const CaptainHatIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10c-1-4 1-6 6-6s7 2 6 6" />
    <path d="M2 14c0-2.5 2-4 5-4h10c3 0 5 1.5 5 4 0 2-4 3-10 3S2 16.5 2 14z" />
    <circle cx="12" cy="10" r="1.5" />
  </svg>
);

// --- SAFE AVATAR COMPONENT ---
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

  if (!cleanUrl || imgError || cleanUrl.includes('dicebear.com')) {
    return renderIcon();
  }

  return (
    <img 
      src={cleanUrl} 
      alt={name || 'Avatar'} 
      className={`h-full w-full object-cover bg-white ${className}`} 
      onError={() => setImgError(true)} 
    />
  );
};

function EditClientModal({ client, onClose, onSave }) {
  const [name, setName] = useState(client.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(client.dateOfBirth || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [address, setAddress] = useState(client.address || '');
  const [notes, setNotes] = useState(client.notes || '');
  const [emergencyName, setEmergencyName] = useState(client.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(client.emergencyContactPhone || '');
  const [secondaryEmergencyName, setSecondaryEmergencyName] = useState(client.secondaryEmergencyName || '');
  const [secondaryEmergencyPhone, setSecondaryEmergencyPhone] = useState(client.secondaryEmergencyPhone || '');
  
  const [accountHolderName, setAccountHolderName] = useState(client.accountHolderName || '');
  const [accountHolderAddress, setAccountHolderAddress] = useState(client.accountHolderAddress || '');
  const [accountHolderPhone, setAccountHolderPhone] = useState(client.accountHolderPhone || '');
  const [accountHolderEmail, setAccountHolderEmail] = useState(client.accountHolderEmail || '');

  const [monthlyAllowance, setMonthlyAllowance] = useState(client.monthlyAllowance?.toString() || '0');
  const [photoFile, setPhotoFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const updatedData = {
      name,
      dateOfBirth,
      phone,
      address,
      notes,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      secondaryEmergencyName,
      secondaryEmergencyPhone,
      accountHolderName,
      accountHolderAddress,
      accountHolderPhone,
      accountHolderEmail,
      monthlyAllowance: Number(monthlyAllowance) || 0
    };

    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }

    if (onSave) {
      onSave(client.id, updatedData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Edit Client Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-2xl leading-none">&times;</button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Client Details</h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Home Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Care Plan / Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" rows="3" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Account Holder & Billing</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Full Name</label>
                  <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. Family Member Name" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label>
                  <input type="number" min="0" value={monthlyAllowance} onChange={(e) => setMonthlyAllowance(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Phone</label>
                  <input type="text" value={accountHolderPhone} onChange={(e) => setAccountHolderPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Email</label>
                  <input type="email" value={accountHolderEmail} onChange={(e) => setAccountHolderEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <input type="text" value={accountHolderAddress} onChange={(e) => setAccountHolderAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Emergency Contacts</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Emergency Contact</label>
                  <input type="text" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name (e.g. Son)" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone</label>
                  <input type="text" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Emergency Contact</label>
                  <input type="text" value={secondaryEmergencyName} onChange={(e) => setSecondaryEmergencyName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Name (e.g. Daughter)" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Phone</label>
                  <input type="text" value={secondaryEmergencyPhone} onChange={(e) => setSecondaryEmergencyPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
              <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('edit-client-photo-upload').click()}>
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                      {photoFile ? photoFile.name : <span>Upload a new photo</span>}
                    </span>
                  </div>
                </div>
                <input 
                  id="edit-client-photo-upload" 
                  type="file" 
                  accept="image/*" 
                  className="sr-only" 
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-client-form"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientManager({ clients = [], onAddClient, onRemoveClient, updateClient }) {
  const [newName, setNewName] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  const [newAccountHolderName, setNewAccountHolderName] = useState('');
  const [newAccountHolderAddress, setNewAccountHolderAddress] = useState('');
  const [newAccountHolderPhone, setNewAccountHolderPhone] = useState('');
  const [newAccountHolderEmail, setNewAccountHolderEmail] = useState('');

  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newSecondaryEmergencyName, setNewSecondaryEmergencyName] = useState('');
  const [newSecondaryEmergencyPhone, setNewSecondaryEmergencyPhone] = useState('');
  
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newMonthlyAllowance, setNewMonthlyAllowance] = useState('100');
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const safeClients = Array.isArray(clients) ? clients : [];

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const newClient = {
      id: `client_${Date.now()}`,
      name: newName,
      dateOfBirth: newDateOfBirth,
      phone: newPhone,
      address: newAddress,
      notes: newNotes,
      accountHolderName: newAccountHolderName,
      accountHolderAddress: newAccountHolderAddress,
      accountHolderPhone: newAccountHolderPhone,
      accountHolderEmail: newAccountHolderEmail,
      emergencyContactName: newEmergencyName,
      emergencyContactPhone: newEmergencyPhone,
      secondaryEmergencyName: newSecondaryEmergencyName,
      secondaryEmergencyPhone: newSecondaryEmergencyPhone,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : '', // Removed dicebear link
      monthlyAllowance: Number(newMonthlyAllowance) || 0
    };
    
    if (onAddClient) onAddClient(newClient);

    setNewName(''); setNewDateOfBirth(''); setNewPhone(''); setNewAddress(''); setNewNotes('');
    setNewAccountHolderName(''); setNewAccountHolderAddress(''); setNewAccountHolderPhone(''); setNewAccountHolderEmail('');
    setNewEmergencyName(''); setNewEmergencyPhone(''); setNewSecondaryEmergencyName(''); setNewSecondaryEmergencyPhone('');
    setNewPhotoFile(null); setNewMonthlyAllowance('100');
  };

  const filteredClients = safeClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Current Clients</h2>
            <span className="ml-3 bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredClients.length} Profiles</span>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or care notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-5 flex-1 overflow-y-auto bg-slate-50/50">
          {filteredClients.map(client => (
            <div key={client.id || Math.random()} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition duration-200 bg-white relative group">
              <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-1">
                <button 
                  onClick={() => setEditingClient(client)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                  title="Edit Client"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => onRemoveClient && onRemoveClient(client.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                  title="Remove Client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4 mb-4 pr-16">
                <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-2 border-teal-50 shadow-sm shrink-0 overflow-hidden">
                  <SafeAvatar url={client.photoUrl} name={client.name} role="" className="h-7 w-7"/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{client.name}</h3>
                  <div className="flex items-center mt-0.5 space-x-2">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded inline-block mt-1 tracking-wide uppercase">Client</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2.5 mb-4 text-sm text-slate-600 flex-1">
                {client.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> {client.phone}</div>}
                {client.address && <div className="flex items-start"><MapPin className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{client.address}</span></div>}
                {client.notes && <div className="flex items-start"><Info className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2 italic">{client.notes}</span></div>}
                {!client.phone && !client.address && !client.notes && <span className="italic text-slate-400">No extra details provided</span>}
              </div>
              
              <div className="mt-auto border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium flex items-center"><Wallet className="h-3.5 w-3.5 mr-1.5" /> Monthly Allowance</div>
                  <div className="text-xs font-bold text-teal-700">${Number(client.monthlyAllowance || 0).toFixed(2)}/mo</div>
                </div>
                {client.emergencyContactName ? (
                  <div className="flex items-center justify-between text-xs font-bold bg-red-50 text-red-700 p-2 rounded-lg border border-red-100">
                    <div className="flex items-center truncate pr-2"><ShieldAlert className="h-3.5 w-3.5 mr-1.5 shrink-0" /> <span className="truncate">{client.emergencyContactName}</span></div>
                    <div className="shrink-0">{client.emergencyContactPhone}</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-xs font-bold bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100">
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> No Emergency Contact
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500">No clients found matching "{searchTerm}".</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Client</h2>
        </div>
        <form onSubmit={handleAddClient} className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Client Details</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Eleanor Vance"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input 
                  type="date" 
                  value={newDateOfBirth} 
                  onChange={(e) => setNewDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
              <input 
                type="text" 
                value={newAddress} 
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Care Plan / Notes</label>
              <textarea 
                value={newNotes} 
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="List mobility needs, allergies, routines..."
                rows="3"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Account Holder & Billing</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                <input 
                  type="text" 
                  value={newAccountHolderName} 
                  onChange={(e) => setNewAccountHolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Allowance ($) *</label>
                <input 
                  type="number" 
                  min="0"
                  value={newMonthlyAllowance} 
                  onChange={(e) => setNewMonthlyAllowance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Phone</label>
                <input 
                  type="text" 
                  value={newAccountHolderPhone} 
                  onChange={(e) => setNewAccountHolderPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Email</label>
                <input 
                  type="email" 
                  value={newAccountHolderEmail} 
                  onChange={(e) => setNewAccountHolderEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
              <input 
                type="text" 
                value={newAccountHolderAddress} 
                onChange={(e) => setNewAccountHolderAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Emergency Contacts</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Contact</label>
                <input 
                  type="text" 
                  value={newEmergencyName} 
                  onChange={(e) => setNewEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="Name (e.g. Son)"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone</label>
                <input 
                  type="text" 
                  value={newEmergencyPhone} 
                  onChange={(e) => setNewEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="555-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Contact</label>
                <input 
                  type="text" 
                  value={newSecondaryEmergencyName} 
                  onChange={(e) => setNewSecondaryEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="Name (e.g. Daughter)"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Phone</label>
                <input 
                  type="text" 
                  value={newSecondaryEmergencyPhone} 
                  onChange={(e) => setNewSecondaryEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="555-0000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer" onClick={() => document.getElementById('client-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input 
                id="client-photo-upload" 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                onChange={(e) => setNewPhotoFile(e.target.files[0])}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client Profile</span>
          </button>
        </form>
      </div>

      {editingClient && (
        <EditClientModal 
          client={editingClient} 
          onClose={() => setEditingClient(null)} 
          onSave={(id, data) => {
            if (updateClient) {
              updateClient(id, data);
            }
            setEditingClient(null);
          }} 
        />
      )}
    </div>
  );
}
