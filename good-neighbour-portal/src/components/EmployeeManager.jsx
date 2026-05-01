import React, { useState, useMemo } from 'react';
import { Users, Search, Edit, Trash2, User, Phone, Mail, AlertCircle, ShieldCheck, Plus, Image as ImageIcon, CalendarDays, Info, CheckCircle, Loader2, FileText, Upload, Archive, RefreshCcw, Lock } from 'lucide-react';
import { getPayPeriodBounds, parseLocal } from '../utils';

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

function EditEmployeeModal({ employee, onClose, onSave, onEmployeeFileUpload, isMasterAdmin }) {
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
    annualSalary: employee?.annualSalary || 45000,
    hireDate: employee?.hireDate || new Date().toISOString().split('T')[0],
    emergencyContactName: employee?.emergencyContactName || '',
    emergencyContactPhone: employee?.emergencyContactPhone || '',
    requirements: employee?.requirements || {},
    timeOffBalances: employee?.timeOffBalances || { sick: 5, vacation: 10 },
    availability: employee?.availability || []
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [certFiles, setCertFiles] = useState({});
  const [activeTab, setActiveTab] = useState('profile'); 
  const [isUploading, setIsUploading] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const toggleAvailability = (dayPart) => {
    setFormData(prev => {
      const current = prev.availability || [];
      if (current.includes(dayPart)) {
        return { ...prev, availability: current.filter(d => d !== dayPart) };
      } else {
        return { ...prev, availability: [...current, dayPart] };
      }
    });
  };

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

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (file && onEmployeeFileUpload) {
      setIsDocUploading(true);
      await onEmployeeFileUpload(employee.id, file);
      setIsDocUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsUploading(true);

    const updatedData = { 
      ...formData, 
      payType: formData.payType || 'per_visit',
      hourlyWage: Number(formData.hourlyWage) || 0,
      perVisitRate: Number(formData.perVisitRate) || 0,
      annualSalary: Number(formData.annualSalary) || 0
    };
    
    if (onSave && employee?.id) {
      await onSave(employee.id, updatedData, photoFile, certFiles);
    }
    
    setIsUploading(false);
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
          <button onClick={onClose} disabled={isUploading} className="text-teal-200 hover:text-white transition text-2xl leading-none disabled:opacity-50">&times;</button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 space-x-6 overflow-x-auto scrollbar-hide">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Personal & Contact Profile
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`whitespace-nowrap pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'compliance' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Certificates & Clearances
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('uploads')}
            className={`whitespace-nowrap pb-3 pt-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'uploads' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Secure Documents
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className={activeTab === 'profile' ? 'block space-y-6' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" disabled={isUploading} value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                      <input type="text" disabled={isUploading} value={formData.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                      <input type="text" disabled={isUploading} value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select disabled={isUploading} value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                        <option value="Neighbour">Neighbour</option>
                        <option value="Block Captain">Block Captain</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                      <input type="date" disabled={isUploading} value={formData.hireDate} onChange={(e) => handleChange('hireDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                    </div>
                  </div>

                  {/* RESTRICTED WAGE SECTION */}
                  {isMasterAdmin ? (
                    <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-md bg-white">
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label>
                        <select disabled={isUploading} value={formData.payType} onChange={(e) => handleChange('payType', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold text-teal-800 bg-teal-50">
                          <option value="per_visit">Per Visit Rate</option>
                          <option value="hourly">Hourly Rate</option>
                          <option value="salary">Annual Salary</option>
                        </select>
                      </div>
                      
                      {formData.payType === 'salary' ? (
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Annual Salary ($)</label>
                          <input type="number" min="0" step="100" disabled={isUploading} value={formData.annualSalary} onChange={(e) => handleChange('annualSalary', e.target.value)} className="w-full px-3 py-2 border border-teal-400 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
                        </div>
                      ) : (
                        <>
                          <div className="col-span-3 sm:col-span-1.5">
                            <label className="block text-xs font-medium text-slate-700 mb-1">Per Visit Rate ($)</label>
                            <input type="number" min="0" step="1" disabled={isUploading} value={formData.perVisitRate} onChange={(e) => handleChange('perVisitRate', e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${formData.payType === 'per_visit' ? 'border-teal-400 bg-white' : 'border-slate-200 bg-slate-50'}`} required />
                          </div>
                          <div className="col-span-3 sm:col-span-1.5">
                            <label className="block text-xs font-medium text-slate-700 mb-1">Hourly Wage ($)</label>
                            <input type="number" min="0" step="0.50" disabled={isUploading} value={formData.hourlyWage} onChange={(e) => handleChange('hourlyWage', e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${formData.payType === 'hourly' ? 'border-teal-400 bg-white' : 'border-slate-200 bg-slate-50'}`} required />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-200 p-4 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 text-sm italic">
                      <Lock className="h-4 w-4 mr-2"/> Pay structure is restricted to Master Admin.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
                    <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('edit-emp-photo-upload').click()}>
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                        <div className="flex text-xs text-slate-600 justify-center">
                          <span className="relative font-medium text-teal-600">{photoFile ? photoFile.name : <span>Upload a new photo</span>}</span>
                        </div>
                      </div>
                      <input disabled={isUploading} id="edit-emp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input disabled={isUploading} type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input disabled={isUploading} type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                    <input disabled={isUploading} type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Availability Tracker</h4>
                <div className="flex flex-wrap gap-3">
                  {['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends', 'Overnights'].map(part => (
                    <label key={part} className={`flex items-center space-x-2 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                      <input type="checkbox" disabled={isUploading} checked={(formData.availability || []).includes(part)} onChange={() => toggleAvailability(part)} className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4" />
                      <span>{part}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Time Off Allocation (Annual)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Sick Days / Yr</label>
                    <input disabled={isUploading} type="number" min="0" value={formData.timeOffBalances.sick} onChange={(e) => handleTimeOffChange('sick', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Allowed Vacation Days / Yr</label>
                    <input disabled={isUploading} type="number" min="0" value={formData.timeOffBalances.vacation} onChange={(e) => handleTimeOffChange('vacation', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center"><Phone className="h-4 w-4 mr-1.5 text-slate-500"/> Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name / Relation</label>
                    <input disabled={isUploading} type="text" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. John Doe (Husband)" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                    <input disabled={isUploading} type="text" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm p-4 rounded-xl mb-6 flex items-start">
                <Info className="h-5 w-5 mr-2 shrink-0 mt-0.5 text-blue-600"/>
                <p>Track mandatory employer requirements. Use "Not Applicable" for requirements that do not apply to this specific role to prevent them from flagging as missing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ONTARIO_REQUIREMENTS.map(req => {
                  const currentData = formData.requirements[req.key] || { status: 'missing', expiryDate: '', fileUrl: null };
                  
                  return (
                    <div key={req.key} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{req.label}</label>
                        <select 
                          value={currentData.status} 
                          onChange={(e) => handleReqChange(req.key, 'status', e.target.value)}
                          disabled={isUploading}
                          className={`mt-1 xl:mt-0 text-xs font-medium rounded border-slate-300 focus:ring-teal-500 px-2 py-1 ${
                            currentData.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            currentData.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            currentData.status === 'not_applicable' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="missing">Missing / Required</option>
                          <option value="pending">Pending Verification</option>
                          <option value="valid">Valid / Verified</option>
                          <option value="expired">Expired</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col space-y-2 mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Expiry:</span>
                          <input 
                            type="date" 
                            value={currentData.expiryDate || ''} 
                            onChange={(e) => handleReqChange(req.key, 'expiryDate', e.target.value)}
                            disabled={currentData.status === 'not_applicable' || isUploading}
                            className="w-32 px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>
                        
                        {currentData.status !== 'not_applicable' && (
                          <div className="flex items-center justify-between">
                            {currentData.fileUrl || certFiles[req.key] ? (
                              <div className="flex items-center justify-between w-full bg-teal-50 px-2 py-1.5 rounded border border-teal-100">
                                <span className="text-xs text-teal-700 font-medium flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1"/> Uploaded
                                </span>
                                <div className="flex items-center space-x-1">
                                  {currentData.fileUrl && !certFiles[req.key] && (
                                    <a href={currentData.fileUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-0.5" title="View Document">
                                      <Info className="h-3 w-3" />
                                    </a>
                                  )}
                                  <button 
                                    type="button" 
                                    disabled={isUploading} 
                                    onClick={() => {
                                      handleReqChange(req.key, 'fileUrl', null);
                                      setCertFiles(prev => { const newFiles = {...prev}; delete newFiles[req.key]; return newFiles; });
                                    }} 
                                    className="text-red-500 hover:text-red-700 disabled:opacity-50 p-0.5 rounded transition"
                                  >
                                    <Trash2 className="h-3 w-3"/>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                disabled={isUploading}
                                onClick={() => document.getElementById(`req-upload-${req.key}`).click()} 
                                className="text-xs bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-600 font-medium py-1.5 px-2 rounded border border-slate-300 flex items-center w-full justify-center transition"
                              >
                                <ImageIcon className="h-3 w-3 mr-1.5 text-slate-400"/> Attach Certificate File
                              </button>
                            )}
                            <input 
                              id={`req-upload-${req.key}`} 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="sr-only" 
                              disabled={isUploading}
                              onChange={(e) => { 
                                if(e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setCertFiles(prev => ({ ...prev, [req.key]: file }));
                                  handleReqChange(req.key, 'fileUrl', URL.createObjectURL(file)); 
                                  if (currentData.status === 'missing') handleReqChange(req.key, 'status', 'pending');
                                }
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={activeTab === 'uploads' ? 'block' : 'hidden'}>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-teal-600"/> 
                  Secure File Uploads
                </h4>
                
                <div className="mb-6">
                  <div className="flex items-center justify-center w-full">
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isDocUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isDocUploading ? <Loader2 className="w-6 h-6 mb-2 text-teal-600 animate-spin" /> : <Upload className="w-6 h-6 mb-2 text-slate-400" />}
                        <p className="text-sm text-slate-500">{isDocUploading ? <span className="font-semibold text-teal-600">Uploading securely...</span> : <><span className="font-semibold text-teal-600">Click to upload</span> a secure document to this employee</>}</p>
                      </div>
                      <input type="file" className="hidden" disabled={isDocUploading} onChange={handleDocumentUpload} />
                    </label>
                  </div>
                </div>

                {(!employee.uploadedFiles || employee.uploadedFiles.length === 0) ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">No files have been uploaded to this profile.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employee.uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50 transition border border-slate-200 rounded-md">
                        <div className="flex items-center overflow-hidden pr-4">
                          <FileText className="h-6 w-6 mr-3 text-teal-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{new Date(file.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded transition text-xs font-semibold shadow-sm shrink-0" 
                        >
                          View File
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button type="button" disabled={isUploading} onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={isUploading} form="edit-employee-form" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-slate-400 transition flex items-center">
            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Uploading...</> : 'Save Complete Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeManager({ employees = [], shifts = [], payPeriodStart = '2026-04-01', onEmployeeFileUpload, setEmployees, updateEmployee, onAddEmployee, onRemoveEmployee, currentUser }) {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Neighbour');
  const [newPayType, setNewPayType] = useState('per_visit');
  const [newHourlyWage, setNewHourlyWage] = useState('22.50');
  const [newPerVisitRate, setNewPerVisitRate] = useState('45');
  const [newAnnualSalary, setNewAnnualSalary] = useState('45000');
  const [newHireDate, setNewHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvailability, setNewAvailability] = useState([]);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [employeeStatusView, setEmployeeStatusView] = useState('active'); 

  // SECURITY CHECK
  const isMasterAdmin = currentUser?.role === 'Master Admin' || currentUser?.id === 'admin1';

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];

  const currentBounds = useMemo(() => getPayPeriodBounds(payPeriodStart), [payPeriodStart]);
  const nextBounds = useMemo(() => {
    const start = new Date(currentBounds.end);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return { start, end };
  }, [currentBounds]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    
    setIsUploading(true);

    const newEmp = {
      id: `emp_${Date.now()}`,
      name: newName,
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
      payType: newPayType,
      hourlyWage: Number(newHourlyWage) || 22.50,
      perVisitRate: Number(newPerVisitRate) || 45,
      annualSalary: Number(newAnnualSalary) || 45000,
      hireDate: newHireDate,
      phone: newPhone,
      email: newEmail,
      photoUrl: newPhotoFile ? '' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}&backgroundColor=0f766e`,
      requirements: {},
      timeOffBalances: { sick: 5, vacation: 10 },
      availability: newAvailability,
      isActive: true
    };
    
    if (onAddEmployee) {
      await onAddEmployee(newEmp, newPhotoFile);
    }
    
    setNewName(''); setNewUsername(''); setNewPassword(''); setNewPayType('per_visit'); setNewHourlyWage('22.50');
    setNewPerVisitRate('45'); setNewAnnualSalary('45000'); setNewHireDate(new Date().toISOString().split('T')[0]); 
    setNewPhone(''); setNewEmail(''); setNewAvailability([]); setNewPhotoFile(null); setIsUploading(false);
  };

  const toggleNewAvailability = (dayPart) => {
    setNewAvailability(prev => {
      if (prev.includes(dayPart)) return prev.filter(d => d !== dayPart);
      return [...prev, dayPart];
    });
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
    if (!emp) return false;
    const nameMatch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const isStatusMatch = employeeStatusView === 'active' 
      ? emp.isActive !== false 
      : emp.isActive === false;
      
    return (nameMatch || roleMatch) && isStatusMatch;
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

        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide bg-slate-50/50">
          <button 
            onClick={() => setEmployeeStatusView('active')} 
            className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors whitespace-nowrap ${employeeStatusView === 'active' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Active Staff
          </button>
          <button 
            onClick={() => setEmployeeStatusView('deactivated')} 
            className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors whitespace-nowrap ${employeeStatusView === 'deactivated' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Deactivated Profiles
          </button>
        </div>

        <div className="divide-y divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 bg-slate-50/50 flex-1 overflow-y-auto">
          {filteredEmployees.map(emp => {
            const issuesCount = getComplianceIssues(emp);
            const isProtected = emp.id === 'admin1' && currentUser?.id !== 'admin1';
            
            const empShifts = safeShifts.filter(s => s.employeeId === emp.id);
            const currentCount = empShifts.filter(s => { const d = parseLocal(s.date); return d >= currentBounds.start && d <= currentBounds.end; }).length;
            const nextCount = empShifts.filter(s => { const d = parseLocal(s.date); return d >= nextBounds.start && d <= nextBounds.end; }).length;

            return (
              <div key={emp.id || Math.random()} className={`border border-slate-200 rounded-xl p-4 flex flex-col justify-between transition bg-white relative ${emp.isActive === false ? 'opacity-80' : 'hover:shadow-md'}`}>
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
                      emp.isActive !== false ? (
                        <button 
                          onClick={() => {
                            if(window.confirm(`Deactivate ${emp.name}? They will lose login access and be hidden from the active schedule, but their history will be preserved.`)) {
                              updateEmployee(emp.id, { isActive: false }, null, {});
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                          title="Deactivate Employee"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            if(window.confirm(`Reactivate ${emp.name}? They will regain login access and be placed back into the active staff directory.`)) {
                              updateEmployee(emp.id, { isActive: true }, null, {});
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                          title="Reactivate Employee"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3 mb-3 pr-16">
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name || 'Staff'} className={`h-12 w-12 rounded-full border border-slate-200 object-cover bg-white ${emp.isActive === false && 'grayscale'}`} />
                  ) : (
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${emp.isActive === false ? 'bg-slate-100 text-slate-400' : 'bg-teal-100 text-teal-600'}`}>
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{emp.name || 'Unnamed Employee'}</h3>
                    <div className="flex flex-col mt-0.5 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block w-fit ${emp.isActive === false ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700'}`}>{emp.role || 'Staff'}</span>
                        {emp.isActive === false && <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase">Deactivated</span>}
                      </div>
                      
                      {/* RESTRICTED WAGE VIEW IN DIRECTORY */}
                      <span className="text-xs font-semibold text-slate-600">
                        {isMasterAdmin ? (
                          emp.payType === 'salary' ? `$${(emp.annualSalary||45000).toLocaleString()}/yr` : 
                          emp.payType === 'hourly' ? `$${emp.hourlyWage || 22.50}/hr` : `$${emp.perVisitRate || 45}/visit`
                        ) : (
                          <span className="italic flex items-center"><Lock className="h-3 w-3 mr-1"/> Wage Confidential</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2">
                  <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100 space-y-1">
                    {emp.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1.5" />{emp.phone}</div>}
                    {emp.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1.5" />{emp.email}</div>}
                    {!emp.phone && !emp.email && <span className="italic text-slate-400">No contact info provided</span>}
                  </div>

                  <div className="bg-slate-50 rounded p-2.5 text-xs text-slate-600 border border-slate-100">
                    <div className="font-semibold text-slate-700 mb-1 flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1.5" /> Scheduled Shifts
                    </div>
                    <div className="flex justify-between items-center mb-0.5">
                      <span>Current Period:</span>
                      <span className="font-bold text-teal-700">{currentCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Next Period:</span>
                      <span className="font-bold text-teal-700">{nextCount}</span>
                    </div>
                  </div>

                  {(emp.availability && emp.availability.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {emp.availability.map(avail => (
                        <span key={avail} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                          {avail}
                        </span>
                      ))}
                    </div>
                  )}
                  
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
            <div className="col-span-full p-8 text-center text-slate-500">
              {employeeStatusView === 'active' ? `No active employees found matching "${searchTerm}".` : "No deactivated staff on file."}
            </div>
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
              disabled={isUploading}
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
              <input type="text" disabled={isUploading} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. janedoe" required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="text" disabled={isUploading} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Secure password" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 border border-slate-200 p-3 rounded-md bg-slate-50/50">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select disabled={isUploading} value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold text-teal-800 bg-white">
                <option value="Neighbour">Neighbour</option>
                <option value="Block Captain">Block Captain</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
              <input type="date" disabled={isUploading} value={newHireDate} onChange={(e) => setNewHireDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white" />
            </div>
            
            {/* WAGE SECURE AREA */}
            {isMasterAdmin ? (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Active Pay Structure</label>
                  <select disabled={isUploading} value={newPayType} onChange={(e) => setNewPayType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white">
                    <option value="per_visit">Per Visit Rate</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="salary">Annual Salary</option>
                  </select>
                </div>
                
                {newPayType === 'salary' ? (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Annual Salary ($)</label>
                    <input type="number" min="0" step="100" disabled={isUploading} value={newAnnualSalary} onChange={(e) => setNewAnnualSalary(e.target.value)} className="w-full px-3 py-2 border border-teal-400 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white" required />
                  </div>
                ) : (
                  <>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Per Visit ($)</label>
                      <input type="number" min="0" step="1" disabled={isUploading} value={newPerVisitRate} onChange={(e) => setNewPerVisitRate(e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${newPayType === 'per_visit' ? 'border-teal-400 bg-white' : 'border-slate-200 bg-white/50'}`} required />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Hourly ($)</label>
                      <input type="number" min="0" step="0.50" disabled={isUploading} value={newHourlyWage} onChange={(e) => setNewHourlyWage(e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${newPayType === 'hourly' ? 'border-teal-400 bg-white' : 'border-slate-200 bg-white/50'}`} required />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="col-span-2 bg-slate-100 text-slate-500 text-xs p-2 rounded text-center font-medium">
                <Lock className="h-3 w-3 inline mr-1"/> Wages can only be set by the Master Admin. Default rate applied.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" disabled={isUploading} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="555-0000" />
            </div>
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" disabled={isUploading} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="email@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Availability</label>
            <div className="flex flex-wrap gap-2">
              {['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends', 'Overnights'].map(part => (
                <label key={part} className={`flex items-center space-x-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded transition ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                  <input type="checkbox" disabled={isUploading} checked={newAvailability.includes(part)} onChange={() => toggleNewAvailability(part)} className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4" />
                  <span>{part}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('emp-photo-upload').click()}>
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500">
                    {newPhotoFile ? newPhotoFile.name : <span>Upload a photo</span>}
                  </span>
                </div>
              </div>
              <input id="emp-photo-upload" type="file" accept="image/*" className="sr-only" disabled={isUploading} onChange={(e) => setNewPhotoFile(e.target.files[0])} />
            </div>
          </div>

          <button type="submit" disabled={isUploading} className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 transition">
            {isUploading ? <><Loader2 className="h-4 w-4 animate-spin"/><span>Uploading...</span></> : <><Plus className="h-4 w-4" /><span>Add Employee Profile</span></>}
          </button>
        </form>
      </div>

      {editingEmployee && (
        <EditEmployeeModal 
          employee={editingEmployee} 
          onClose={() => setEditingEmployee(null)} 
          onEmployeeFileUpload={onEmployeeFileUpload}
          isMasterAdmin={isMasterAdmin}
          onSave={async (id, data, file, certFiles) => {
            if (updateEmployee) await updateEmployee(id, data, file, certFiles);
            setEditingEmployee(null);
          }} 
        />
      )}
    </div>
  );
}
