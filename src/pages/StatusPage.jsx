import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; // Kita butuh axios untuk cek avatar user
import { 
  Search, Loader2, MessageCircle, User, 
  ChevronRight, ArrowLeft, History, PackageOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Konfigurasi Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function StatusPage() {
  // State Input
  const [usernameInput, setUsernameInput] = useState('');
  
  // State Data
  const [userProfile, setUserProfile] = useState(null); // Data user roblox (avatar, id, name)
  const [orders, setOrders] = useState([]);
  
  // State Loading & View
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [viewMode, setViewMode] = useState('search'); // 'search' | 'profile' | 'history'

  const CS_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER; 
  const API_URL = '/api'; // Backend Vercel

  // 1. CARI USER ROBLOX (Verifikasi dulu biar keren)
  const handleSearchUser = async () => {
    if(!usernameInput) return;
    setLoadingSearch(true);
    setUserProfile(null);

    try {
        // Tembak ke backend kita untuk verify user & dapat avatar
        const res = await axios.post(`${API_URL}/roblox/verify-user`, { username: usernameInput });
        setUserProfile(res.data);
        setViewMode('profile'); // Pindah ke tampilan profil
    } catch (err) {
        alert("Username Roblox tidak ditemukan!");
    } finally {
        setLoadingSearch(false);
    }
  };

  // 2. AMBIL DATA ORDERS (Setelah klik profil)
  const fetchHistory = async () => {
    if(!userProfile) return;
    
    setViewMode('history'); // Pindah ke tampilan history
    setLoadingOrders(true);

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('roblox_username', userProfile.username) // Filter by username yg valid
      .order('created_at', { ascending: false });
    
    if(data) setOrders(data);
    setLoadingOrders(false);
  };

  // 3. Realtime Subscription (Hanya jalan saat di mode history)
  useEffect(() => {
    if (viewMode !== 'history' || !userProfile) return;

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `roblox_username=eq.${userProfile.username}` }, (payload) => {
        setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewMode, userProfile]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING_PEMBAYARAN': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'PENGECEKAN_GAMEPASS': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'SUKSES': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'GAGAL': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  const handleContactCS = (orderId, status) => {
    if (!CS_NUMBER) return alert("Nomor CS belum disetting");
    const message = `Order ID: ${orderId}\nStatus: ${status}\n\nHalo admin, saya mau tanya soal pesanan ini.`;
    window.open(`https://wa.me/${CS_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- FUNGSI RESET (Tombol Back) ---
  const handleBack = () => {
      if (viewMode === 'history') setViewMode('profile');
      else if (viewMode === 'profile') {
          setViewMode('search');
          setUserProfile(null);
          setOrders([]);
          setUsernameInput('');
      }
  };

  return (
    <div className="max-w-xl mx-auto pb-20 min-h-[60vh]">
       
       {/* HEADER & BACK BUTTON */}
       <div className="flex items-center gap-3 mb-6 relative">
          {viewMode !== 'search' && (
              <button onClick={handleBack} className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/20 transition">
                  <ArrowLeft size={20} className="text-white"/>
              </button>
          )}
          <h1 className="text-2xl font-bold text-center w-full text-white">
              {viewMode === 'search' ? 'Lacak Pesanan' : 
               viewMode === 'profile' ? 'Profil Kamu' : 
               'Riwayat Transaksi'}
          </h1>
       </div>

       <AnimatePresence mode="wait">
           
           {/* VIEW 1: SEARCH */}
           {viewMode === 'search' && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                 className="flex flex-col gap-4"
               >
                   <div className="bg-brand-navy border border-brand-blue/30 p-8 rounded-3xl text-center shadow-lg">
                       <div className="w-20 h-20 bg-brand-pink/10 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Search className="w-10 h-10 text-brand-pink" />
                       </div>
                       <h2 className="text-lg font-bold text-white mb-2">Cek Status Top Up</h2>
                       <p className="text-brand-blue text-sm mb-6">Masukkan username Roblox kamu untuk melihat riwayat pembelian.</p>
                       
                       <div className="relative">
                           <input 
                               type="text" 
                               placeholder="Username Roblox..." 
                               className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-pink text-white text-lg placeholder:text-gray-500"
                               value={usernameInput}
                               onChange={(e) => setUsernameInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                           />
                           <User className="absolute left-4 top-4 text-gray-400" />
                       </div>

                       <button 
                           onClick={handleSearchUser} 
                           disabled={loadingSearch || !usernameInput}
                           className="w-full mt-4 bg-brand-pink text-brand-navy font-bold py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                       >
                           {loadingSearch ? <Loader2 className="animate-spin" /> : "Cari Akun"}
                       </button>
                   </div>
               </motion.div>
           )}

           {/* VIEW 2: PROFILE CARD (CONFIRMATION) */}
           {viewMode === 'profile' && userProfile && (
               <motion.div 
                 initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                 className="flex flex-col gap-4"
               >
                   <div className="bg-gradient-to-br from-brand-navy to-black border border-brand-blue/30 p-6 rounded-3xl shadow-xl text-center relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-24 bg-brand-pink/10"></div>
                       
                       <div className="relative z-10">
                           <img 
                             src={userProfile.avatar} 
                             alt="Avatar" 
                             className="w-24 h-24 rounded-full border-4 border-brand-navy mx-auto shadow-lg object-cover bg-gray-800"
                           />
                           <h2 className="text-2xl font-bold text-white mt-3">{userProfile.displayName}</h2>
                           <p className="text-brand-pink font-mono">@{userProfile.username}</p>
                           <p className="text-gray-500 text-xs mt-1">ID: {userProfile.id}</p>
                       </div>

                       <div className="mt-8">
                           <button 
                               onClick={fetchHistory}
                               className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-brand-pink hover:text-brand-navy hover:border-brand-pink transition-all flex items-center justify-center gap-2 group"
                           >
                               <History size={18} />
                               Lihat Riwayat Transaksi
                               <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                           </button>
                           
                           <button onClick={handleBack} className="mt-4 text-xs text-gray-500 hover:text-white underline">
                               Bukan akun ini? Cari lagi
                           </button>
                       </div>
                   </div>
               </motion.div>
           )}

           {/* VIEW 3: HISTORY LIST */}
           {viewMode === 'history' && (
               <motion.div 
                 initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
                 className="space-y-4"
               >
                 {loadingOrders ? (
                     <div className="text-center py-20"><Loader2 className="animate-spin mx-auto w-10 h-10 text-brand-pink"/></div>
                 ) : (
                     <>
                         {orders.map((order) => (
                           <div key={order.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 hover:bg-white/10 transition-colors">
                             <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-xl text-white flex items-center gap-2">
                                      <PackageOpen size={20} className="text-brand-pink"/> 
                                      {order.robux_amount} Robux
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg text-[10px] md:text-xs font-bold border ${getStatusColor(order.status)} uppercase`}>
                                  {order.status.replace(/_/g, ' ')}
                                </div>
                             </div>

                             <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-end">
                                <button 
                                    onClick={() => handleContactCS(order.id, order.status)}
                                    className="text-xs flex items-center gap-1.5 bg-white/5 text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                                >
                                    <MessageCircle size={14} />
                                    Ada masalah? Hubungi CS
                                </button>
                             </div>
                           </div>
                         ))}

                         {orders.length === 0 && (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <History className="text-gray-500 w-8 h-8"/>
                                </div>
                                <p className="text-gray-300 font-bold">Belum ada pesanan</p>
                                <p className="text-gray-500 text-xs mt-1">Akun ini belum pernah melakukan Top Up.</p>
                            </div>
                         )}
                     </>
                 )}
               </motion.div>
           )}

       </AnimatePresence>
    </div>
  );
}