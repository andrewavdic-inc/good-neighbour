import React, { useState } from 'react';
import { 
  Heart, Menu, X, ArrowRight, MapPin, 
  Gift, Users, Coffee, TreePine, Stethoscope, 
  CheckCircle2, ShieldCheck, Sun,
  MessageCircle, Camera, Calendar, UserCircle, Bell, Sparkles,
  Info, Map, Clock, ChevronRight, CalendarHeart, ChevronLeft,
  Activity, FileText, Settings, Flower2, ShoppingBag, PenTool,
  Utensils, Ticket, Send, Phone, Mail, Loader2
} from 'lucide-react';

export default function App() {
  // --- BRANDED CREAM & BLUE LOGO ---
  const CorporateLogo = ({ className = "w-10 h-10" }) => (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="40" ry="40" fill="#FFFDD0" />
      <path d="M 100 170 C 100 170 30 115 30 65 C 30 35 55 20 80 20 C 92 20 100 30 100 30 C 100 30 108 20 120 20 C 145 20 170 35 170 65 C 170 115 100 170 100 170 Z" 
            fill="none" stroke="#003366" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 60 88 L 100 53 L 140 88" 
            fill="none" stroke="#003366" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 75 75 L 75 130 L 90 130 L 90 105 L 110 105 L 110 130 L 125 130 L 125 75" 
            fill="none" stroke="#003366" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [portalTab, setPortalTab] = useState('feed');
  const [messageInput, setMessageInput] = useState('');
  
  // --- NEW CONTACT FORM STATE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: ''
  });

  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Sarah Jenkins', role: 'staff', text: 'Hi David! Just an update that your mom and I had a wonderful time at the conservatory today. She was in great spirits!', time: 'Yesterday, 2:30 PM' },
    { id: 2, sender: 'You', role: 'user', text: 'That is so great to hear, Sarah! Did she enjoy the butterflies?', time: 'Yesterday, 3:00 PM' },
    { id: 3, sender: 'Sarah Jenkins', role: 'staff', text: 'She absolutely loved them. I uploaded some photos to the family feed! Also, just confirming we are still good for her cardiology follow-up on Monday?', time: 'Yesterday, 3:05 PM' }
  ]);

  // Smooth scroll handler
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    setChatMessages([...chatMessages, {
      id: Date.now(),
      sender: 'You',
      role: 'user',
      text: messageInput,
      time: 'Just now'
    }]);
    setMessageInput('');
  };

  // --- FORM HANDLERS ---
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Sync pricing button clicks with the new formData state
  const handleSelectPlan = (plan) => {
    setFormData(prev => ({ ...prev, service: plan }));
    scrollToSection('contact');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formEndpoint = 'https://formspree.io/f/mwvakjlb'; 

      const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert("Oops! There was a problem submitting your form");
      }
    } catch (error) {
      alert("Oops! There was a problem submitting your form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-[#003366] selection:text-white">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* --- NAVIGATION --- */}
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            <div className="flex items-center cursor-pointer group" onClick={() => scrollToSection('home')}>
              <CorporateLogo className="w-12 h-12 mr-3 drop-shadow-md transition-transform group-hover:scale-105" />
              <div className="flex flex-col justify-center">
                <span className="font-extrabold text-2xl leading-none text-[#003366] tracking-tight">Good Neighbour</span>
                <span className="font-bold text-xs leading-tight text-slate-500 uppercase tracking-widest mt-1">Niagara</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('home')} className="transition font-bold text-sm text-slate-600 hover:text-[#E11D48]">Home</button>
              <button onClick={() => scrollToSection('services')} className="transition font-bold text-sm text-slate-600 hover:text-[#E11D48]">Services</button>
              <button onClick={() => scrollToSection('pricing')} className="transition font-bold text-sm text-slate-600 hover:text-[#E11D48]">Pricing</button>
              <button onClick={() => scrollToSection('portal')} className="transition font-bold text-sm text-slate-600 hover:text-[#E11D48]">Client Portal</button>
              <button onClick={() => scrollToSection('contact')} className="bg-[#003366] hover:bg-[#E11D48] text-white px-7 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg text-sm">
                Request Assessment
              </button>
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#003366] p-2 hover:bg-slate-100 rounded-lg transition-colors">
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white pb-6 px-4 space-y-3 border-b border-slate-200 absolute w-full shadow-2xl z-50">
            <button onClick={() => scrollToSection('home')} className="block w-full text-left py-3 text-slate-800 hover:text-[#003366] font-bold border-b border-slate-50">Home</button>
            <button onClick={() => scrollToSection('services')} className="block w-full text-left py-3 text-slate-800 hover:text-[#003366] font-bold border-b border-slate-50">Services</button>
            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-3 text-slate-800 hover:text-[#003366] font-bold border-b border-slate-50">Pricing</button>
            <button onClick={() => scrollToSection('portal')} className="block w-full text-left py-3 text-slate-800 hover:text-[#003366] font-bold border-b border-slate-50">Client Portal</button>
            <button onClick={() => scrollToSection('contact')} className="block w-full text-center py-3 mt-4 bg-[#003366] text-white rounded-lg font-bold shadow-md">Request Assessment</button>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        
        {/* --- 1. HERO SECTION (Soft Cool Background) --- */}
        <section id="home" className="flex flex-col lg:flex-row min-h-[600px] bg-gradient-to-br from-slate-50 to-blue-50/50 pt-8 lg:pt-0 relative overflow-hidden">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl pointer-events-none"></div>

          <div className="w-full lg:w-1/2 p-8 md:p-16 lg:p-24 flex flex-col justify-center relative z-10">
            <div className="max-w-xl mx-auto lg:mr-0 lg:ml-auto w-full">
              <div className="inline-flex items-center space-x-2 bg-rose-100/80 border border-rose-200 text-rose-700 px-5 py-2 rounded-full text-xs font-extrabold mb-8 shadow-sm">
                <Heart className="w-4 h-4 fill-current" />
                <span className="uppercase tracking-wider">Combatting Senior Isolation</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
                Like Family.<br/>
                <span className="text-[#003366] bg-clip-text">Just down the street.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                Pair your loved one with a true friend in Niagara! We provide weekly visits filled with joyful outings, engaging activities, and wellness support. Get beautiful photo reports sent straight to your phone.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => scrollToSection('contact')} className="bg-[#E11D48] hover:bg-[#BE123C] text-white px-8 py-4 rounded-full font-bold text-base shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 text-center">
                  Meet Your Neighbour
                </button>
                <button onClick={() => scrollToSection('portal')} className="bg-white hover:bg-slate-50 text-[#003366] border-2 border-slate-200 px-8 py-4 rounded-full font-bold text-base shadow-sm hover:shadow-md transition-all text-center flex items-center justify-center group">
                  Explore the Portal <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-6 font-medium flex items-center">
                <Info className="w-4 h-4 mr-1.5 text-slate-400"/> Need flexibility? Ask about our on-demand Occasional Care.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2 relative min-h-[400px] lg:min-h-full mt-8 lg:mt-0">
            <img 
              src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&q=80" 
              alt="Caregiver and senior having coffee" 
              className="absolute inset-0 w-full h-full object-cover object-center lg:rounded-l-3xl shadow-2xl"
            />
          </div>
        </section>

        {/* --- 2. SERVICES SECTION (Crisp White Background) --- */}
        <section id="services" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Beyond Home Management</h2>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">
                Through our secure client portal, families don't just schedule visits—they curate comprehensive, vibrant care experiences.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Map className="w-8 h-8 text-sky-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Niagara Outings</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Our staff act as personal tour guides. Book trips to local wineries, the Falls, or scenic parks directly through your portal to keep them engaged with the community.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Wellness Companions</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  We handle the logistics of health. We will safely accompany your loved one to wellness appointments, therapies, and clinics, providing detailed notes afterwards.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Gift className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Concierge Gifting</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Can't be there for a special occasion? Order flowers or a gift basket in the portal; we deliver it personally with a transcribed handwritten card.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- 3. STAFFING SECTION (Warm Cream Background) --- */}
        <section className="py-24 bg-[#FFFAF0] border-y border-amber-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Who are our Good Neighbours?</h2>
                <p className="text-lg text-slate-700 leading-relaxed mb-8 font-medium">
                  They are your neighbours down the street. Our team is exceptionally diverse and rigorously vetted to ensure absolute safety and warmth. We actively match staff to clients based on personality, shared interests, and temperament.
                </p>
                <div className="bg-white p-8 rounded-3xl shadow-md border border-amber-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>
                  <div className="flex items-center space-x-4 mb-4 relative z-10">
                    <div className="bg-[#003366] p-3 rounded-xl shadow-md"><ShieldCheck className="w-6 h-6 text-white" /></div>
                    <h4 className="text-xl font-extrabold text-slate-900">Insurance Potential</h4>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed relative z-10">
                    Many of our dedicated Neighbours are <strong>registered Social Workers</strong>. Depending on your personal or family health benefits, our companionship and wellness services may be fully or partially covered.
                  </p>
                </div>
              </div>

              <div className="lg:w-1/2 w-full grid grid-cols-2 gap-6">
                <div className="space-y-6 mt-12">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80" alt="Smiling staff member" className="rounded-3xl shadow-lg w-full h-64 object-cover" />
                  <div className="bg-white p-6 rounded-3xl text-slate-900 shadow-md border border-slate-50 flex flex-col items-center text-center">
                    <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500" />
                    <p className="font-extrabold text-lg mb-1">Vetted</p>
                    <p className="text-slate-500 font-medium text-sm">Background checked & highly trained.</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl text-slate-900 shadow-md border border-slate-50 flex flex-col items-center text-center">
                    <Heart className="w-8 h-8 mb-3 text-rose-500" />
                    <p className="font-extrabold text-lg mb-1">Matched</p>
                    <p className="text-slate-500 font-medium text-sm">Paired for true, lasting friendship.</p>
                  </div>
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" alt="Friendly staff member" className="rounded-3xl shadow-lg w-full h-64 object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 4. PRICING SECTION (Dramatic Navy Header & White Background) --- */}
        <section id="pricing" className="py-24 bg-slate-50">
          <div className="bg-[#003366] py-24 rounded-t-[3rem] lg:rounded-t-[5rem] mx-4 sm:mx-6 lg:mx-8 px-4 text-center shadow-2xl relative overflow-hidden">
            {/* Subtle overlay pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">Transparent Pricing</h2>
              <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto">
                No hidden fees. Just exceptional care delivered on a schedule that works for your family.
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-6rem] relative z-20 pb-16">
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              
              {/* Pricing Card 1 */}
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col p-8 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Occasional Care</h3>
                <p className="text-slate-500 mb-6 font-medium">On-demand support when you need it.</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-slate-900">$0</span>
                  <span className="text-slate-500 font-bold"> / base fee</span>
                </div>
                <p className="text-base text-slate-600 mb-8 border-b border-slate-100 pb-8 leading-relaxed">
                  Perfect for unexpected errands, one-off appointments, or occasional companionship. <strong>Billed at $55 per hour.</strong>
                </p>
                <ul className="space-y-4 mb-8 flex-grow text-sm text-slate-700 font-medium">
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Full access to the Family Feed</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Book outings seamlessly</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> No minimum monthly commitment</li>
                </ul>
                <button onClick={() => handleSelectPlan('Occasional Care')} className="w-full py-4 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors">
                  Inquire Now
                </button>
              </div>

              {/* Pricing Card 2 (Popular) */}
              <div className="bg-gradient-to-b from-[#003366] to-[#02244a] rounded-3xl shadow-2xl flex flex-col p-8 transform md:-translate-y-6 relative border border-[#004080]">
                <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[#E11D48] text-white text-xs font-black uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                  Most Popular
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2">Weekly Connection</h3>
                <p className="text-blue-200 mb-6 font-medium">Consistent, dedicated weekly support.</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-white">$145</span>
                  <span className="text-blue-200 font-bold"> / week</span>
                </div>
                <p className="text-base text-blue-50 mb-8 border-b border-blue-800 pb-8 leading-relaxed">
                  <strong>One dedicated 3-hour visit per week.</strong> Ideal for maintaining routines and regular social engagement.
                </p>
                <ul className="space-y-4 mb-8 flex-grow text-sm text-blue-50 font-medium">
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-400 mr-3 flex-shrink-0" /> Full access to the Family Feed</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-400 mr-3 flex-shrink-0" /> Same dedicated, matched Neighbour</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-400 mr-3 flex-shrink-0" /> Curated weekly activities</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-400 mr-3 flex-shrink-0" /> Detailed photo reports</li>
                </ul>
                <button onClick={() => handleSelectPlan('Weekly Connection')} className="w-full py-4 rounded-xl bg-[#E11D48] text-white font-bold hover:bg-[#BE123C] transition-colors shadow-lg shadow-rose-900/50">
                  Choose Weekly
                </button>
              </div>

              {/* Pricing Card 3 */}
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col p-8 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Complete Comfort</h3>
                <p className="text-slate-500 mb-6 font-medium">Maximum support and proactive care.</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-slate-900">$280</span>
                  <span className="text-slate-500 font-bold"> / week</span>
                </div>
                <p className="text-base text-slate-600 mb-8 border-b border-slate-100 pb-8 leading-relaxed">
                  <strong>Two dedicated 3-hour visits per week.</strong> The ultimate peace of mind for families wanting comprehensive support.
                </p>
                <ul className="space-y-4 mb-8 flex-grow text-sm text-slate-700 font-medium">
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Full access to the Family Feed</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Everything in Weekly</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Multi-day errand coordination</li>
                  <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-sky-500 mr-3 flex-shrink-0" /> Priority scheduling</li>
                </ul>
                <button onClick={() => handleSelectPlan('Complete Comfort')} className="w-full py-4 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors">
                  Choose Complete
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* --- 5. PORTAL DEMO SECTION (Dark Frame Background) --- */}
        <section id="portal" className="py-24 bg-slate-900 relative">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 text-center mb-16 relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Sneak Peek: The Client Portal</h2>
            <p className="text-lg text-slate-300 font-medium">
              Manage your schedule, view visit reports, and curate experiences securely online. Explore the interactive demo below.
            </p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* The "App Screen" Wrapper */}
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700 flex flex-col md:flex-row bg-white h-[750px]">
              
              {/* Sidebar */}
              <div className="w-full md:w-72 bg-[#F8FAFC] border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
                <div className="p-6 border-b border-slate-200 bg-white">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#003366] to-blue-800 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md">DV</div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Family Account</p>
                      <p className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">David Vance</p>
                      <p className="text-[11px] text-[#003366] font-bold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-md">Care for: Eleanor</p>
                    </div>
                  </div>
                </div>
                <div className="py-6 flex-grow space-y-2 px-4">
                  <button onClick={() => setPortalTab('feed')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm ${portalTab === 'feed' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <Activity className="w-4 h-4" /><span>Family Feed</span>
                  </button>
                  <button onClick={() => setPortalTab('outings')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm ${portalTab === 'outings' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <Map className="w-4 h-4" /><span>Excursions</span>
                  </button>
                  <button onClick={() => setPortalTab('calendar')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm ${portalTab === 'calendar' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <Calendar className="w-4 h-4" /><span>Schedule</span>
                  </button>
                  <button onClick={() => setPortalTab('messages')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm flex justify-between ${portalTab === 'messages' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <div className="flex items-center space-x-3"><MessageCircle className="w-4 h-4" /><span>Messages</span></div>
                    {portalTab !== 'messages' && <span className="bg-[#E11D48] text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>}
                  </button>
                  <button onClick={() => setPortalTab('team')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm ${portalTab === 'team' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <Users className="w-4 h-4" /><span>Care Team</span>
                  </button>
                  <button onClick={() => setPortalTab('gifts')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm ${portalTab === 'gifts' ? 'bg-[#003366] text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}>
                    <Gift className="w-4 h-4" /><span>Send a Gift</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-slate-50 flex flex-col relative overflow-hidden">
                {/* Top Bar */}
                <div className="h-20 border-b border-slate-200 flex items-center justify-between px-8 z-20 shrink-0 bg-white shadow-sm">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {portalTab === 'feed' && "Recent Updates"}
                    {portalTab === 'outings' && "The Excursion Desk"}
                    {portalTab === 'calendar' && "Schedule & Appointments"}
                    {portalTab === 'messages' && "Messages"}
                    {portalTab === 'team' && "Your Care Team"}
                    {portalTab === 'gifts' && "Concierge Gifting"}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#003366] hover:bg-slate-200 transition-colors relative">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E11D48] rounded-full border-2 border-white"></span>
                    </button>
                  </div>
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 hide-scrollbar">
                  
                  {portalTab === 'feed' && (
                    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4 mb-5">
                          <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" alt="Sarah" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">Sarah Jenkins <span className="text-[10px] text-[#003366] font-bold ml-2 bg-blue-50 px-2.5 py-1 rounded-md uppercase">Neighbour</span></p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Today, 3:15 PM</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-5">
                          <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-4 h-4 mr-1.5"/> Insight Log</p>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            I had the best time with Eleanor today! We got to talking about her childhood, and she told me all about the bakery her family used to run on West Street back in the 60s. We decided to spend the afternoon baking her original handwritten recipe for butter tarts. The house smells amazing!
                          </p>
                        </div>
                        <div className="w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 mb-5">
                          <img src="https://images.unsplash.com/photo-1509668521825-63200a0ae0db?auto=format&fit=crop&w=800&q=80" alt="Baking together" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <span className="text-xs font-bold text-slate-500 flex items-center"><ShoppingBag className="w-4 h-4 mr-1.5 text-slate-400"/> Expenses Logged</span>
                          <span className="text-sm font-black text-slate-900">$14.50 <span className="text-xs font-medium text-slate-500 ml-1">(Baking Ingredients)</span></span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-blue-200">
                          <CalendarHeart className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex-1 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                          <p className="text-sm font-extrabold text-slate-900 mb-1">Service Booked: Lunch at the Cafe</p>
                          <p className="text-xs text-slate-600">Family Member <strong className="text-slate-900">David Vance</strong> scheduled an outing.</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">Today, 10:00 AM</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center space-x-4">
                            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" alt="Sarah" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">Sarah Jenkins <span className="text-[10px] text-[#003366] font-bold ml-2 bg-blue-50 px-2.5 py-1 rounded-md uppercase">Neighbour</span></p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Yesterday, 4:30 PM</p>
                            </div>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5"/> Completed</span>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-5">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center"><Map className="w-4 h-4 mr-1.5"/> Butterfly Conservatory</p>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            We had a wonderful time at the conservatory today! Eleanor absolutely loved seeing the blue morpho butterflies. We walked the entire garden path at a gentle pace, and her mobility was excellent. 
                          </p>
                        </div>
                        <div className="w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 mb-5">
                          <img src="https://images.unsplash.com/photo-1588615419958-8868c22223a5?auto=format&fit=crop&w=800&q=80" alt="Butterflies" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <span className="text-xs font-bold text-slate-500 flex items-center"><ShoppingBag className="w-4 h-4 mr-1.5 text-slate-400"/> Expenses Logged</span>
                          <span className="text-sm font-black text-slate-900">$35.00 <span className="text-xs font-medium text-slate-500 ml-1">(2x Admission)</span></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {portalTab === 'outings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                        <div className="h-48 relative overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1588615419958-8868c22223a5?auto=format&fit=crop&w=600&q=80" alt="Botanical Gardens" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 flex items-center uppercase tracking-wider">
                            <Flower2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500"/> Niagara Outing
                          </div>
                        </div>
                        <div className="p-6 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="text-xl font-extrabold text-slate-900 mb-2">Butterfly Conservatory</h4>
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">A gentle, warm, guided stroll through the beautiful gardens and conservatory with their dedicated Neighbour.</p>
                          </div>
                          <button className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#002244] transition-colors shadow-sm">Book Excursion</button>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                        <div className="h-48 relative overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" alt="Cafe" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 flex items-center uppercase tracking-wider">
                            <Coffee className="w-3.5 h-3.5 mr-1.5 text-amber-500"/> Local Eats
                          </div>
                        </div>
                        <div className="p-6 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="text-xl font-extrabold text-slate-900 mb-2">Lunch at the Cafe</h4>
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">A reservation for two at a favourite local Port Colborne cafe for a change of scenery and a great meal.</p>
                          </div>
                          <button className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#002244] transition-colors shadow-sm">Book Excursion</button>
                        </div>
                      </div>

                      {/* Live Portal Callout Banner */}
                      <div className="col-span-1 lg:col-span-2 mt-4 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500"></div>
                        <h4 className="font-black text-slate-900 mb-3 flex items-center justify-center text-xl tracking-tight">
                          <Sparkles className="w-6 h-6 mr-2 text-indigo-500" /> Dozens More in the Live Portal
                        </h4>
                        <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed font-medium">
                          This demo shows just a few examples. When you join Good Neighbour, you'll gain access to our full, ever-changing catalog of seasonal Niagara excursions, local events, and wellness clinics.
                        </p>
                      </div>
                    </div>
                  )}

                  {portalTab === 'calendar' && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                      <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-slate-900 text-2xl tracking-tight">October 2026</h4>
                        <div className="flex space-x-2">
                          <button className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
                          <button className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
                        </div>
                      </div>
                      <div className="overflow-x-auto hide-scrollbar">
                        <div className="min-w-[800px]">
                          <div className="grid grid-cols-7 gap-3 mb-3">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center font-black text-slate-400 text-[10px] uppercase tracking-widest">{day}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-3">
                            {Array.from({ length: 35 }, (_, i) => {
                              const date = i - 3; 
                              if (date < 1 || date > 31) {
                                return <div key={i} className="min-h-[100px] p-3 rounded-xl bg-slate-50/50"></div>;
                              }
                              const isWeekly = [7, 14, 21, 28].includes(date);
                              const isExcursion = date === 10;
                              const isMedical = date === 19;
                              const isCoffee = date === 24;

                              return (
                                <div key={i} className={`min-h-[100px] p-3 rounded-xl border transition-colors ${isWeekly ? 'border-sky-200 bg-sky-50/50 hover:bg-sky-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                  <span className={`text-sm font-black block mb-2 ${isWeekly ? 'text-sky-700' : 'text-slate-700'}`}>{date}</span>
                                  <div className="space-y-2">
                                    {isWeekly && (
                                      <div className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-[#003366] text-white flex items-center shadow-sm">
                                        <Heart className="w-3 h-3 mr-1.5 shrink-0 text-rose-400"/> Visit (1pm)
                                      </div>
                                    )}
                                    {isExcursion && (
                                      <div className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center border border-emerald-200">
                                        <Map className="w-3 h-3 mr-1.5 shrink-0"/> Conservatory
                                      </div>
                                    )}
                                    {isMedical && (
                                      <div className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-rose-100 text-rose-700 flex items-center border border-rose-200">
                                        <Stethoscope className="w-3 h-3 mr-1.5 shrink-0"/> Cardiology
                                      </div>
                                    )}
                                    {isCoffee && (
                                      <div className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 flex items-center border border-amber-200">
                                        <Coffee className="w-3 h-3 mr-1.5 shrink-0"/> Cafe Lunch
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {portalTab === 'messages' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[550px] animate-in fade-in duration-300 max-w-4xl mx-auto">
                      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" alt="Sarah Jenkins" className="w-12 h-12 rounded-full object-cover border-2 border-slate-100" />
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">Sarah Jenkins</h4>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Online</p>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-2"><Info className="w-5 h-5"/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] md:max-w-[65%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user' ? 'bg-[#003366] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                              <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                              <p className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-full p-1 pl-4 focus-within:border-[#003366] focus-within:ring-1 focus-within:ring-[#003366] transition-all">
                          <input 
                            type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message to Sarah..." 
                            className="flex-1 bg-transparent text-sm focus:outline-none font-medium text-slate-700"
                          />
                          <button type="submit" disabled={!messageInput.trim()} className="w-12 h-12 bg-[#E11D48] text-white rounded-full flex items-center justify-center hover:bg-[#BE123C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md">
                            <Send className="w-5 h-5 ml-1" />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {portalTab === 'team' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                      <div className="h-40 bg-gradient-to-r from-[#003366] to-[#023E8A] relative">
                        <div className="absolute top-4 right-4 flex space-x-2">
                          <span className="bg-white/20 text-white backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Cleared</span>
                          <span className="bg-white/20 text-white backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center"><Heart className="w-3.5 h-3.5 mr-1.5" /> CPR</span>
                        </div>
                        <div className="absolute -bottom-16 left-8">
                          <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80" alt="Sarah Jenkins" className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg" />
                        </div>
                      </div>
                      
                      <div className="pt-20 p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                          <div>
                            <h4 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">Sarah Jenkins</h4>
                            <p className="text-[#003366] font-bold text-sm bg-blue-50 inline-block px-3 py-1 rounded-lg">Primary Neighbour / Reg. Social Worker</p>
                          </div>
                          <div className="flex space-x-3 w-full md:w-auto">
                            <button onClick={() => setPortalTab('messages')} className="flex-1 md:flex-none bg-[#E11D48] text-white hover:bg-[#BE123C] px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center shadow-md transition-all hover:-translate-y-0.5">
                              <MessageCircle className="w-4 h-4 mr-2" /> Send Message
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          <div className="lg:col-span-2 space-y-8">
                            <div>
                              <h5 className="font-black text-slate-900 mb-3 flex items-center text-sm uppercase tracking-widest"><Info className="w-5 h-5 mr-2 text-[#003366]"/> About Sarah</h5>
                              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                Hi! I've lived in the Niagara region my entire life. I spent 15 years working in clinical social work before realizing my true passion is proactive, in-home community care. I believe that aging gracefully means staying connected to the community and finding joy in everyday moments.
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100">
                                <h6 className="font-black text-slate-900 text-xs mb-4 flex items-center uppercase tracking-widest"><Heart className="w-4 h-4 mr-2 text-rose-500"/> Personal Interests</h6>
                                <ul className="text-slate-600 text-sm space-y-3 font-medium">
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-rose-300"/> Tending to my garden</li>
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-rose-300"/> Hiking the Bruce Trail</li>
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-rose-300"/> Baking butter tarts</li>
                                </ul>
                              </div>
                              <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
                                <h6 className="font-black text-slate-900 text-xs mb-4 flex items-center uppercase tracking-widest"><MapPin className="w-4 h-4 mr-2 text-sky-500"/> Favourite Spots</h6>
                                <ul className="text-slate-600 text-sm space-y-3 font-medium">
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-sky-300"/> Farmers Market</li>
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-sky-300"/> Butterfly Conservatory</li>
                                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-sky-300"/> Minor Bros Garden Centre</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner">
                              <h5 className="font-black text-slate-900 mb-6 flex items-center text-sm uppercase tracking-widest"><UserCircle className="w-5 h-5 mr-2 text-[#003366]"/> Contact Info</h5>
                              <div className="space-y-5">
                                <div className="flex items-start space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                    <Phone className="w-4 h-4 text-[#003366]" />
                                  </div>
                                  <div className="pt-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Direct Line</p>
                                    <p className="text-sm font-bold text-slate-900 hover:text-[#003366] cursor-pointer transition-colors">(905) 555-0198</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-[#003366]" />
                                  </div>
                                  <div className="pt-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                                    <p className="text-sm font-bold text-slate-900 hover:text-[#003366] cursor-pointer transition-colors break-all">sarah.j@goodneighbour.ca</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4 text-[#003366]" />
                                  </div>
                                  <div className="pt-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Typical Hours</p>
                                    <p className="text-sm font-bold text-slate-900">Mon-Fri, 9am - 5pm</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5">
                              <p className="text-xs text-amber-800 leading-relaxed font-medium flex items-start">
                                <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-amber-600"/>
                                For urgent matters outside of scheduled visits, please contact the main Good Neighbour office at (905) 555-0100.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {portalTab === 'gifts' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="bg-[#FFFDD0] rounded-3xl p-8 shadow-sm border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
                        <div className="flex items-start space-x-5 relative z-10">
                          <div className="w-14 h-14 bg-white text-[#003366] rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                            <PenTool className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-black text-2xl text-slate-900 tracking-tight">Just a Note</h4>
                              <span className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full">Free</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed max-w-xl font-medium">
                              Type out a message here in the portal, and we will transcribe it into a beautiful, handwritten greeting card to deliver at our next visit. Sometimes, a few words are the best gift.
                            </p>
                          </div>
                        </div>
                        <button className="w-full md:w-auto shrink-0 bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-xl font-bold text-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative z-10">
                          Draft Message
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                          <div className="h-48 relative overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=600&q=80" alt="Flowers" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 flex items-center uppercase tracking-wider">
                              <Flower2 className="w-3.5 h-3.5 mr-1.5 text-rose-500"/> Local Florist
                            </div>
                          </div>
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-extrabold text-slate-900 text-xl leading-tight tracking-tight">Seasonal Blooms</h4>
                                <span className="font-black text-[#003366] text-xl">$45</span>
                              </div>
                              <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">A vibrant, fresh arrangement sourced directly from our favourite local florist in Port Colborne.</p>
                            </div>
                            <button className="w-full bg-[#003366] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#002244] transition-colors shadow-sm">Select & Write Card</button>
                          </div>
                        </div>

                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                          <div className="h-48 relative overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80" alt="Bakery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 flex items-center uppercase tracking-wider">
                              <Coffee className="w-3.5 h-3.5 mr-1.5 text-amber-600"/> Bakery
                            </div>
                          </div>
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-extrabold text-slate-900 text-xl leading-tight tracking-tight">Artisan Treats</h4>
                                <span className="font-black text-[#003366] text-xl">$35</span>
                              </div>
                              <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">A delightful box of fresh scones, tarts, and cookies paired with premium loose-leaf tea.</p>
                            </div>
                            <button className="w-full bg-[#003366] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#002244] transition-colors shadow-sm">Select & Write Card</button>
                          </div>
                        </div>

                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                          <div className="h-48 relative overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80" alt="Tea and Book" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 flex items-center uppercase tracking-wider">
                              <Gift className="w-3.5 h-3.5 mr-1.5 text-purple-500"/> Care Package
                            </div>
                          </div>
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-extrabold text-slate-900 text-xl leading-tight tracking-tight">Cozy Afternoon</h4>
                                <span className="font-black text-[#003366] text-xl">$60</span>
                              </div>
                              <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">A best-selling large-print novel, a warm fleece throw blanket, and a box of gourmet hot chocolate.</p>
                            </div>
                            <button className="w-full bg-[#003366] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#002244] transition-colors shadow-sm">Select & Write Card</button>
                          </div>
                        </div>

                        {/* Live Portal Callout Banner */}
                        <div className="col-span-1 md:col-span-3 mt-4 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-orange-400"></div>
                          <h4 className="font-black text-slate-900 mb-3 flex items-center justify-center text-xl tracking-tight">
                            <Sparkles className="w-6 h-6 mr-2 text-rose-500" /> Expanded Gift Catalog
                          </h4>
                          <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed font-medium">
                            The live portal features a constantly updating selection of local artisanal gifts, seasonal flowers, and custom care packages tailored specifically for your loved one.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 6. CONTACT SECTION (Pure White) --- */}
        <section id="contact" className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Ready to Meet Your Neighbour?</h2>
            <p className="text-lg text-slate-600 mb-12 leading-relaxed font-medium">
              We provide free, no-obligation assessments to ensure the perfect fit for your family. Get in touch with us today.
            </p>
            
            {isSubmitted ? (
              <div className="max-w-2xl mx-auto bg-emerald-50 p-10 rounded-3xl border border-emerald-100 text-center shadow-lg shadow-emerald-100/50 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">Request Received!</h3>
                <p className="text-slate-600 font-medium text-lg mb-8">
                  Thank you for reaching out. We will review your details and contact you shortly to schedule your free assessment.
                </p>
                <button onClick={() => setIsSubmitted(false)} className="text-[#003366] font-bold hover:underline">
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto space-y-6 text-left bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#003366] to-[#E11D48]"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Your Name</label>
                    <input 
                      type="text" name="name" value={formData.name} onChange={handleFormChange}
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all font-medium" 
                      placeholder="Jane Doe" required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
                    <input 
                      type="email" name="email" value={formData.email} onChange={handleFormChange}
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all font-medium" 
                      placeholder="jane@example.com" required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Phone Number</label>
                    <input 
                      type="tel" name="phone" value={formData.phone} onChange={handleFormChange}
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all font-medium" 
                      placeholder="(555) 123-4567" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Service of Interest</label>
                    <select 
                      name="service"
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all font-medium appearance-none cursor-pointer"
                      value={formData.service}
                      onChange={handleFormChange}
                    >
                      <option value="">Select a service...</option>
                      <option value="Occasional Care">Occasional Care</option>
                      <option value="Weekly Connection">Weekly Connection</option>
                      <option value="Complete Comfort">Complete Comfort</option>
                      <option value="Not Sure Yet">Not Sure Yet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Tell us about your loved one's needs (Optional)</label>
                  <textarea 
                    name="message" value={formData.message} onChange={handleFormChange}
                    rows="4" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all font-medium resize-none" 
                    placeholder="Any specific requirements, interests, or schedule preferences..."
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#003366] text-white py-4.5 rounded-xl font-bold text-lg hover:bg-[#002244] transition-all shadow-xl shadow-[#003366]/20 mt-4 hover:-translate-y-0.5 pt-4 pb-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</span>
                  ) : (
                    "Request Free Assessment"
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-20 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-16">
          <div>
            <div className="flex items-center mb-6">
              <CorporateLogo className="w-12 h-12 mr-4 opacity-90" />
              <span className="font-black text-3xl text-white tracking-tight">Good Neighbour</span>
            </div>
            <p className="text-sm leading-relaxed mb-6 text-slate-400 font-medium max-w-sm">
              Comprehensive home & personal management for seniors in the Niagara region. Reassurance for you, independence for them.
            </p>
          </div>
          <div className="md:pl-12">
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-sm">Quick Links</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors">Home</button></li>
              <li><button onClick={() => scrollToSection('services')} className="hover:text-white transition-colors">Services</button></li>
              <li><button onClick={() => scrollToSection('portal')} className="hover:text-white transition-colors">Client Portal</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-sm">Contact Us</h4>
            <div className="space-y-4 text-sm font-bold">
              <p className="flex items-center"><MapPin className="w-5 h-5 mr-3 text-slate-500" /> Port Colborne, Niagara Region</p>
              <p className="flex items-center"><Heart className="w-5 h-5 mr-3 text-rose-500" /> hello@goodneighbourcare.ca</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}