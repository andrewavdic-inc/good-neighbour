import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, User, Phone, Mail, AlertCircle, ShieldCheck, Plus, Image as ImageIcon, CalendarDays, Info, DollarSign, CheckCircle } from 'lucide-react';

const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' }, 
  { key: 'whmis', label: 'WHMIS' }, 
  { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check (VSC)' }, 
  { key: 'prc', label: 'Police Record Check (PRC)' }, 
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
    payType: employee?.payType || 'per_visit',
    hourlyWage: employee?.hourlyWage || 22.50,
    perVisitRate: employee?.perVisitRate || 45,
    emergencyContactName: employee?.emergencyContactName || '',
    emergencyContactPhone: employee?.emergencyContactPhone || '',
    requirements: employee?.requirements || {},
    timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 },
    availability: employee?.availability || []
  });
  
  const [photoFile, setPhotoFile] = useState(null); 
  const [activeTab, setActiveTab] = useState('profile'); 
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleTimeOffChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      timeOffBalances: {
        ...prev.timeOffBalances,
        [type]: Number(value) || 0
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const updatedData = { 
      ...formData, 
      payType: formData.payType || 'per_visit', 
      hourlyWage: Number(formData.hourlyWage) || 22.50, 
      perVisitRate: Number(formData.perVisitRate) || 45 
    };
    
    if (photoFile) {
      updatedData.photoUrl = URL.createObjectURL(photoFile);
    }
    
    if (onSave && employee?.id) {
      onSave(employee.id, updatedData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0">
          <h3 className="text-lg font-bold flex items-center">
            <User className="h-5 w-5 mr-2 text-teal-200" /> Edit Employee: {String(employee.name)}
          </h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6 overflow-x-auto shrink-0">
          <button type="button" onClick={() => setActiveTab('profile')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Personal & Contact
          </button>
          <button type="button" onClick={() => setActiveTab('compliance')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Certificates & Clearances
          </button>
          <button type="button" onClick={() => setActiveTab('financial')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'financial' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Pay Structure & Time Off
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* TAB: PROFILE */}
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Basic Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                      <input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                      <input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System Role</label>
                    <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 bg-white">
                      <option value="Neighbour">Neighbour</option>
                      <option value="Block Captain">Block Captain</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Contact Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                    <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-red-800 border-b border-red-200 pb-2 flex items-center"><AlertCircle className="h-4 w-4 mr-1.5"/> Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                      <input type="text" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                      <input type="text" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB: COMPLIANCE */}
            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium flex items-start">
                  <Info className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                  Track mandatory Ontario health and safety requirements. If a requirement is not applicable to this role, mark it as N/A.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '', fileUrl: null };
                  return (
                    <div key={req.key} className={`bg-white border rounded-lg shadow-sm transition ${currentData.status === 'valid' ? 'border-emerald-200' : currentData.status === 'expired' ? 'border-red-300' : 'border-slate-200'}`}>
                      <div className="p-3 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-2 bg-slate-50/50 rounded-t-lg">
                        <label className="text-sm font-semibold text-slate-800">{req.label}</label>
                        <select 
                          value={currentData.status} 
                          onChange={(e) => handleReqChange(req.key, 'status', e.target.value)} 
                          className={`text-xs font-bold rounded border px-2 py-1 outline-none ${
                            currentData.status === 'missing' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            currentData.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            currentData.status === 'expired' ? 'bg-red-50 text-red-700 border-red-200' : 
                            'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <option value="missing">Missing</option>
                          <option value="valid">Valid</option>
                          <option value="expired">Expired</option>
                          <option value="not_applicable">N/A</option>
                        </select>
                      </div>
                      <div className="p-3 bg-white rounded-b-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Expiry Date:</span>
                          <input 
                            type="date" 
                            value={currentData.expiryDate || ''} 
                            onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)} 
                            disabled={currentData.status === 'not_applicable'} 
                            className="w-32 px-2 py-1 border border-slate-300 rounded text-xs text-slate-700 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TAB: FINANCIAL */}
            <div className={activeTab === 'financial' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1.5 text-slate-500"/> Pay Structure
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">Active Calculation Method</label>
                      <select 
                        value={formData.payType} 
                        onChange={(e) => handleChange('payType', e.target.value)} 
                        className="w-full px-3 py-2 border border-teal-300 rounded-md text-sm bg-teal-50 font-medium text-teal-800 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="per_visit">Pay Per Visit (Flat Rate)</option>
                        <option value="hourly">Hourly Wage</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">This determines how the Live Pay Tracker calculates their earnings.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Per Visit Rate ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                          <input 
                            type="number" min="0" step="0.50" 
                            value={formData.perVisitRate} 
                            onChange={(e) => handleChange('perVisitRate', e.target.value)} 
                            className={`w-full pl-6 pr-3 py-2 border rounded-md text-sm focus:ring-teal-500 ${formData.payType === 'per_visit' ? 'border-teal-400 bg-white' : 'border-slate-300 bg-slate-100 text-slate-500'}`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Hourly Wage ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                          <input 
                            type="number" min="0" step="0.50" 
                            value={formData.hourlyWage} 
                            onChange={(e) => handleChange('hourlyWage', e.target.value)} 
                            className={`w-full pl-6 pr-3 py-2 border rounded-md text-sm focus:ring-teal-500 ${formData.payType === 'hourly' ? 'border-teal-400 bg-white' : 'border-slate-300 bg-slate-100 text-slate-500'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Time Off Balances
                  </h4>
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Sick Days</div>
                        <div className="text-xs text-slate-500">Total days allotted per year</div>
                      </div>
                      <input 
                        type="number" min="0" step="1" 
                        value={formData.timeOffBalances.sick} 
                        onChange={(e) => handleTimeOffChange('sick', e.target.value)} 
                        className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center font-bold text-slate-700 focus:ring-teal-500" 
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Vacation Days</div>
                        <div className="text-xs text-slate-500">Total days allotted per year</div>
                      </div>
                      <input 
                        type="number" min="0" step="1" 
                        value={formData.timeOffBalances.vacation} 
                        onChange={(e) => handleTimeOffChange('vacation', e.target.value)} 
                        className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center font-bold text-slate-700 focus:ring-teal-500" 
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-sm">
            Cancel
          </button>
          <button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition shadow-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" /> Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeManager({ employees = [], onAddEmployee, onRemoveEmployee, updateEmployee, currentUser }) {
  const [newName, setNewName] = useState(''); 
  const [newUsername, setNewUsername] = useState(''); 
  const [newPassword, setNewPassword] = useState(''); 
  const [newRole, setNewRole] = useState('Neighbour'); 
  const [newPayType, setNewPayType] = useState('per_visit'); 
  const [newHourlyWage, setNewHourlyWage] = useState('22.50'); 
  const [newPerVisitRate, setNewPerVisitRate] = useState('45'); 
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);

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
      payType: newPayType, 
      hourlyWage: Number(newHourlyWage) || 22.50, 
      perVisitRate: Number(newPerVisitRate) || 45, 
      requirements: {}, 
      timeOffBalances: { sick: 5, vacation: 10 }, 
      availability: [] 
    }; 
    
    if (newPhotoFile) {
      newEmp.photoUrl = URL.createObjectURL(newPhotoFile);
    }

    if (onAddEmployee) onAddEmployee(newEmp); 
    
    setNewName(''); 
    setNewUsername(''); 
    setNewPassword(''); 
    setNewPhotoFile(null);
  };

  const getComplianceIssues = (emp) => { 
    let issues = 0; 
    ONTARIO_REQUIREMENTS.forEach(req => { 
      const status = emp?.requirements?.[req.key]?.status || 'missing'; 
      if (status === 'missing' || status === 'expired') issues++; 
    }); 
    return issues; 
  };

  const filteredEmployees = safeEmployees.filter(emp => {
    if (!searchQuery.trim()) return true;
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (emp.role && emp.role.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Directory Column */}
      <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2>
            <span className="ml-3 bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredEmployees.length} Members
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <Users className="h-12 w-12 text-slate-300 mb-3" />
              <p>No staff members found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEmployees.map(emp => {
                const issuesCount = getComplianceIssues(emp); 
                const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
                
                return (
                  <div key={emp.id} className="border border-slate-200 rounded-xl p-5 flex flex-col bg-white hover:border-teal-300 hover:shadow-md transition duration-200 relative group">
                    
                    {!isProtected && (
                      <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-1">
                        <button onClick={() => setEditingEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit Profile">
                          <Edit className="h-4 w-4" />
                        </button>
                        {emp.id !== 'admin1' && (
                          <button onClick={() => onRemoveEmployee && onRemoveEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete Profile">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-4 pr-16">
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="h-14 w-14 rounded-full border-2 border-teal-100 object-cover shadow-sm shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-2 border-teal-50 shadow-sm shrink-0">
                          <User className="h-7 w-7" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{String(emp.name)}</h3>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded inline-block mt-1 tracking-wide uppercase">
                          {String(emp.role)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-4 text-sm text-slate-600 flex-1">
                      {emp.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> {emp.phone}</div>}
                      {emp.email && <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate" title={emp.email}>{emp.email}</span></div>}
                    </div>

                    <div className="mt-auto border-t border-slate-100 pt-4">
                      {issuesCount > 0 ? (
                        <div className="flex items-center justify-center text-xs font-bold bg-red-50 text-red-700 py-2 px-3 rounded-lg border border-red-100">
                          <AlertCircle className="h-4 w-4 mr-2 shrink-0" /> {issuesCount} Compliance Issue(s)
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-xs font-bold bg-emerald-50 text-emerald-700 py-2 px-3 rounded-lg border border-emerald-100">
                          <ShieldCheck className="h-4 w-4 mr-2 shrink-0" /> Fully Compliant
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Column */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Employee</h2>
        </div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g. Jane Doe" required />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 bg-white">
              <option value="Neighbour">Neighbour</option>
              <option value="Block Captain">Block Captain</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
            <label className="block text-sm font-semibold text-slate-800 mb-2">Initial Pay Structure</label>
            <select value={newPayType} onChange={(e) => setNewPayType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 bg-white mb-3">
              <option value="per_visit">Pay Per Visit (Flat Rate)</option>
              <option value="hourly">Hourly Wage</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Per Visit ($)</label>
                <input type="number" min="0" step="1" value={newPerVisitRate} onChange={(e) => setNewPerVisitRate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hourly ($)</label>
                <input type="number" min="0" step="0.50" value={newHourlyWage} onChange={(e) => setNewHourlyWage(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" required />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
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

      {/* Edit Modal Container */}
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
