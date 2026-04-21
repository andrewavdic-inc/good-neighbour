import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, User, Phone, Mail, AlertCircle, ShieldCheck, Plus, Image as ImageIcon, CalendarDays, Info } from 'lucide-react';

const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' }, 
  { key: 'whmis', label: 'WHMIS' }, 
  { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check' }, 
  { key: 'prc', label: 'Police Record Check' }, 
  { key: 'immunization', label: 'Immunization Records' },
  { key: 'skills', label: 'Skills Verification' }, 
  { key: 'driverLicense', label: "Driver's License" }, 
  { key: 'autoInsurance', label: 'Auto Insurance' },
  { key: 'references', label: 'Professional References' }
];

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    username: employee?.username || '',
    password: employee?.password || '',
    role: employee?.role || 'Neighbour',
    phone: employee?.phone || '',
    email: employee?.email || '',
    address: employee?.address || '',
    emergencyContactName: employee?.emergencyContactName || '',
    emergencyContactPhone: employee?.emergencyContactPhone || '',
    requirements: employee?.requirements || {},
    timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 }
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); 

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleTimeOffChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      timeOffBalances: {
        ...prev.timeOffBalances,
        [type]: Number(value)
      }
    }));
  };

  const handleReqChange = (reqKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [reqKey]: {
          ...(prev.requirements[reqKey] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const updatedData = { ...formData };
    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }
    if (onSave && employee?.id) {
      onSave(employee.id, updatedData);
    }
  };

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white">
          <h3 className="text-lg font-bold flex items-center">
            <User className="h-5 w-5 mr-2 text-teal-200" />
            Edit Employee: {employee.name}
          </h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Personal & Contact Profile
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Certificates & Clearances (Ontario)
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                      <input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                      <input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                      <option value="Neighbour">Neighbour</option>
                      <option value="Block Captain">Block Captain</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
                    <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('edit-emp-photo-upload').click()}>
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                        <div className="flex text-xs text-slate-600 justify-center">
                          <span className="relative font-medium text-teal-600">{photoFile ? photoFile.name : <span>Upload a new photo</span>}</span>
                        </div>
                      </div>
                      <input id="edit-emp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                    <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Time Off Allocation (Annual)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Sick Days / Yr</label>
                    <input type="number" min="0" value={formData.timeOffBalances.sick} onChange={(e) => handleTimeOffChange('sick', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Vacation Days / Yr</label>
                    <input type="number" min="0" value={formData.timeOffBalances.vacation} onChange={(e) => handleTimeOffChange('vacation', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><Phone className="h-4 w-4 mr-1.5 text-slate-500"/> Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name / Relation</label>
                    <input type="text" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. John Doe (Husband)" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                    <input type="text" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm p-4 rounded-xl mb-6 flex items-start">
                <Info className="h-5 w-5 mr-2 shrink-0 mt-0.5 text-blue-600"/>
                <p>Track mandatory employer requirements for Ontario. Set status to "Missing" or "Expired" to flag this employee on the main dashboard.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '' };
                  return (
                    <div key={req.key} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{req.label}</label>
                        <select 
                          value={currentData.status} 
                          onChange={(e) => handleReqChange(req.key, 'status', e.target.value)}
                          className={`mt-1 xl:mt-0 text-xs font-medium rounded border-slate-300 focus:ring-teal-500 px-2 py-1 ${
                            currentData.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            currentData.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="missing">Missing / Required</option>
                          <option value="pending">Pending Verification</option>
                          <option value="valid">Valid / Verified</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 w-16">Expiry:</span>
                        <input 
                          type="date" 
                          value={currentData.expiryDate || ''} 
                          onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition">
            Save Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeManager({ employees = [], setEmployees, updateEmployee, onAddEmployee, onRemoveEmployee, currentUser }) {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Neighbour');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // DEFENSIVE SAFETY NET: Ensure employees is always an array
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    
    const newEmp = {
      id: `emp_${Date.now()}`,
      name: newName,
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
      phone: newPhone,
      email: newEmail,
      photoUrl: newPhotoFile ? URL.createObjectURL(newPhotoFile) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}&backgroundColor=0f766e`,
      requirements: {},
      timeOffBalances: { sick: 5, vacation: 10 }
    };
    if (onAddEmployee) onAddEmployee(newEmp);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewPhone('');
    setNewEmail('');
    setNewPhotoFile(null);
  };

  const getComplianceIssues = (emp) => {
    let issues = 0;
    ONTARIO_REQUIREMENTS.forEach(req => {
      const status = emp?.requirements?.[req.key]?.status;
      if (!status || status === 'missing' || status === 'expired') {
        issues++;
      }
    });
    return issues;
  };

  const filteredEmployees = safeEmployees.filter(emp => {
    if (!emp) return false;
    const nameMatch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || roleMatch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2>
          </div>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 bg-slate-50/50 flex-1 overflow-y-auto">
          {filteredEmployees.map(emp => {
            const issuesCount = getComplianceIssues(emp);
            const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
            
            return (
              <div key={emp.id || Math.random()} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative">
                {!isProtected && (
                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button 
                      onClick={() => setEditingEmployee(emp)}
                      className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Edit Profile & Compliance"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {emp.id !== 'admin1' && (
                      <button 
                        onClick={() => onRemoveEmployee && onRemoveEmployee(emp.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Remove Employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3 mb-3 pr-16">
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name || 'Staff'} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{emp.name || 'Unnamed Employee'}</h3>
                    <div className="flex flex-col mt-0.5">
                      <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block w-fit">{emp.role || 'Staff'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2">
                  <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100 space-y-1">
                    {emp.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1.5" />{emp.phone}</div>}
                    {emp.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1.5" />{emp.email}</div>}
                    {!emp.phone && !emp.email && <span className="italic text-slate-400">No contact info provided</span>}
                  </div>
                  
                  {issuesCount > 0 ? (
                    <div className="flex items-center justify-center text-xs font-semibold bg-red-50 text-red-700 p-2 rounded border border-red-100">
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      {issuesCount} Requirement{issuesCount !== 1 ? 's' : ''} Missing/Expired
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-xs font-semibold bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Fully Compliant
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500">No employees found matching "{searchTerm}".</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add Employee</h2>
        </div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="e.g. janedoe"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Secure password"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="Neighbour">Neighbour</option>
              <option value="Block Captain">Block Captain</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input 
                type="text" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="555-0000"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('emp-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input 
                id="emp-photo-upload" 
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
            <span>Add Employee Profile</span>
          </button>
        </form>
      </div>

      {editingEmployee && (
        <EditEmployeeModal 
          employee={editingEmployee} 
          onClose={() => setEditingEmployee(null)} 
          onSave={(id, data) => {
            if (updateEmployee) updateEmployee(id, data);
            setEditingEmployee(null);
          }} 
        />
      )}
    </div>
  );
}