import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import {
    Search, CheckCircle, XCircle, Clock, AlertTriangle,
    ExternalLink, LogOut, Loader2, RefreshCw, Copy
} from 'lucide-react';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_KEY
);

export default function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');
    const navigate = useNavigate();

    // 1. Cek Login
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) navigate('/login');
        };
        checkSession();
    }, []);

    // 2. Fetch Data & Realtime
    useEffect(() => {
        fetchOrders();

        // Realtime Listener (Pesanan masuk langsung muncul)
        const channel = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                // Simple reload for MVP robustness
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false }); // Urutkan terbaru

        if (error) console.error(error);
        if (data) setOrders(data);
        setLoading(false);
    };

    // 3. Fungsi Update Status
    const updateStatus = async (id, newStatus) => {
        if (!confirm(`Ubah status menjadi ${newStatus}?`)) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (err) {
            alert("Gagal update: " + err.message);
        }
    };

    // 4. Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // 5. Filtering Logic
    const filteredOrders = orders.filter(order => {
        const matchSearch =
            order.roblox_username.toLowerCase().includes(search.toLowerCase()) ||
            order.id.includes(search);
        const matchFilter = filter === 'ALL' || order.status === filter;
        return matchSearch && matchFilter;
    });

    // Helper Warna Status
    const getStatusBadge = (status) => {
        const styles = {
            'PENDING_PEMBAYARAN': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
            'PENGECEKAN_GAMEPASS': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            'SUKSES': 'bg-green-500/10 text-green-400 border-green-500/30',
            'GAGAL': 'bg-red-500/10 text-red-500 border-red-500/30',
        };
        return styles[status] || 'bg-gray-500/10 text-gray-400';
    };

    return (
        <div className="min-h-screen bg-brand-navy text-white p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-gray-400 text-sm">Kelola pesanan Robux</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition">
                    <LogOut size={16} /> Logout
                </button>
            </div>

            {/* FILTER & SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cari Username / Order ID..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 focus:outline-none focus:border-brand-pink"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="ALL">Semua Status</option>
                    <option value="PENGECEKAN_GAMEPASS">Siap Proses</option>
                    <option value="SUKSES">Sukses</option>
                    <option value="PENDING_PEMBAYARAN">Belum Bayar</option>
                    <option value="GAGAL">Gagal</option>
                </select>
                <button onClick={fetchOrders} className="bg-brand-blue/20 p-3 rounded-xl hover:bg-brand-blue/30">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-gray-400 text-sm uppercase">
                            <th className="p-4">Info Order</th>
                            <th className="p-4">Roblox User</th>
                            <th className="p-4">Gamepass (Wajib Cek)</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading && <tr><td colSpan="5" className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>}

                        {!loading && filteredOrders.map((order) => {
                            // WARNING LOGIC: Cek Harga Gamepass
                            const expectedPrice = Math.ceil(order.robux_amount / 0.7);
                            const isPriceMismatch = order.gamepass_price !== expectedPrice;

                            return (
                                <tr key={order.id} className="hover:bg-white/5 transition">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs text-gray-500 flex items-center gap-1 cursor-pointer" title="Copy ID" onClick={() => navigator.clipboard.writeText(order.id)}>
                                                {order.id.slice(0, 8)}... <Copy size={10} />
                                            </span>
                                            <span className="font-bold text-white text-lg">{order.robux_amount} R$</span>
                                            <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</span>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                                                {/* UPDATE DISINI: Gunakan link ke backend kita sendiri */}
                                                <img
                                                    src={`/api/proxy/avatar/${order.roblox_user_id}`}
                                                    alt="avatar"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-brand-pink">{order.roblox_username}</p>
                                                <p className="text-xs text-gray-400">ID: {order.roblox_user_id}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <a
                                                href={order.gamepass_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-blue hover:text-white text-sm flex items-center gap-1 font-bold"
                                            >
                                                Buka Link <ExternalLink size={14} />
                                            </a>

                                            {/* HARGA DATABASE */}
                                            <div className="text-xs text-gray-400">
                                                Db Price: <span className="text-white">{order.gamepass_price} R$</span>
                                            </div>

                                            {/* WARNING JIKA HARGA GAMEPASS USER SALAH SETTING */}
                                            {isPriceMismatch && (
                                                <div className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded">
                                                    <AlertTriangle size={12} />
                                                    <span>Harusnya: {expectedPrice} R$</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(order.status)}`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>

                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.status === 'PENGECEKAN_GAMEPASS' && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'SUKSES')}
                                                        title="Tandai Sukses (Sudah dikirim)"
                                                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'GAGAL')}
                                                        title="Tandai Gagal (Ada masalah)"
                                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </>
                                            )}

                                            {order.status === 'PENDING_PEMBAYARAN' && (
                                                <span className="text-xs text-gray-600 italic">Menunggu bayar...</span>
                                            )}

                                            {(order.status === 'SUKSES' || order.status === 'GAGAL') && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'PENGECEKAN_GAMEPASS')}
                                                    className="text-xs text-gray-500 hover:text-white underline"
                                                >
                                                    Revisi
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {!loading && filteredOrders.length === 0 && (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">Tidak ada data ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}