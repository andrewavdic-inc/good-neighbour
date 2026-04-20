import React, { useState } from 'react';
import { Briefcase, AlertCircle, Info } from 'lucide-react';

export default function LoginPage({ onLogin, onSeedData, isDbReady, hasData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(username, password);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-teal-600 p-4 rounded-full shadow-lg border-4 border-white">
            <Briefcase className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Good Neighbour Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your cloud-synced schedule
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-teal-100">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <div className="mt-1">
                <input 
                  type="text" 
                  required 
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input 
                  type="password" 
                  required 
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-slate-400"
              >
                {isLoading ? 'Checking credentials...' : 'Secure Sign In'}
              </button>
            </div>
          </form>

          {!hasData && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-center shadow-inner">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800 mb-3">
                  {!isDbReady ? "Connecting to cloud database..." : "The cloud database is currently empty."}
                </p>
                <button 
                  onClick={onSeedData}
                  className="px-4 py-2 w-full bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-bold shadow transition"
                >
                  Force Initialize Demo Database
                </button>
              </div>
            </div>
          )}

          {hasData && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      <strong>Demo Accounts (Ready):</strong><br/>
                      Admin: <code>admin</code> / <code>admin</code><br/>
                      Staff: <code>alice</code> / <code>password</code><br/>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
