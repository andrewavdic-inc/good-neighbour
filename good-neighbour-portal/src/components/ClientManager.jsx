import React, { useState } from 'react';
import { Heart, Search, Edit, Trash2, User, Phone, Wallet, Image as ImageIcon, Plus } from 'lucide-react';

function EditClientModal({ client, onClose, onSave }) {
  const [name, setName] = useState(client.name);
  const [notes, setNotes] = useState(client.notes || '');
  const [emergencyName, setEmergencyName] = useState(client.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(client.emergencyContactPhone || '');
  const [monthlyAllowance, setMonthlyAllowance] = useState(client.monthlyAllowance.toString());
  const [photoFile, setPhotoFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const updatedData = {
      name,
      notes,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      monthlyAllowance: Number(monthlyAllowance) || 0
    };

    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }

    onSave(client.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Edit Client Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-2xl leading-none">&times;</button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label>
              <input 
                type="number" 
                min="0"
                value={monthlyAllowance} 
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                required
              />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
                <input 
                  type="text" 
                  value={emergencyName} 
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                <input 
                  type="text" 
                  value={emergencyPhone} 
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Care Plan / Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                rows="4"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
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

export default function ClientManager({ clients, onAddClient, onRemoveClient, updateClient }) {
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newMonthlyAllowance, setNewMonthlyAllowance] = useState('100');
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const newClient = {
      id: `client_${Date.now()}`,
      name: newName,
      notes: newNotes,
      emergencyContactName: newEmergencyName,
      emergencyContactPhone: newEmergencyPhone,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}&backgroundColor=0d9488`,
      monthlyAllowance: Number(newMonthlyAllowance) || 0
    };
    onAddClient(newClient);
    setNewName('');
    setNewNotes('');
    setNewEmergencyName('');
    setNewEmergencyPhone('');
    setNewPhotoFile(null);
    setNewMonthlyAllowance('100');
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Current Clients</h2>
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
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 flex-1 overflow-y-auto">
          {filteredClients.map(client => (
            <div key={client.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative">
              <div className="absolute top-3 right-3 flex space-x-1">
                <button 
                  onClick={() => setEditingClient(client)}
                  className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                  title="Edit Client"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => onRemoveClient(client.id)}
                  className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                  title="Remove Client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3 mb-3 pr-16">
                {client.photoUrl ? (
                  <img src={client.photoUrl} alt={client.name} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{client.name}</h3>
                  <div className="flex items-center mt-0.5 space-x-2">
                    <span className="text-xs text-slate-500 line-clamp-1">{client.notes || 'No notes'}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100">
                  <div className="font-semibold text-slate-700 mb-1 flex items-center">
                    <Phone className="h-3 w-3 mr-1" /> Emergency Contact
                  </div>
                  {client.emergencyContactName ? (
                    <div>
                      {client.emergencyContactName}
                      <br/>
                      <span className="text-teal-700 font-medium">{client.emergencyContactPhone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Not provided</span>
                  )}
                </div>
                <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100">
                  <div className="font-semibold text-slate-700 mb-1 flex items-center">
                    <Wallet className="h-3 w-3 mr-1" /> Monthly Allowance
                  </div>
                  <div className="text-teal-700 font-bold text-sm">
                    ${client.monthlyAllowance}/mo
                  </div>
                </div>
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
        <form onSubmit={handleAddClient} className="p-6 space-y-4">
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
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Expense Allowance ($) *</label>
            <input 
              type="number" 
              min="0"
              value={newMonthlyAllowance} 
              onChange={(e) => setNewMonthlyAllowance(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="e.g. 100"
              required
            />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input 
                type="text" 
                value={newEmergencyName} 
                onChange={(e) => setNewEmergencyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Name (e.g. Son)"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
              <input 
                type="text" 
                value={newEmergencyPhone} 
                onChange={(e) => setNewEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="555-0000"
              />
            </div>
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
            updateClient(id, data);
            setEditingClient(null);
          }} 
        />
      )}
    </div>
  );
}