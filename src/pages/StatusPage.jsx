import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Loader2, MessageCircle } from 'lucide-react';

// Pastikan URL dan Key Supabase ada di .env
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function StatusPage() {
  const [username, setUsername] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ambil Nomor WA dari .env
  const CS_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER; 

  // Fetch initial data
  const fetchOrders = async () => {
    if(!username) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('roblox_username', username)
      .order('created_at', { ascending: false });
    
    if(data) setOrders(data);
    setLoading(false);
  };

  // Realtime Subscription
  useEffect(() => {
    if (!username) return;

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `roblox_username=eq.${username}` }, (payload) => {
        setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [username]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING_PEMBAYARAN': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'PENGECEKAN_GAMEPASS': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'SUKSES': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'GAGAL': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  // --- LOGIC KIRIM WA ---
  const handleContactCS = (orderId, status) => {
    if (!CS_NUMBER) {
        alert("Nomor CS belum dikonfigurasi di .env");
        return;
    }

    // Format Pesan: Order ID + Pesan Kendala
    const message = `Order ID: ${orderId}\nStatus: ${status}\n\nHalo admin, saya ada kendala dengan pesanan ini. Mohon dibantu.`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${CS_NUMBER}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto pb-20">
       <h1 className="text-2xl font-bold mb-6 text-center text-white">Lacak Pesanan</h1>
       
       {/* SEARCH BAR */}
       <div className="flex gap-2 mb-8">
          <input 
            type="text" 
            placeholder="Masukkan Username Roblox..." 
            className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-pink text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
          />
          <button 
            onClick={fetchOrders} 
            disabled={loading}
            className="bg-brand-pink text-brand-navy font-bold p-3 rounded-xl hover:bg-white hover:shadow-[0_0_15px_rgba(216,167,208,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
       </div>

       {/* LIST ORDERS */}
       <div className="space-y-4">
         {orders.map((order) => (
           <div key={order.id} className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col gap-3 hover:bg-white/10 transition-colors">
             
             {/* BAGIAN ATAS: INFO & STATUS */}
             <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg text-white">{order.robux_amount} Robux</p>
                  <p className="text-xs text-gray-400 mt-1">ID: <span className="font-mono">{order.id.slice(0, 8)}...</span></p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>

                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusColor(order.status)} uppercase tracking-wider`}>
                  {order.status.replace(/_/g, ' ')}
                </div>
             </div>

             {/* BAGIAN BAWAH: TOMBOL BANTUAN (SELALU MUNCUL) */}
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

         {orders.length === 0 && username && !loading && (
            <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                <p>Belum ada pesanan untuk username ini.</p>
            </div>
         )}
       </div>
    </div>
  );
}