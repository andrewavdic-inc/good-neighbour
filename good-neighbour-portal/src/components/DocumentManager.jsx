import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, Download, FileText, File } from 'lucide-react';

export default function DocumentManager({ documents = [], onAddDocument, onRemoveDocument, isAdmin }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !file) return;
    
    // In a real app, you would upload the file to Firebase Storage here and save the download URL.
    // For this demo, we save the filename to simulate the record.
    if (onAddDocument) {
      onAddDocument({
        title,
        description,
        fileName: file.name,
        uploadDate: new Date().toISOString()
      });
    }
    
    setTitle('');
    setDescription('');
    setFile(null);
  };

  // Sort newest first safely
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
    const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Upload Company Document</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 focus:border-teal-500 text-sm" 
                  required 
                  placeholder="e.g. 2026 WHMIS Guide" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-teal-500 focus:border-teal-500 text-sm" 
                  placeholder="Optional details..." 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
              <div className="mt-1 flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer bg-white" onClick={() => document.getElementById('company-doc-upload').click()}>
                <div className="space-y-1 text-center">
                  <File className="mx-auto h-6 w-6 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500">
                      {file ? file.name : <span>Click to select PDF or Document</span>}
                    </span>
                  </div>
                </div>
                <input id="company-doc-upload" type="file" accept=".pdf,image/*,.doc,.docx" className="sr-only" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-md font-medium flex items-center transition shadow-sm text-sm">
                <Plus className="h-4 w-4 mr-2"/> Upload Document
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-800">Company Documents</h2>
        </div>
        <div className="p-6 bg-slate-50/30">
          {sortedDocs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No documents available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDocs.map(doc => (
                <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-white">
                  <div className="flex items-center space-x-4 overflow-hidden pr-4">
                    <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-slate-800 truncate leading-tight">{doc.title}</h3>
                      {doc.description && <p className="text-xs text-slate-500 truncate mt-0.5">{doc.description}</p>}
                      <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
                        {doc.fileName} &bull; {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button className="text-teal-600 hover:bg-teal-50 p-2 rounded transition" title="Download">
                      <Download className="h-5 w-5" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => onRemoveDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition ml-1" title="Delete">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
