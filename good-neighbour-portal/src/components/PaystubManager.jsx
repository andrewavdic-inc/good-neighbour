import React, { useState } from 'react';
import { FileText, Plus, Trash2, Loader2, Download, Search, User } from 'lucide-react';

const parseLocalSafe = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
  } catch (e) {
    return new Date();
  }
};

export default function PaystubManager({ paystubs = [], employees = [], onAddPaystub, onRemovePaystub }) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [paystubFile, setPaystubFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulletproof arrays
  const safePaystubs = Array.isArray(paystubs) ? paystubs : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !date || !paystubFile) return;
    
    setIsUploading(true);

    if (onAddPaystub) {
      await onAddPaystub({ 
        employeeId, 
        date, 
        fileName: paystubFile.name 
      }, paystubFile);
    }
    
    setEmployeeId(''); 
    setDate(''); 
    setPaystubFile(null);
    setIsUploading(false);
  };

  // Filter paystubs based on the search bar
  const filteredPaystubs = safePaystubs.filter(ps => {
    if (!ps) return false;
    if (!searchTerm.trim()) return true;
    
    const emp = safeEmployees.find(e => e.id === ps.employeeId);
    const empName = emp?.name || 'Unknown Employee';
    
    return empName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (ps.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const dateA = a?.date ? new Date(a.date).getTime() : 0;
    const dateB = b?.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA; // Sort newest first
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* UPLOAD FORM (Left Column) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Upload Paystub</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
              required
              disabled={isUploading}
            >
              <option value="" disabled>Select an employee...</option>
              {safeEmployees.map(emp => (
                <option key={emp.id || Math.random()} value={emp.id}>
                  {emp.name || 'Unnamed Employee'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period Date *</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
              required 
              disabled={isUploading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload File *</label>
            <div className={`mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md transition bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} onClick={() => !isUploading && document.getElementById('paystub-file-upload').click()}>
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500">
                    {paystubFile ? paystubFile.name : <span>Click to attach paystub document</span>}
                  </span>
                </div>
                <p className="text-xs text-slate-500">PDF or Image files</p>
              </div>
              <input 
                id="paystub-file-upload" 
                type="file" 
                accept=".pdf,image/*" 
                className="sr-only" 
                onChange={(e) => setPaystubFile(e.target.files[0])}
                disabled={isUploading}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isUploading || !paystubFile || !employeeId || !date}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 transition"
          >
            {isUploading ? <><Loader2 className="h-4 w-4 animate-spin"/><span>Uploading securely...</span></> : <><Plus className="h-4 w-4" /><span>Record & Send Paystub</span></>}
          </button>
        </form>
      </div>

      {/* PAYSTUB LIST (Right Column) */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Recent Paystubs</h2>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition"
            />
          </div>
        </div>
        
        <div className="p-4 space-y-2 overflow-y-auto flex-1 bg-slate-50/50">
          {filteredPaystubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No paystubs found.</p>
            </div>
          ) : (
            filteredPaystubs.map(ps => {
              const emp = safeEmployees.find(e => e.id === ps.employeeId);
              
              return (
                <div key={ps.id || Math.random()} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition group">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="p-3 rounded-full bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-800 text-sm flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        {emp?.name || 'Unknown Employee'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        <span className="font-semibold text-slate-600">{ps.date ? parseLocalSafe(ps.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'Unknown Date'}</span> &bull; {ps.fileName || 'Unnamed File'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pl-4 shrink-0">
                     <a 
                      href={ps.fileUrl || '#'} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 p-2 rounded-lg transition inline-flex" 
                      title="View Document"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button 
                      onClick={() => {
                        if(window.confirm(`Are you sure you want to delete the paystub for ${emp?.name}?`)) {
                          onRemovePaystub && onRemovePaystub(ps.id);
                        }
                      }} 
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition" 
                      title="Delete Paystub"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
