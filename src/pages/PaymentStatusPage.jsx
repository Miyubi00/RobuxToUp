import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, Home, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentStatusPage({ status }) {
  // Ambil Order ID dari URL (Midtrans biasanya kirim ?order_id=...)
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || '-';

  // KONFIGURASI KONTEN BERDASARKAN STATUS
  const content = {
    success: {
      icon: <CheckCircle className="w-24 h-24 text-green-400" />,
      title: "Pembayaran Berhasil!",
      desc: "Terima kasih! Robux kamu sedang diproses oleh sistem kami.",
      color: "border-green-500/50 bg-green-500/10",
      textColor: "text-green-400",
      buttonText: "Lacak Pesanan",
      buttonLink: "/status",
      buttonIcon: <ArrowRight size={18} />
    },
    failed: {
      icon: <XCircle className="w-24 h-24 text-red-500" />,
      title: "Pembayaran Gagal",
      desc: "Terjadi kesalahan saat memproses pembayaran Anda.",
      color: "border-red-500/50 bg-red-500/10",
      textColor: "text-red-500",
      buttonText: "Coba Lagi",
      buttonLink: "/",
      buttonIcon: <RefreshCw size={18} />
    },
    pending: { // Digunakan untuk Expired / Belum Selesai (Unfinished)
      icon: <Clock className="w-24 h-24 text-yellow-500" />,
      title: "Menunggu / Expired",
      desc: "Pembayaran belum diselesaikan atau waktu telah habis.",
      color: "border-yellow-500/50 bg-yellow-500/10",
      textColor: "text-yellow-500",
      buttonText: "Order Ulang",
      buttonLink: "/",
      buttonIcon: <RefreshCw size={18} />
    }
  };

  const current = content[status] || content.pending;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className={`max-w-md w-full p-8 rounded-3xl border text-center relative overflow-hidden shadow-2xl ${current.color}`}
      >
        {/* Background Blur Effect */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 ${current.textColor.replace('text-', 'bg-')}/20 blur-[50px] rounded-full pointer-events-none`}></div>

        {/* Icon with Animation */}
        <motion.div 
          initial={{ y: -20 }} 
          animate={{ y: 0 }} 
          className="flex justify-center mb-6 relative z-10"
        >
            <div className="bg-brand-navy p-4 rounded-full border border-brand-blue/30 shadow-lg">
                {current.icon}
            </div>
        </motion.div>

        {/* Text Content */}
        <h1 className="text-3xl font-extrabold text-white mb-2">{current.title}</h1>
        <p className="text-brand-blue mb-6">{current.desc}</p>

        {/* Order ID Badge */}
        {orderId !== '-' && (
            <div className="bg-black/20 py-2 px-4 rounded-lg mb-8 inline-block border border-brand-blue/20">
                <p className="text-xs text-brand-blue">Order ID</p>
                <p className="text-sm font-mono text-white tracking-wider">{orderId}</p>
            </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
            <Link 
                to={current.buttonLink} 
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
                    status === 'success' 
                    ? 'bg-brand-pink text-brand-navy hover:bg-white hover:shadow-[0_0_20px_rgba(216,167,208,0.4)]' 
                    : 'bg-brand-blue/20 text-white border border-brand-blue/30 hover:bg-brand-blue/30'
                }`}
            >
                {current.buttonText} {current.buttonIcon}
            </Link>
            
            <Link to="/" className="block text-sm text-brand-blue hover:text-white transition-colors py-2">
                Kembali ke Beranda
            </Link>
        </div>

      </motion.div>
    </div>
  );
}