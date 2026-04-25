import React, { useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';

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

  const safePaystubs = Array.isArray(paystubs) ? paystubs : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !date || !paystubFile) return;
    
    // Create a secure Object URL so the employee can download the file
    const fileUrl = URL.createObjectURL(paystubFile);

    if (onAddPaystub) {
      onAddPaystub({ 
        employeeId, 
        date, 
        fileName: paystubFile.name,
        fileUrl: fileUrl 
      });
    }
    
    setEmployeeId(''); 
    setDate(''); 
    setPaystubFile(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload File *</label>
            <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('paystub-file-upload').click()}>
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-6 w-6 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500">
                    {paystubFile ? paystubFile.name : <span>Click to attach paystub document</span>}
                  </span>
                </div>
              </div>
              <input 
                id="paystub-file-upload" 
                type="file" 
                accept=".pdf,image/*" 
                className="sr-only" 
                onChange={(e) => setPaystubFile(e.target.files[0])}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Paystub</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <h2 className="text-lg font-semibold text-slate-800">Recent Paystubs</h2>
        </div>
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {safePaystubs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No paystubs have been recorded yet.</p>
          ) : (
            [...safePaystubs].sort((a, b) => {
               const dateA = a?.date ? new Date(a.date).getTime() : 0;
               const dateB = b?.date ? new Date(b.date).getTime() : 0;
               return dateB - dateA;
            }).map(ps => {
              if (!ps) return null; 
              const emp = safeEmployees.find(e => e.id === ps.employeeId);
              
              return (
                <div key={ps.id || Math.random()} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:shadow-sm transition">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-full bg-teal-100 text-teal-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {emp?.name || 'Unknown Employee'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ps.date ? parseLocalSafe(ps.date).toLocaleDateString() : 'Unknown Date'} &bull; {ps.fileName || 'Unnamed File'}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemovePaystub && onRemovePaystub(ps.id)} 
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition" 
                    title="Delete Paystub Record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
