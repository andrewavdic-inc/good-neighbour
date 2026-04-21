import React, { useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { parseLocal } from '../utils';

export default function PaystubManager({ paystubs = [], employees = [], onAddPaystub, onRemovePaystub }) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !date || !fileName) return;
    onAddPaystub({ employeeId, date, fileName });
    setEmployeeId(''); setDate(''); setFileName('');
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
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required>
              <option value="" disabled>Select an employee...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File Name/Link *</label>
            <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="e.g. paystub_april.pdf" required />
          </div>
          <button type="submit" className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition"><Plus className="h-4 w-4" /><span>Record Paystub</span></button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center"><h2 className="text-lg font-semibold text-slate-800">Recent Paystubs</h2></div>
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {paystubs.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No paystubs recorded.</p> :
            paystubs.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(ps => {
              const emp = employees.find(e => e.id === ps.employeeId);
              return (
                <div key={ps.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:shadow-sm transition">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-full bg-teal-100 text-teal-600"><FileText className="h-4 w-4" /></div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{emp?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{parseLocal(ps.date).toLocaleDateString()} &bull; {ps.fileName}</div>
                    </div>
                  </div>
                  <button onClick={() => onRemovePaystub(ps.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  );
}