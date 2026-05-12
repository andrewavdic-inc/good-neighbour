import React from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import DocumentManager from './DocumentManager';

export default function PersonalUploadsTab({ 
  documents, 
  myUploads, 
  isUploadingDoc, 
  handleDocumentUpload 
}) {
  return (
    <div className="p-6 space-y-6">
      <DocumentManager documents={documents} isAdmin={false} />
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" /> My Personal Uploads</h2>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Securely send a document to the Administrator</label>
            <div className="flex items-center justify-center w-full">
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploadingDoc ? <Loader2 className="w-8 h-8 mb-3 text-teal-600 animate-spin" /> : <Upload className="w-8 h-8 mb-3 text-slate-400" />}
                  <p className="mb-2 text-sm text-slate-500">{isUploadingDoc ? <span className="font-semibold text-teal-600">Uploading securely...</span> : <><span className="font-semibold text-teal-600">Click to upload</span> or drag and drop</>}</p>
                  <p className="text-xs text-slate-500">PDF, JPG, or PNG</p>
                </div>
                <input type="file" className="hidden" disabled={isUploadingDoc} onChange={handleDocumentUpload} />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {myUploads.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-500">You haven't uploaded any personal files yet.</div>
            ) : (
              myUploads.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-teal-50 transition border border-slate-200 rounded-md">
                  <div className="flex items-center overflow-hidden pr-4">
                    <FileText className="h-6 w-6 mr-3 text-teal-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(file.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded transition text-xs font-semibold shadow-sm shrink-0">View</a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
