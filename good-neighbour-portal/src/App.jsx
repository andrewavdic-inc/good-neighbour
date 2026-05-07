import React, { useState, useEffect } from 'react';
import { Briefcase, LogOut, User } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- UTILS & COMPONENTS ---
import { MOCK_EMPLOYEES, MOCK_CLIENTS, INITIAL_SHIFTS, INITIAL_EXPENSES, INITIAL_CLIENT_EXPENSES, INITIAL_PAYSTUBS, INITIAL_TIME_OFF, INITIAL_MESSAGES, parseLocal } from './utils';

import LoginPage from './components/LoginPage';
import EmployeeDashboard from './components/EmployeePortal'; 
import AdminDashboard from './components/AdminDashboard';
import ClientProfileModal from './components/ClientProfileModal';

// --- PHOTO CLEANER ---
const getValidPhoto = (url) => {
  if (!url || typeof url !== 'string' || url.includes('dicebear.com')) return null;
  return url.startsWith('[') ? (url.match(/\]\((.*?)\)/)?.[1] || null) : url;
};

// --- FIREBASE INITIALIZATION ---
let firebaseApp, auth, db, storage, appId;
try {
  const firebaseConfig = {
    apiKey: "AIzaSyCMhO6iAPDuWJhZLdWZ_orO8-AyWDItnQo",
    authDomain: "good-neighbour-portal.firebaseapp.com",
    projectId: "good-neighbour-portal",
    storageBucket: "good-neighbour-portal.firebasestorage.app",
    messagingSenderId: "570654987529",
    appId: "1:570654987529:web:400f90a7a63a03b6aa6fd8"
  };
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  appId = 'good-neighbour-portal';
} catch (e) {
  console.error("Firebase init error:", e);
}

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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [viewMode, setViewMode] = useState('employee');
  const [selectedClient, setSelectedClient] = useState(null);
  
  // App State
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clientExpenses, setClientExpenses] = useState([]);
  const [paystubs, setPaystubs] = useState([]);
  const [timeOffLogs, setTimeOffLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // DATABASES FOR THE DESK
  const [notes, setNotes] = useState([]);
  const [businessExpenses, setBusinessExpenses] = useState([]);
  const [adminDrawer, setAdminDrawer] = useState([]);
  const [cabinetDocuments, setCabinetDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // NEW DATABASES FOR REWARDS
  const [kudos, setKudos] = useState([]);
  const [prizes, setPrizes] = useState([]);
  
  // DATABASE FOR PAYROLL
  const [payrollLogs, setPayrollLogs] = useState([]);

  // Settings State
  const [payPeriodStart, setPayPeriodStart] = useState('2026-04-01');
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [bonusSettings, setBonusSettings] = useState({ monthly: [100, 50, 20], annual: [3000, 2000, 1000] });
  const [officeLocation, setOfficeLocation] = useState('Port Colborne, ON');
  const [announcementPictureUrl, setAnnouncementPictureUrl] = useState('');

  // Setup Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error('Firebase Auth Error:', error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, user => { setFirebaseUser(user); });
    return () => unsubscribe();
  }, []);

  // Setup Firestore Listeners
  useEffect(() => {
    if (!firebaseUser || !db) return;

    const getCol = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubs = [];
    const handleError = (err) => console.error("Firestore Error:", err);

    unsubs.push(onSnapshot(getCol('gn_employees'), snap => { setEmployees(snap.docs.map(d => ({ ...d.data(), id: d.id }))); setIsDbReady(true); }, handleError));
    unsubs.push(onSnapshot(getCol('gn_shifts'), snap => setShifts(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clients'), snap => setClients(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_expenses'), snap => setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_clientExpenses'), snap => setClientExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_paystubs'), snap => setPaystubs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_timeOffLogs'), snap => setTimeOffLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_messages'), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_documents'), snap => setDocuments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    
    // DESK & REWARDS LISTENERS
    unsubs.push(onSnapshot(getCol('gn_notes'), snap => setNotes(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_businessExpenses'), snap => setBusinessExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_adminDrawer'), snap => setAdminDrawer(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_cabinetDocuments'), snap => setCabinetDocuments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_appointments'), snap => setAppointments(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_kudos'), snap => setKudos(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    unsubs.push(onSnapshot(getCol('gn_prizes'), snap => setPrizes(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));
    
    // PAYROLL LOGS LISTENER
    unsubs.push(onSnapshot(getCol('gn_payroll_logs'), snap => setPayrollLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleError));

    unsubs.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'gn_settings', 'global'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payPeriodStart) setPayPeriodStart(data.payPeriodStart);
        if (data.isBonusActive !== undefined) setIsBonusActive(data.isBonusActive);
        if (data.bonusAmounts) setBonusSettings(data.bonusAmounts);
        if (data.officeLocation) setOfficeLocation(data.officeLocation);
        if (data.announcementPictureUrl !== undefined) setAnnouncementPictureUrl(data.announcementPictureUrl);
      }
    }, handleError));

    return () => unsubs.forEach(unsub => unsub());
  }, [firebaseUser]);

  const handleSeedData = async () => {
    if (!firebaseUser || !db) return;
    try {
      const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, String(docId));

      for (const e of MOCK_EMPLOYEES) await setDoc(getDocRef('gn_employees', e.id), e);
      for (const c of MOCK_CLIENTS) await setDoc(getDocRef('gn_clients', c.id), c);
      for (const s of INITIAL_SHIFTS) await setDoc(getDocRef('gn_shifts', s.id.toString()), { ...s, id: s.id.toString() });
      for (const ex of INITIAL_EXPENSES) await setDoc(getDocRef('gn_expenses', ex.id.toString()), { ...ex, id: ex.id.toString() });
      for (const ce of INITIAL_CLIENT_EXPENSES) await setDoc(getDocRef('gn_clientExpenses', ce.id.toString()), { ...ce, id: ce.id.toString() });
      for (const p of INITIAL_PAYSTUBS) await setDoc(getDocRef('gn_paystubs', p.id.toString()), { ...p, id: p.id.toString() });
      for (const t of INITIAL_TIME_OFF) await setDoc(getDocRef('gn_timeOffLogs', t.id.toString()), { ...t, id: t.id.toString() });
      for (const m of INITIAL_MESSAGES) await setDoc(getDocRef('gn_messages', m.id.toString()), { ...m, id: m.id.toString() });
      
      alert("Demo database initialized successfully!");
    } catch (err) {
      console.error("Error seeding data:", err);
      alert("Error seeding data. Check console logs.");
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const secureEmail = userCredential.user.email;

      const safeEmployees = Array.isArray(employees) ? employees : [];
      const foundEmp = safeEmployees.find(e => e && e.email && String(e.email).toLowerCase() === String(secureEmail).toLowerCase());
      
      if (foundEmp) {
        setCurrentUser({ id: foundEmp.id, name: foundEmp.name, role: foundEmp.role || 'Neighbour', payType: foundEmp.payType, hourlyWage: foundEmp.hourlyWage, perVisitRate: foundEmp.perVisitRate, annualSalary: foundEmp.annualSalary, timeOffBalances: foundEmp.timeOffBalances, photoUrl: foundEmp.photoUrl, deskPictureUrl: foundEmp.deskPictureUrl, deskBoard: foundEmp.deskBoard, hireDate: foundEmp.hireDate, pastTrophies: foundEmp.pastTrophies });
        setViewMode(String(foundEmp.role).includes('Admin') ? 'admin' : 'employee');
      } else { 
        alert("Login successful, but this email is not assigned to an employee profile in the directory. Please contact the administrator."); 
      }
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Invalid email or password. Please try again.");
    }
  };
  
  const handleLogout = () => { setCurrentUser(null); setViewMode('employee'); };

  const getDocRef = (cName, dId) => doc(db, 'artifacts', appId, 'public', 'data', cName, String(dId));
  
  const runMutation = async (cName, dId, action, data) => {
    if(!firebaseUser) return;
    const ref = getDocRef(cName, dId);
    if(action === 'set') await setDoc(ref, data);
    if(action === 'update') await updateDoc(ref, data);
    if(action === 'delete') await deleteDoc(ref);
  };

  const handleFileUpload = async (file, folder) => {
    if (!file || !firebaseUser || !storage) return null;
    try {
      const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const fileRef = ref(storage, `${appId}/${folder}/${uniqueName}`);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("File upload failed. Please try again.");
      return null;
    }
  };

  // --- THE PAYROLL PIPELINE ENGINE ---
  const handleFinalizePayroll = async (payrollData, paystubFiles) => {
    if (!firebaseUser) return;
    const payrollId = Date.now().toString();

    // Process Paystubs Securely
    for (const [empId, file] of Object.entries(paystubFiles)) {
      if (file) {
        const url = await handleFileUpload(file, 'paystubs');
        if (url) {
          const stubId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
          await setDoc(getDocRef('gn_paystubs', stubId), {
            id: stubId,
            employeeId: empId,
            date: payrollData.payoutDate, 
            fileUrl: url,
            fileName: file.name
          });
        }
      }
    }

    // Lock the Master Payroll Record into the Database
    await setDoc(getDocRef('gn_payroll_logs', payrollId), {
      ...payrollData,
      id: payrollId,
      dateProcessed: new Date().toISOString()
    });
  };

  const handleSaveSettings = async (field, value) => {
    if (!firebaseUser) return;
    
    if (field === 'payPeriodStart') setPayPeriodStart(value);
    if (field === 'isBonusActive') setIsBonusActive(value);
    if (field === 'bonusAmounts') setBonusSettings(value);
    if (field === 'officeLocation') setOfficeLocation(value);
    if (field === 'announcementPictureUrl') setAnnouncementPictureUrl(value);
    
    const payload = { 
      payPeriodStart: field === 'payPeriodStart' ? value : payPeriodStart, 
      isBonusActive: field === 'isBonusActive' ? value : isBonusActive, 
      bonusAmounts: field === 'bonusAmounts' ? value : bonusSettings,
      officeLocation: field === 'officeLocation' ? value : officeLocation,
      announcementPictureUrl: field === 'announcementPictureUrl' ? value : announcementPictureUrl
    };
    
    await setDoc(getDocRef('gn_settings', 'global'), payload, { merge: true });
  };

  const getClientRemainingBalance = (clientId) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const client = safeClients.find(c => c && c.id === clientId);
    if (!client) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const safeCE = Array.isArray(clientExpenses) ? clientExpenses : [];
    const spentThisMonth = safeCE
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = parseLocalSafe(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
    const safeExp = Array.isArray(expenses) ? expenses : [];
    const mileageThisMonth = safeExp
      .filter(e => e && e.clientId === clientId && e.status === 'approved')
      .filter(e => {
        const d = parseLocalSafe(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.kilometers || 0) * 0.68), 0);
      
    return (client.monthlyAllowance || 0) - spentThisMonth - mileageThisMonth;
  };

  const handleApproveTimeOff = (request) => {
    runMutation('gn_timeOffLogs', request.id, 'update', { status: 'approved' });
    const shiftMatches = shifts.filter(s => s.employeeId === request.employeeId && s.date >= request.startDate && s.date <= request.endDate);
    shiftMatches.forEach(shift => { runMutation('gn_shifts', shift.id, 'update', { employeeId: 'unassigned' }); });
  };

  const handleRejectTimeOff = (requestId) => {
    runMutation('gn_timeOffLogs', requestId, 'update', { status: 'rejected' });
  };

  const handleUpdateAnnouncementPicture = async (file) => {
    if (!file) return;
    const url = await handleFileUpload(file, 'documents');
    if (url) {
      await handleSaveSettings('announcementPictureUrl', url);
    }
  };

  const handleAcknowledgeMessage = (msgId, empId) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      const acks = msg.acknowledgements || [];
      if (!acks.includes(empId)) {
        runMutation('gn_messages', msgId, 'update', { acknowledgements: [...acks, empId] });
      }
    }
  };

  const handleAcknowledgeReward = (collectionName, id) => {
    runMutation(collectionName, id, 'update', { acknowledged: true });
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} isDbReady={Boolean(isDbReady)} hasData={Boolean(Array.isArray(employees) && employees.length > 0)} onSeedData={handleSeedData} />;

  const isAdmin = String(currentUser.role).includes('Admin');
  const showAdminView = isAdmin && viewMode === 'admin';
  const finalPhotoUrl = getValidPhoto(currentUser.photoUrl);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-teal-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center"><Briefcase className="mr-2 h-6 w-6 text-teal-200"/> Good Neighbour</div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button onClick={() => { setViewMode(viewMode === 'admin' ? 'employee' : 'admin'); }} className="text-xs bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded font-bold transition shadow-sm">
              {viewMode === 'admin' ? 'Switch to Employee View' : 'Switch to Admin View'}
            </button>
          )}
          <div className="flex items-center text-sm hidden sm:flex">
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border border-teal-500 overflow-hidden mr-2 shrink-0">
              {finalPhotoUrl ? <img src={finalPhotoUrl} alt="Avatar" className="h-full w-full object-cover bg-white" /> : <User className="h-4 w-4" />}
            </div>
            {String(currentUser.name)}
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-teal-600 transition" title="Logout"><LogOut className="h-5 w-5"/></button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {showAdminView ? (
          <AdminDashboard 
            shifts={shifts} 
            employees={employees} 
            onAddEmployee={async (d, file) => {
              let url = d.photoUrl || '';
              if (file) url = await handleFileUpload(file, 'avatars');
              runMutation('gn_employees', d.id, 'set', { ...d, photoUrl: url });
              }} 
            updateEmployee={async (id, d, file, certFiles = {}) => {
              const existingEmp = employees.find(e => e.id === id);
              let url = d.photoUrl || existingEmp?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              const updatedReqs = { ...(d.requirements || existingEmp?.requirements || {}) };
              for (const [reqKey, certFile] of Object.entries(certFiles)) {
                if (certFile) {
                  const certUrl = await handleFileUpload(certFile, 'certificates');
                  if (certUrl) updatedReqs[reqKey] = { ...updatedReqs[reqKey], fileUrl: certUrl };
                }
              }
              runMutation('gn_employees', id, 'update', { ...d, photoUrl: url, requirements: updatedReqs });
            }}            
            clients={clients} 
            onAddClient={(d) => runMutation('gn_clients', d.id, 'set', d)} 
            onRemoveClient={(id) => runMutation('gn_clients', id, 'delete')} 
            updateClient={async (id, d, file) => {
              const existingClient = clients.find(c => c.id === id);
              let url = d.photoUrl || existingClient?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              
              if (d.isActive === false && existingClient?.isActive !== false) {
                 const now = new Date();
                 const upcoming = shifts.filter(s => s.clientId === id && new Date(`${s.date}T${s.endTime || '23:59'}`) >= now);
                 for (const s of upcoming) {
                     await runMutation('gn_shifts', s.id, 'delete');
                 }
              }
              runMutation('gn_clients', id, 'update', { ...d, photoUrl: url });
            }} 
            onClientFileUpload={async (clientId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingClient = clients.find(c => c.id === clientId);
              const currentUploads = existingClient?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_clients', clientId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
            }}
            onEmployeeFileUpload={async (employeeId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingEmp = employees.find(e => e.id === employeeId);
              const currentUploads = existingEmp?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_employees', employeeId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
            }}
            expenses={expenses} 
            onUpdateExpense={(id, s) => runMutation('gn_expenses', id, 'update', { status: s })} 
            clientExpenses={clientExpenses} 
            onUpdateClientExpense={(id, s) => runMutation('gn_clientExpenses', id, 'update', { status: s })} 
            onAddClientExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_clientExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'approved', receiptUrl: url });
            }}

            paystubs={paystubs} 
            timeOffLogs={timeOffLogs} 
            onAddTimeOffLog={(d) => runMutation('gn_timeOffLogs', Date.now().toString(), 'set', { ...d, id: Date.now().toString() })} 
            onRemoveTimeOffLog={(id) => runMutation('gn_timeOffLogs', id, 'update', { status: 'cancelled' })} 
            
            documents={documents} 
            messages={messages} 
            
            onSendMessage={(text, senderId, isHighPriority) => runMutation('gn_messages', Date.now().toString(), 'set', { id: Date.now().toString(), text, senderId, date: new Date().toISOString(), isHighPriority: !!isHighPriority, acknowledgements: [] })} 
            onDeleteMessage={(id) => runMutation('gn_messages', id, 'delete')}
            onAcknowledgeMessage={handleAcknowledgeMessage}
            announcementPictureUrl={announcementPictureUrl}
            onUpdateAnnouncementPicture={handleUpdateAnnouncementPicture}

            currentUser={currentUser} 
            payPeriodStart={payPeriodStart} 
            setPayPeriodStart={(v) => handleSaveSettings('payPeriodStart', v)} 
            isBonusActive={isBonusActive} 
            setIsBonusActive={(v) => handleSaveSettings('isBonusActive', v)} 
            bonusSettings={bonusSettings} 
            setBonusSettings={(v) => handleSaveSettings('bonusAmounts', v)} 
            
            onAddDocument={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_documents', d.id || Date.now().toString(), 'set', { ...d, id: d.id || Date.now().toString(), fileUrl: url });
            }}
            onRemoveDocument={(id) => runMutation('gn_documents', id, 'delete')}
            
            onAddPaystub={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'paystubs');
              runMutation('gn_paystubs', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemovePaystub={(id) => runMutation('gn_paystubs', id, 'delete')}
            onAddShift={async (newShifts) => {
              if (!firebaseUser) return;
              const arr = Array.isArray(newShifts) ? newShifts : [newShifts];
              for (const s of arr) {
                const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
                await setDoc(getDocRef('gn_shifts', id), { ...s, id });
              }
            }} 
            onRemoveShift={(id) => runMutation('gn_shifts', id, 'delete')} 
            onMarkShiftOpen={(id) => runMutation('gn_shifts', id, 'update', { employeeId: 'unassigned' })}
            onApproveTimeOff={handleApproveTimeOff}
            onRejectTimeOff={handleRejectTimeOff}

            notes={notes}
            businessExpenses={businessExpenses}
            onAddNote={(data) => runMutation('gn_notes', Date.now().toString(), 'set', { ...data, id: Date.now().toString() })}
            onUpdateNote={(id, data) => runMutation('gn_notes', id, 'update', data)}
            onRemoveNote={(id) => runMutation('gn_notes', id, 'delete')}
            onAddBusinessExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_businessExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), receiptUrl: url });
            }}
            onRemoveBusinessExpense={(id) => runMutation('gn_businessExpenses', id, 'delete')}
            
            officeLocation={officeLocation}
            adminDrawer={adminDrawer}
            onAddDrawerFile={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_adminDrawer', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemoveDrawerFile={(id) => runMutation('gn_adminDrawer', id, 'delete')}
            onUpdateDeskPicture={async (file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'avatars');
              if (url) {
                runMutation('gn_employees', currentUser.id, 'update', { deskPictureUrl: url });
                setCurrentUser(prev => ({ ...prev, deskPictureUrl: url }));
              }
            }}
            cabinetDocuments={cabinetDocuments}
            onAddCabinetDocument={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents');
              runMutation('gn_cabinetDocuments', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            onRemoveCabinetDocument={(id) => runMutation('gn_cabinetDocuments', id, 'delete')}

            onUpdateDeskBoard={async (boardData) => {
              if (!currentUser) return;
              runMutation('gn_employees', currentUser.id, 'update', { deskBoard: boardData });
              setCurrentUser(prev => ({ ...prev, deskBoard: boardData }));
            }}
            appointments={appointments}
            onAddAppointment={(data) => runMutation('gn_appointments', Date.now().toString(), 'set', { ...data, id: Date.now().toString() })}
            onUpdateAppointment={(id, data) => runMutation('gn_appointments', id, 'update', data)}
            onRemoveAppointment={(id) => runMutation('gn_appointments', id, 'delete')}
            
            onApproveShiftCancelDelete={(shiftId) => runMutation('gn_shifts', shiftId, 'delete')}
            onApproveShiftCancelOpen={(shiftId) => runMutation('gn_shifts', shiftId, 'update', { employeeId: 'unassigned', cancelRequest: null })}
            onDenyShiftCancel={(shiftId) => runMutation('gn_shifts', shiftId, 'update', { cancelRequest: null })}

            kudos={kudos}
            prizes={prizes}
            onAddKudos={(d) => runMutation('gn_kudos', Date.now().toString(), 'set', { ...d, id: Date.now().toString() })}
            onRemoveKudos={(id) => runMutation('gn_kudos', id, 'delete')}
            
            onAddPrize={async (d, file) => {
              let url = d.fileUrl || '';
              if (file) url = await handleFileUpload(file, 'documents'); 
              runMutation('gn_prizes', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), fileUrl: url });
            }}
            
            onRemovePrize={(id) => runMutation('gn_prizes', id, 'delete')}
            
            payrollLogs={payrollLogs}
            onFinalizePayroll={handleFinalizePayroll}

            // --- ADMIN EDIT SHIFT PROP ---
            onUpdateShift={(shiftId, data) => runMutation('gn_shifts', shiftId, 'update', data)}
          />
        ) : (
          <EmployeeDashboard 
            shifts={shifts} 
            employees={employees} 
            currentUser={currentUser} 
            clients={clients} 
            expenses={expenses} 
            onAddExpense={(d) => runMutation('gn_expenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'pending' })} 
            clientExpenses={clientExpenses} 
            onAddClientExpense={async (d, file) => {
              let url = d.receiptUrl || '';
              if (file) url = await handleFileUpload(file, 'receipts');
              runMutation('gn_clientExpenses', Date.now().toString(), 'set', { ...d, id: Date.now().toString(), status: 'pending', receiptUrl: url });
            }}
            paystubs={paystubs} 
            timeOffLogs={timeOffLogs} 
            messages={messages} 
            documents={documents} 
            
            onSendMessage={(text, senderId, isHighPriority) => runMutation('gn_messages', Date.now().toString(), 'set', { id: Date.now().toString(), text, senderId, date: new Date().toISOString(), isHighPriority: !!isHighPriority, acknowledgements: [] })} 
            onDeleteMessage={(id) => runMutation('gn_messages', id, 'delete')}
            onAcknowledgeMessage={handleAcknowledgeMessage}
            announcementPictureUrl={announcementPictureUrl}
            onUpdateAnnouncementPicture={handleUpdateAnnouncementPicture}

            payPeriodStart={payPeriodStart} 
            isBonusActive={isBonusActive} 
            bonusSettings={bonusSettings} 
            onPickupShift={(shiftId, empId) => runMutation('gn_shifts', shiftId, 'update', { employeeId: empId })} 
            setSelectedClient={setSelectedClient}
            getClientRemainingBalance={getClientRemainingBalance}
            onUpdateProfile={async (id, d, file) => {
              const existingEmp = employees.find(e => e.id === id);
              let url = d.photoUrl || existingEmp?.photoUrl || '';
              if (file) {
                const newUrl = await handleFileUpload(file, 'avatars');
                if (newUrl) url = newUrl;
              }
              const updatedData = { ...d, photoUrl: url };
              runMutation('gn_employees', id, 'update', updatedData);
              setCurrentUser(prev => ({ ...prev, ...updatedData })); 
            }}
            onEmployeeFileUpload={async (employeeId, file) => {
              if (!file) return;
              const url = await handleFileUpload(file, 'documents');
              if (!url) return;
              const existingEmp = employees.find(e => e.id === employeeId);
              const currentUploads = existingEmp?.uploadedFiles || [];
              const newFileRecord = { name: file.name, url: url, date: new Date().toISOString() };
              runMutation('gn_employees', employeeId, 'update', { uploadedFiles: [...currentUploads, newFileRecord] });
              setCurrentUser(prev => ({ ...prev, uploadedFiles: [...currentUploads, newFileRecord] }));
            }}
            onAddTimeOff={(req) => runMutation('gn_timeOffLogs', req.id, 'set', { ...req, status: 'pending', dateSubmitted: new Date().toISOString() })}
            onRequestShiftCancel={(shiftId, reason) => runMutation('gn_shifts', shiftId, 'update', { cancelRequest: { pending: true, reason } })}
            
            kudos={kudos}
            prizes={prizes}
            onAcknowledgeReward={handleAcknowledgeReward}
            
            // --- TIMECLOCK HOOK ---
            onUpdateShift={(shiftId, data) => runMutation('gn_shifts', shiftId, 'update', data)}
          />
        )}
      </main>

      {selectedClient && <ClientProfileModal client={selectedClient} remainingBalance={getClientRemainingBalance(selectedClient.id)} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}
