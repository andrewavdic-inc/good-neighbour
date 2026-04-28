import React, { useState } from 'react';
import { Briefcase, AlertCircle, Loader2, Lock } from 'lucide-react';

export default function LoginPage({ onLogin, onSeedData, isDbReady, hasData }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Strict boolean casting to prevent React crash errors
  const dbReady = Boolean(isDbReady);
  const dataExists = Boolean(hasData);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!dbReady || (!dataExists && dbReady)) return;
    
    setIsLoggingIn(true);
    await onLogin(email, password);
    setIsLoggingIn(false); // Stop spinning if login fails
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-teal-600 p-4 rounded-full shadow-lg border-4 border-white">
            <Lock className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Good Neighbour Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to your secure cloud workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-teal-100">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="mt-1">
                <input 
                  type="email" 
                  required 
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@goodneighbour.ca"
                  disabled={!dbReady || isLoggingIn}
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
                  placeholder="••••••••"
                  disabled={!dbReady || isLoggingIn}
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={!dbReady || (!dataExists && dbReady) || isLoggingIn}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {!dbReady ? 'Connecting to Server...' : isLoggingIn ? <><Loader2 className="h-5 w-5 mr-2 animate-spin"/> Authenticating...</> : 'Secure Sign In'}
              </button>
            </div>
          </form>

          {dbReady && !dataExists && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-center shadow-inner">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800 mb-3">
                  The cloud database is currently empty.
                </p>
                <button 
                  onClick={onSeedData}
                  type="button"
                  className="px-4 py-2 w-full bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-bold shadow transition"
                >
                  Force Initialize Demo Database
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
