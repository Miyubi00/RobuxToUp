import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Wallet, ChevronDown, ChevronUp, Loader2,
  MessageCircle, Link as LinkIcon, HelpCircle, AlertCircle, Mail, Phone, RefreshCw, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '/api';
const ROBUX_RATE = 137.5;
const LOGO_BASE = "https://snap-assets.al-pc-id-b.cdn.gtflabs.io/snap-preferences/sandbox/v1/logos";

const FEE_CONFIG = {
  qris: { type: 'percent', value: 0.007 },
  gopay: { type: 'percent', value: 0.02 },
  shopeepay: { type: 'percent', value: 0.04 },
  dana: { type: 'percent', value: 0.017 },
  ovo: { type: 'percent', value: 0.017 },
  bca: { type: 'flat', value: 3000 },
  bri: { type: 'flat', value: 3000 },
  bni: { type: 'flat', value: 3000 },
  mandiri: { type: 'flat', value: 3000 },
  permata: { type: 'flat', value: 3000 },
};

export default function TopUpPage() {
  const [amount, setAmount] = useState(0);
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [email, setEmail] = useState('');

  const [whatsapp, setWhatsapp] = useState('+62');
  const [gamepassLink, setGamepassLink] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('qris');
  const [gamepassStatus, setGamepassStatus] = useState(null);
  const [gamepassDetail, setGamepassDetail] = useState(null);
  const [isPassValid, setIsPassValid] = useState(null);
  const [checkingPass, setCheckingPass] = useState(false);

  // --- LOGIC VALIDASI ---
  const getValidationErrors = () => {
    const errors = [];
    if (amount < 100) errors.push("Pilih Nominal");
    if (!userData) errors.push("Verifikasi Username (Klik Tombol Cek)");

    // Validasi Link: Cukup cek apakah sudah "True" (Valid)
    if (!gamepassLink.includes('roblox.com')) {
      errors.push("Link Gamepass Invalid");
    } else if (isPassValid === false) {
      errors.push("ID Gamepass Tidak Ditemukan!");
    } else if (isPassValid === null) {
      errors.push("Wajib Cek Gamepass (Klik tombol refresh)");
    }

    if (!selectedPayment) errors.push("Metode Pembayaran");
    if (!email.includes('@')) errors.push("Email");
    if (whatsapp.length < 10) errors.push("No. WhatsApp");
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isFormValid = validationErrors.length === 0;

  const nominalOptions = [100, 300, 500, 800, 1000, 2000, 5000];
  const gamepassPrice = Math.ceil(amount / 0.7);

  const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

  const calculateTotal = (code) => {
    if (amount === 0) return 0;
    const basePrice = Math.round(amount * ROBUX_RATE);
    const rule = FEE_CONFIG[code];
    let fee = 0;
    if (rule) {
      if (rule.type === 'percent') fee = Math.round(basePrice * rule.value);
      else fee = rule.value;
    }
    return basePrice + fee;
  };

  const handleWhatsappChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+62')) {
      val = '+62' + val.replace(/^\+62|^0/, '');
    }
    const numericPart = val.slice(3).replace(/[^0-9]/g, '');
    setWhatsapp('+62' + numericPart);
  };

  const handleVerify = async () => {
    if (!username) return;
    setLoadingVerify(true);
    try {
      const res = await axios.post(`${API_URL}/roblox/verify-user`, { username });
      setUserData(res.data);
    } catch (err) {
      alert("User tidak ditemukan!");
      setUserData(null);
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleOrder = async () => {
    if (!isFormValid) return;
    setLoadingOrder(true);
    try {
      const res = await axios.post(`${API_URL}/order/create`, {
        username: userData.username,
        userId: userData.id,
        email,
        amount,
        paymentMethod: selectedPayment,
        whatsapp,
        gamepassLink
      });

      const { token } = res.data;
      if (window.snap) {
        window.snap.pay(token, {

          // 1. SUKSES: Arahkan ke Halaman Sukses (Hijau)
          onSuccess: function (result) {
            console.log("Success:", result);
            window.location.href = `/payment/success?order_id=${result.order_id}`;
          },

          // 2. PENDING: Arahkan ke Halaman Pending (Kuning)
          // Ini terjadi jika user sudah dapat VA tapi belum bayar
          onPending: function (result) {
            console.log("Pending:", result);
            window.location.href = `/payment/pending?order_id=${result.order_id}`;
          },

          // 3. ERROR: Arahkan ke Halaman Gagal (Merah)
          onError: function (result) {
            console.log("Error:", result);
            window.location.href = `/payment/failed?order_id=${result.order_id}`;
          },

          // 4. ON CLOSE: JANGAN PINDAH HALAMAN
          // Ini terjadi jika user klik tombol silang (X) di pojok kanan atas popup
          onClose: function () {
            alert('Anda menutup halaman pembayaran. Silakan klik "Bayar Sekarang" lagi jika ingin melanjutkan.');
            // Kita tidak melakukan redirect apa-apa, jadi user tetap di form Top Up
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membuat order. Cek Link/WA anda.");
    } finally {
      setLoadingOrder(false);
    }
  };

  // --- FUNGSI BARU: AUTO FIX LINK ---
  const handleLinkChange = (e) => {
    let val = e.target.value;

    if (val.includes("create.roblox.com") && val.includes("/passes/")) {

      // Ambil Angka ID Gamepass menggunakan Regex
      const match = val.match(/\/passes\/(\d+)/);

      if (match && match[1]) {
        // Ubah otomatis ke Link Public
        val = `https://www.roblox.com/game-pass/${match[1]}/`;

        // (Opsional) Kasih notifikasi kecil / console log
        console.log("Link Creator Dashboard terdeteksi, diubah ke Public Link");
      }
    }

    setGamepassLink(val);
  };

  // --- FUNGSI CEK EKSISTENSI ---
  const handleCheckGamepass = async () => {
    const match = gamepassLink.match(/\/game-pass\/(\d+)/) || gamepassLink.match(/\/passes\/(\d+)/);

    if (!match || !match[1]) {
      alert("Link tidak valid! Pastikan link mengandung ID angka.");
      return;
    }

    setCheckingPass(true);
    setIsPassValid(null); // Reset dulu

    try {
      // Panggil backend kita
      const res = await axios.post(`${API_URL}/roblox/check-gamepass`, { gamePassId: match[1] });

      // Kalau backend bilang valid=true (atau fallback warning), kita anggap Valid
      if (res.data.valid) {
        setIsPassValid(true);
      } else {
        setIsPassValid(false);
      }
    } catch (err) {
      // Jika backend 404 (beneran gak ketemu)
      setIsPassValid(false);
    } finally {
      setCheckingPass(false);
    }
  };

  useEffect(() => {
    // Cek apakah script sudah ada biar gak double
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js"; // Default fallback
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY; 
    const scriptUrl = import.meta.env.VITE_MIDTRANS_SCRIPT_URL || snapScript;
    
    const scriptId = "midtrans-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.id = scriptId;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;
      
      document.body.appendChild(script);
      
      // Cleanup saat component di-unmount (opsional)
      return () => {
        document.body.removeChild(script);
      }
    }
  }, []);

  const PaymentButton = ({ code, name, customLogo }) => {
    const logoUrl = customLogo || `${LOGO_BASE}/${code}.svg`;
    return (
      <div
        onClick={() => setSelectedPayment(code)}
        className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all mb-2 ${selectedPayment === code
          ? 'bg-brand-pink/20 border-brand-pink shadow-[0_0_10px_rgba(216,167,208,0.3)]'
          : 'bg-brand-navy border-brand-blue/30 hover:bg-brand-blue/10'
          }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 flex items-center justify-center bg-white rounded-md overflow-hidden p-1 shadow-sm">
            <img src={logoUrl} alt={name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <span className={`text-sm ${selectedPayment === code ? 'font-bold text-brand-pink' : 'text-gray-300'}`}>{name}</span>
        </div>
        <div className="text-right">
          {amount > 0 && (
            <span className={`block text-xs font-bold ${selectedPayment === code ? 'text-brand-pink' : 'text-white'}`}>
              {formatRupiah(calculateTotal(code))}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white mb-2">Top Up Robux</h1>
        <p className="text-brand-blue">Proses Cepat & Aman via Gamepass</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KOLOM KIRI (FORM) */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. NOMINAL */}
          <div className="bg-brand-navy border border-brand-blue/30 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Pilih Nominal
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {nominalOptions.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`p-3 rounded-xl border text-center transition-all ${amount === val
                    ? 'bg-brand-pink/20 border-brand-pink text-brand-pink'
                    : 'border-brand-blue/30 hover:bg-brand-blue/10 text-brand-blue'
                    }`}
                >
                  <div className="font-bold text-lg text-white">{val} R$</div>
                  <div className="text-xs opacity-80">{formatRupiah(val * ROBUX_RATE)}</div>
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Input Custom (Min 100)"
              className="mt-4 w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 focus:outline-none focus:border-brand-pink text-center font-bold text-white placeholder-brand-blue"
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          {/* 2. DATA AKUN (USERNAME SAJA) */}
          <div className="bg-brand-navy border border-brand-blue/30 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Akun Roblox
            </h2>

            {/* Username Search */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Username Roblox..."
                className={`flex-1 bg-black/20 border rounded-xl p-3 focus:outline-none focus:border-brand-pink text-white ${!userData && username ? 'border-yellow-500/50' : 'border-brand-blue/30'
                  }`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUserData(null); // Reset verify jika ngetik ulang
                }}
              />
              <button
                onClick={handleVerify}
                disabled={loadingVerify}
                className={`px-4 rounded-xl border transition-all ${!userData && username
                  ? 'bg-yellow-500 text-black border-yellow-500 animate-pulse font-bold'
                  : 'bg-brand-blue/20 text-brand-pink border-brand-blue/30 hover:bg-brand-blue/30'
                  }`}
              >
                {loadingVerify ? <Loader2 className="animate-spin" /> : <Search />}
              </button>
            </div>

            {/* Warning Text jika belum cek */}
            {!userData && username && (
              <p className="text-yellow-500 text-xs mb-2 flex items-center gap-1">
                <AlertCircle size={12} /> Wajib klik tombol search di samping untuk verifikasi!
              </p>
            )}

            <AnimatePresence>
              {userData && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 bg-green-500/10 p-3 rounded-xl border border-green-500/20 mb-2">
                  <img src={userData.avatar} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-bold text-green-400">{userData.displayName}</p>
                    <p className="text-xs text-brand-blue">@{userData.username}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. PANDUAN GAME PASS & LINK */}
          <div className={`transition-all duration-300 ${amount >= 100 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="bg-brand-navy border border-brand-blue/30 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Game Pass Link
                </h2>
                <Link to="/guide" target="_blank" className="text-xs bg-brand-pink text-brand-navy font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-white transition">
                  <HelpCircle size={14} /> Panduan
                </Link>
              </div>

              <div className="bg-brand-blue/10 border border-brand-blue/30 p-4 rounded-xl mb-4 text-center">
                <p className="text-brand-blue text-sm mb-1">⚠️ Buat Game Pass seharga:</p>
                <p className="text-3xl font-extrabold text-brand-pink tracking-wide">{gamepassPrice} Robux</p>
                <p className="text-xs text-brand-blue mt-1">Agar kamu menerima bersih <b>{amount} Robux</b></p>
              </div>

              {/* INPUT LINK DENGAN TOMBOL CEK (VERSI SIMPLE) */}
              <div className="relative mb-2">
                <LinkIcon className="absolute left-3 top-3 text-brand-blue w-5 h-5" />

                <input
                  type="url"
                  placeholder="https://www.roblox.com/game-pass/..."
                  className={`w-full bg-black/20 border rounded-xl p-3 pl-10 pr-12 focus:outline-none transition-all text-white ${isPassValid === true ? 'border-green-500 focus:border-green-500' :
                      isPassValid === false ? 'border-red-500 focus:border-red-500' :
                        'border-brand-blue/30 focus:border-brand-pink'
                    }`}
                  value={gamepassLink}
                  onChange={(e) => {
                    // Reset status kalau user mengetik ulang
                    setIsPassValid(null);
                    handleLinkChange(e);
                  }}
                />

                {/* TOMBOL CEK */}
                <button
                  onClick={handleCheckGamepass}
                  disabled={checkingPass || !gamepassLink}
                  className={`absolute right-2 top-2 p-1.5 rounded-lg disabled:opacity-50 transition-colors ${isPassValid === true ? 'bg-green-500/20 text-green-400' :
                      isPassValid === false ? 'bg-red-500/20 text-red-400' :
                        'bg-brand-blue/20 text-brand-pink hover:bg-brand-blue/30'
                    }`}
                  title="Cek Ketersediaan ID"
                >
                  {checkingPass ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                </button>
              </div>

              {/* INDIKATOR STATUS SIMPEL */}
              {isPassValid === true && (
                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                  <CheckCircle size={14} />
                  <span><b>ID Valid!</b> Gamepass ditemukan. Pastikan harganya sudah benar ya.</span>
                </div>
              )}

              {isPassValid === false && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <XCircle size={14} />
                  <span><b>ID Tidak Ditemukan / 404.</b> Cek kembali link kamu.</span>
                </div>
              )}

              {/* STATUS MESSAGE (PESAN ERROR/SUKSES) */}
              {gamepassStatus === 'valid' && (
                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                  <CheckCircle size={14} />
                  <span><b>Benar!</b> Gamepass: "{gamepassDetail?.name}" seharga {gamepassDetail?.price} Robux.</span>
                </div>
              )}

              {gamepassStatus === 'wrong_price' && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <XCircle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <b>Harga Salah!</b> Gamepass kamu seharga <b>{gamepassDetail?.price} R$</b>.<br />
                    Harusnya disetting: <b>{Math.ceil(amount / 0.7)} R$</b> agar kamu terima bersih {amount}.
                  </div>
                </div>
              )}

              {gamepassStatus === 'not_sale' && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <AlertCircle size={14} />
                  <span>Gamepass <b>"{gamepassDetail?.name}"</b> belum dijual (Off Sale). Harap aktifkan "Item for Sale".</span>
                </div>
              )}

              {gamepassStatus === 'error' && (
                <p className="text-xs text-red-400 mt-1 ml-1">*Gamepass tidak ditemukan. Cek link & privasi inventory.</p>
              )}
            </div>
          </div>

          {/* 4. METODE PEMBAYARAN */}
          <div className="bg-brand-navy border border-brand-blue/30 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Metode Pembayaran
            </h2>

            <div className="mb-3">
              <PaymentButton code="qris" name="QRIS (All E-Wallet)" customLogo={`${LOGO_BASE}/qris.svg`} />
            </div>

            <div className="mb-3 border border-brand-blue/20 rounded-xl overflow-hidden">
              <div onClick={() => setExpandedCategory(expandedCategory === 'ewallet' ? '' : 'ewallet')} className="p-4 bg-black/20 flex justify-between items-center cursor-pointer hover:bg-brand-blue/5">
                <span className="font-bold text-white">E-Wallet</span>
                {expandedCategory === 'ewallet' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              <AnimatePresence>
                {expandedCategory === 'ewallet' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/30 p-3 overflow-hidden">
                    <PaymentButton code="gopay" name="GoPay" />
                    <PaymentButton code="shopeepay" name="ShopeePay" />
                    <PaymentButton code="dana" name="DANA" />
                    <PaymentButton code="ovo" name="OVO" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mb-3 border border-brand-blue/20 rounded-xl overflow-hidden">
              <div onClick={() => setExpandedCategory(expandedCategory === 'va' ? '' : 'va')} className="p-4 bg-black/20 flex justify-between items-center cursor-pointer hover:bg-brand-blue/5">
                <span className="font-bold text-white">Virtual Account</span>
                {expandedCategory === 'va' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              <AnimatePresence>
                {expandedCategory === 'va' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/30 p-3 overflow-hidden">
                    <PaymentButton code="bca" name="BCA" />
                    <PaymentButton code="bri" name="BRI" />
                    <PaymentButton code="mandiri" name="Mandiri" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: CHECKOUT (Sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-brand-navy border border-brand-blue/30 p-6 rounded-2xl sticky top-24 shadow-xl">
            <h3 className="text-xl font-bold mb-6 text-white border-b border-brand-blue/30 pb-4">Ringkasan</h3>

            <div className="space-y-3 mb-6">
              <SummaryRow label="Username" value={userData ? userData.username : '-'} />
              <SummaryRow label="Nominal" value={`${amount} R$`} />
              <SummaryRow label="Metode" value={selectedPayment.toUpperCase() || '-'} isHighlight />
              <div className="h-px bg-brand-blue/20 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-white">Total</span>
                <span className="font-bold text-2xl text-brand-pink">
                  {amount > 0 && selectedPayment
                    ? formatRupiah(calculateTotal(selectedPayment))
                    : '-'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* INPUT EMAIL */}
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-brand-blue w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email (Bukti Bayar)"
                  className="w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-brand-pink text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* INPUT WHATSAPP (PINDAH KESINI) */}
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-brand-blue w-5 h-5" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  className="w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-brand-pink text-white"
                />
              </div>

              {/* BUTTON BAYAR PINTAR */}
              <button
                onClick={handleOrder}
                disabled={loadingOrder || !isFormValid}
                className={`w-full font-extrabold py-4 rounded-xl text-lg flex justify-center items-center gap-2 transition-all ${loadingOrder || !isFormValid
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
                  : 'bg-brand-pink text-brand-navy hover:bg-white hover:shadow-[0_0_20px_rgba(216,167,208,0.5)]'
                  }`}
              >
                {loadingOrder ? "Processing..." : "BAYAR SEKARANG"} <Wallet className="w-5 h-5" />
              </button>

              {/* DAFTAR ERROR PINTAR */}
              {!isFormValid && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs font-bold mb-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Mohon lengkapi data:
                  </p>
                  <ul className="text-xs text-red-300 list-disc list-inside space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const SummaryRow = ({ label, value, isHighlight }) => (
  <div className="flex justify-between text-sm">
    <span className="text-brand-blue">{label}</span>
    <span className={`font-bold truncate max-w-[150px] ${isHighlight ? 'text-brand-pink' : 'text-white'}`}>{value}</span>
  </div>
);