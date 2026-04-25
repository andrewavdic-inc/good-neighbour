import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, User, Phone, Mail, AlertCircle, ShieldCheck, Plus, Image as ImageIcon, CheckCircle, Star, Sun, Moon, TreePine, Sailboat, Cloud, Zap } from 'lucide-react';

const CaptainHatIcon = ({ className }) => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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

const ONTARIO_REQUIREMENTS = [
  { key: 'cpr', label: 'CPR / First Aid' }, { key: 'whmis', label: 'WHMIS' }, { key: 'maskFit', label: 'Mask Fitting' },
  { key: 'vsc', label: 'Vulnerable Sector Check (VSC)' }, { key: 'prc', label: 'Police Record Check (PRC)' }, 
  { key: 'immunization', label: 'Immunization Records' }, { key: 'skills', label: 'Skills Verification' }, 
  { key: 'driverLicense', label: "Driver's License" }, { key: 'autoInsurance', label: 'Auto Insurance' },
  { key: 'references', label: 'Professional References' }
];

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '', username: employee?.username || '', password: employee?.password || '', role: employee?.role || 'Neighbour', phone: employee?.phone || '', email: employee?.email || '', address: employee?.address || '', payType: employee?.payType || 'per_visit', hourlyWage: employee?.hourlyWage || 22.50, perVisitRate: employee?.perVisitRate || 45, emergencyContactName: employee?.emergencyContactName || '', emergencyContactPhone: employee?.emergencyContactPhone || '', requirements: employee?.requirements || {}, timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 }, availability: employee?.availability || []
  });
  
  const [photoFile, setPhotoFile] = useState(null); 
  const [activeTab, setActiveTab] = useState('profile'); 
  
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleReqChange = (reqKey, field, value) => setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [reqKey]: { ...(prev.requirements[reqKey] || {}), [field]: value } } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const updatedData = { ...formData, payType: formData.payType || 'per_visit', hourlyWage: Number(formData.hourlyWage) || 22.50, perVisitRate: Number(formData.perVisitRate) || 45 };
    if (photoFile) updatedData.photoUrl = URL.createObjectURL(photoFile);
    if (onSave && employee?.id) onSave(employee.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-teal-700 text-white shrink-0">
          <h3 className="text-lg font-bold flex items-center"><User className="h-5 w-5 mr-2 text-teal-200" /> Edit Employee: {String(employee.name)}</h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6 overflow-x-auto shrink-0">
          <button type="button" onClick={() => setActiveTab('profile')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Personal & Contact</button>
          <button type="button" onClick={() => setActiveTab('compliance')} className={`pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Certificates & Clearances</button>
        </div>
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Basic Information</h4>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="text" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" required /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">System Role</label><select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"><option value="Neighbour">Neighbour</option><option value="Block Captain">Block Captain</option><option value="Administrator">Administrator</option></select></div>
                  <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-md bg-white">
                    <div className="col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label><select value={formData.payType} onChange={(e) => handleChange('payType', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-teal-50"><option value="per_visit">Per Visit Rate</option><option value="hourly">Hourly Rate</option></select></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Per Visit ($)</label><input type="number" min="0" step="1" value={formData.perVisitRate} onChange={(e) => handleChange('perVisitRate', e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm ${formData.payType==='per_visit'?'bg-white':'bg-slate-100 text-slate-400'}`} required /></div>
                    <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Hourly ($)</label><input type="number" min="0" step="0.50" value={formData.hourlyWage} onChange={(e) => handleChange('hourlyWage', e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm ${formData.payType==='hourly'?'bg-white':'bg-slate-100 text-slate-400'}`} required /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Update Profile Photo</label>
                    <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('edit-emp-photo-upload').click()}>
                      <div className="space-y-1 text-center"><ImageIcon className="mx-auto h-5 w-5 text-slate-400" /><div className="flex text-xs text-slate-600 justify-center"><span className="relative font-medium text-teal-600">{photoFile ? photoFile.name : <span>Upload a new photo</span>}</span></div></div>
                      <input id="edit-emp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Contact Information</h4>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label><input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label><input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" /></div>
                </div>
              </div>
            </div>
            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '', fileUrl: null };
                  return (
                    <div key={req.key} className="bg-white border p-3 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-slate-800">{req.label}</label><select value={currentData.status} onChange={(e) => handleReqChange(req.key, 'status', e.target.value)} className="text-xs font-bold rounded border px-2 py-1 outline-none"><option value="missing">Missing</option><option value="valid">Valid</option><option value="expired">Expired</option><option value="not_applicable">N/A</option></select></div>
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Expiry Date:</span><input type="date" value={currentData.expiryDate || ''} onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)} disabled={currentData.status === 'not_applicable'} className="w-32 px-2 py-1 border rounded text-xs"/></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"><CheckCircle className="h-4 w-4 mr-2 inline" /> Save Profile</button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeManager({ employees = [], onAddEmployee, onRemoveEmployee, updateEmployee, currentUser }) {
  const [newName, setNewName] = useState(''); const [newUsername, setNewUsername] = useState(''); const [newPassword, setNewPassword] = useState(''); 
  const [newRole, setNewRole] = useState('Neighbour'); const [newPayType, setNewPayType] = useState('per_visit'); 
  const [newHourlyWage, setNewHourlyWage] = useState('22.50'); const [newPerVisitRate, setNewPerVisitRate] = useState('45'); 
  const [newPhone, setNewPhone] = useState(''); const [newEmail, setNewEmail] = useState('');
  const [newAvailability, setNewAvailability] = useState([]);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);

  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleAddEmployee = (e) => { 
    e.preventDefault(); 
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return; 
    
    const newEmp = { 
      id: `emp_${Date.now()}`, name: newName, username: newUsername.trim(), password: newPassword, role: newRole, 
      payType: newPayType, hourlyWage: Number(newHourlyWage) || 22.50, perVisitRate: Number(newPerVisitRate) || 45, 
      phone: newPhone, email: newEmail,
      requirements: {}, timeOffBalances: { sick: 5, vacation: 10 }, availability: newAvailability 
    }; 
    
    if (newPhotoFile) newEmp.photoUrl = URL.createObjectURL(newPhotoFile);
    if (onAddEmployee) onAddEmployee(newEmp); 
    setNewName(''); setNewUsername(''); setNewPassword(''); setNewPhone(''); setNewEmail(''); setNewAvailability([]); setNewPhotoFile(null);
  };

  const toggleNewAvailability = (dayPart) => {
    setNewAvailability(prev => prev.includes(dayPart) ? prev.filter(d => d !== dayPart) : [...prev, dayPart]);
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
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.role && emp.role.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center"><Users className="h-5 w-5 mr-2 text-teal-600" /><h2 className="text-lg font-semibold text-slate-800">Staff Directory</h2><span className="ml-3 bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredEmployees.length} Members</span></div>
          <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div><input type="text" placeholder="Search staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition" /></div>
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
                        <button onClick={() => setEditingEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit Profile"><Edit className="h-4 w-4" /></button>
                        {emp.id !== 'admin1' && (<button onClick={() => onRemoveEmployee && onRemoveEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete Profile"><Trash2 className="h-4 w-4" /></button>)}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-4 pr-16">
                      <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border-2 border-teal-50 shadow-sm shrink-0 overflow-hidden">
                        <SafeAvatar url={emp.photoUrl} name={emp.name} role={emp.role} className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{String(emp.name)}</h3>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded inline-block mt-1 tracking-wide uppercase">{String(emp.role)}</span>
                        <span className="text-xs font-semibold text-slate-500 block mt-1">{emp.payType === 'hourly' ? `$${emp.hourlyWage || 22.50}/hr` : `$${emp.perVisitRate || 45}/visit`}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-4 text-sm text-slate-600 flex-1">
                      {emp.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> {emp.phone}</div>}
                      {emp.email && <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate" title={emp.email}>{emp.email}</span></div>}
                      {(emp.availability && emp.availability.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                          {emp.availability.map(avail => (<span key={avail} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{avail}</span>))}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto border-t border-slate-100 pt-4">
                      {issuesCount > 0 ? (
                        <div className="flex items-center justify-center text-xs font-bold bg-red-50 text-red-700 py-2 px-3 rounded-lg border border-red-100"><AlertCircle className="h-4 w-4 mr-2 shrink-0" /> {issuesCount} Compliance Issue(s)</div>
                      ) : (
                        <div className="flex items-center justify-center text-xs font-bold bg-emerald-50 text-emerald-700 py-2 px-3 rounded-lg border border-emerald-100"><ShieldCheck className="h-4 w-4 mr-2 shrink-0" /> Fully Compliant</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50"><h2 className="text-lg font-semibold text-slate-800">Add New Employee</h2></div>
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500" required /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-md bg-slate-50/50">
            <div className="col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 bg-white"><option value="Neighbour">Neighbour</option><option value="Block Captain">Block Captain</option><option value="Administrator">Administrator</option></select></div>
            <div className="col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label><select value={newPayType} onChange={(e) => setNewPayType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 bg-white"><option value="per_visit">Per Visit Rate</option><option value="hourly">Hourly Rate</option></select></div>
            <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Per Visit ($)</label><input type="number" min="0" step="1" value={newPerVisitRate} onChange={(e) => setNewPerVisitRate(e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 ${newPayType==='per_visit'?'bg-white':'bg-slate-100'}`} required/></div>
            <div className="col-span-3 sm:col-span-1.5"><label className="block text-xs font-medium text-slate-700 mb-1">Hourly ($)</label><input type="number" min="0" step="0.50" value={newHourlyWage} onChange={(e) => setNewHourlyWage(e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500 ${newPayType==='hourly'?'bg-white':'bg-slate-100'}`} required/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-teal-500" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Availability</label>
            <div className="flex flex-wrap gap-2">
              {['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends', 'Overnights'].map(part => (
                <label key={part} className="flex items-center space-x-1.5 text-xs bg-white border border-slate-300 px-2 py-1 rounded cursor-pointer hover:bg-slate-50 transition">
                  <input type="checkbox" checked={newAvailability.includes(part)} onChange={() => toggleNewAvailability(part)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"/>
                  <span>{part}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('emp-photo-upload').click()}>
              <div className="space-y-1 text-center"><ImageIcon className="mx-auto h-6 w-6 text-slate-400" /><div className="flex text-sm text-teal-600 justify-center font-medium">{newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}</div></div>
              <input id="emp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setNewPhotoFile(e.target.files[0])}/>
            </div>
          </div>
          <button type="submit" className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition"><Plus className="h-4 w-4" /><span>Add Employee Profile</span></button>
        </form>
      </div>

      {editingEmployee && (<EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSave={(id, data) => { if (updateEmployee) updateEmployee(id, data); setEditingEmployee(null); }} />)}
    </div>
  );
}
