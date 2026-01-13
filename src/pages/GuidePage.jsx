import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Link to="/" className="flex items-center gap-2 text-brand-pink mb-6 hover:underline">
         <ArrowLeft size={20} /> Kembali ke Top Up
      </Link>

      <div className="bg-brand-navy border border-brand-blue/30 p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6">Cara Membuat Game Pass</h1>
        
        <div className="space-y-8">
            
            {/* STEP 1 */}
            <Step number="1" title="Login ke Roblox & Buka Dashboard">
                <p className="text-brand-blue mb-2">Buka website Roblox Creator Dashboard di browser kamu.</p>
                <a href="https://create.roblox.com/dashboard/creations" target="_blank" className="text-brand-pink flex items-center gap-1 hover:underline mb-3">
                    Buka Creator Dashboard <ExternalLink size={14}/>
                </a>
                {/* Placeholder Image */}
                <div className="bg-black/20 h-40 rounded-xl flex items-center justify-center text-gray-500 border border-brand-blue/20">
                    [Gambar Dashboard Roblox]
                </div>
            </Step>

            {/* STEP 2 */}
            <Step number="2" title="Pilih Experience (Game)">
                <p className="text-brand-blue mb-2">Pilih salah satu game kamu (biasanya otomatis ada 1 game public saat buat akun).</p>
            </Step>

            {/* STEP 3 */}
            <Step number="3" title="Masuk Menu Passes">
                <p className="text-brand-blue mb-2">Di menu sebelah kiri, cari bagian <b>Monetization</b> lalu klik <b>Passes</b>.</p>
                <p className="text-brand-blue">Klik tombol <b>Create a Pass</b>.</p>
            </Step>

            {/* STEP 4 */}
            <Step number="4" title="Upload Gambar & Nama">
                <p className="text-brand-blue mb-2">Upload gambar bebas, beri nama (contoh: "Donasi"), lalu klik <b>Create Pass</b>.</p>
            </Step>

            {/* STEP 5 */}
            <Step number="5" title="Setting Harga (PENTING!)">
                <p className="text-brand-blue mb-2">Klik Pass yang baru dibuat. Masuk menu <b>Sales</b> di kiri.</p>
                <ul className="list-disc list-inside text-brand-blue mb-3">
                    <li>Aktifkan <b>Item for Sale</b></li>
                    <li>Masukkan harga sesuai instruksi di halaman Top Up</li>
                    <li>Simpan (Save Changes)</li>
                </ul>
                <div className="bg-brand-pink/10 border border-brand-pink p-3 rounded-lg text-brand-pink text-sm">
                    Pastikan harga yang kamu input sesuai agar Robux masuk dengan benar!
                </div>
            </Step>

            {/* STEP 6 */}
            <Step number="6" title="Copy Link">
                <p className="text-brand-blue mb-2">Klik tombol titik tiga di pojok kanan atas Pass kamu <b>Copy URL</b>.</p>
                <p className="text-brand-blue">Tempel link tersebut di form Top Up.</p>
            </Step>

        </div>
      </div>
    </div>
  );
}

const Step = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 bg-brand-blue/20 text-brand-pink w-10 h-10 rounded-full flex items-center justify-center font-bold border border-brand-blue/30">
            {number}
        </div>
        <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            {children}
        </div>
    </div>
);