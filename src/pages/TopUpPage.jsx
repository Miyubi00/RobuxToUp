import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Wallet, ChevronDown, ChevronUp, Loader2,
  Link as LinkIcon, HelpCircle, AlertCircle, Mail, Phone, RefreshCw, XCircle, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '/api';
const ROBUX_RATE = 137.5;
const LOGO_BASE = "https://snap-assets.al-pc-id-b.cdn.gtflabs.io/snap-preferences/sandbox/v1/logos";

// KOMPONEN ICON ROBUX CUSTOM (Hexagon)
const RobuxIcon = ({ className }) => (
  <svg viewBox="0 0 27 27" fill="currentColor" className={className}>
    <path xmlns="http://www.w3.org/2000/svg" d="M23.402,5.571 C25.009,6.499 26,8.215 26,10.071 L26,17.927 C26,19.784 25.009,21.499 23.402,22.427 L16.597,26.356 C14.99,27.284 13.009,27.284 11.402,26.356 L4.597,22.427 C2.99,21.499 2,19.784 2,17.927 L2,10.071 C2,8.215 2.99,6.499 4.597,5.571 L11.402,1.643 C13.009,0.715 14.99,0.715 16.597,1.643 L23.402,5.571 Z M12.313,3.426 L5.686,7.252 C4.642,7.855 4,8.968 4,10.174 L4,17.825 C4,19.03 4.642,20.144 5.686,20.747 L12.313,24.572 C13.357,25.175 14.642,25.175 15.686,24.572 L22.313,20.747 C23.357,20.144 24,19.03 24,17.825 L24,10.174 C24,8.968 23.357,7.855 22.313,7.252 L15.686,3.426 C14.642,2.823 13.357,2.823 12.313,3.426 L12.313,3.426 Z M15.385,5.564 L20.614,8.582 C21.471,9.077 22,9.992 22,10.983 L22,17.02 C22,18.01 21.471,18.925 20.614,19.42 L15.385,22.439 C14.528,22.934 13.471,22.934 12.614,22.439 L7.385,19.42 C6.528,18.925 6,18.01 6,17.02 L6,10.983 C6,9.992 6.528,9.077 7.385,8.582 L12.614,5.564 C13.471,5.069 14.528,5.069 15.385,5.564 L15.385,5.564 Z M11,17.001 L17,17.001 L17,11.001 L11,11.001 L11,17.001 Z" id="Fill-1" fill="#608eac"/>
  </svg>
);

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
    if (!userData) errors.push("Verifikasi Username");
    if (!gamepassLink.includes('roblox.com')) {
      errors.push("Link Gamepass Invalid");
    } else if (isPassValid === false) {
      errors.push("ID Gamepass Tidak Ditemukan!");
    } else if (isPassValid === null) {
      errors.push("Wajib Cek Gamepass");
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
          onSuccess: function (result) {
            window.location.href = `/payment/success?order_id=${result.order_id}`;
          },
          onPending: function (result) {
            window.location.href = `/payment/pending?order_id=${result.order_id}`;
          },
          onError: function (result) {
            window.location.href = `/payment/failed?order_id=${result.order_id}`;
          },
          onClose: function () {
            alert('Anda menutup halaman pembayaran.');
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

  const handleLinkChange = (e) => {
    let val = e.target.value;
    if (val.includes("create.roblox.com") && val.includes("/passes/")) {
      const match = val.match(/\/passes\/(\d+)/);
      if (match && match[1]) {
        val = `https://www.roblox.com/game-pass/${match[1]}/`;
      }
    }
    setGamepassLink(val);
  };

  const handleCheckGamepass = async () => {
    const match = gamepassLink.match(/\/game-pass\/(\d+)/) || gamepassLink.match(/\/passes\/(\d+)/);
    if (!match || !match[1]) {
      alert("Link tidak valid! Pastikan link mengandung ID angka.");
      return;
    }
    setCheckingPass(true);
    setIsPassValid(null);
    try {
      const res = await axios.post(`${API_URL}/roblox/check-gamepass`, { gamePassId: match[1] });
      if (res.data.valid) {
        setIsPassValid(true);
      } else {
        setIsPassValid(false);
      }
    } catch (err) {
      setIsPassValid(false);
    } finally {
      setCheckingPass(false);
    }
  };

  useEffect(() => {
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js"; 
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
      return () => { document.body.removeChild(script); }
    }
  }, []);

  const PaymentButton = ({ code, name, customLogo }) => {
    const logoUrl = customLogo || `${LOGO_BASE}/${code}.svg`;
    return (
      <div
        onClick={() => setSelectedPayment(code)}
        className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all mb-2 active:scale-95 ${selectedPayment === code
          ? 'bg-brand-pink/20 border-brand-pink shadow-[0_0_10px_rgba(216,167,208,0.3)]'
          : 'bg-brand-navy border-brand-blue/30 hover:bg-brand-blue/10'
          }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-8 flex items-center justify-center bg-white rounded-md overflow-hidden p-1 shadow-sm">
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
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-20"> {/* PB ditambah biar ga ketutup sticky button di hp */}

      {/* HEADER */}
      <div className="text-center mb-6 mt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-1">Top Up Robux</h1>
        <p className="text-brand-blue text-sm md:text-base">Proses Cepat & Aman via Gamepass</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KOLOM KIRI (FORM) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* 1. NOMINAL (LAYOUT BARU: GRID 2 di HP) */}
          <div className="bg-brand-navy border border-brand-blue/30 p-4 md:p-6 rounded-2xl shadow-lg">
            <h2 className="text-base md:text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Pilih Nominal
            </h2>
            
            {/* GRID UTAMA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nominalOptions.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${amount === val
                    ? 'bg-brand-pink/20 border-brand-pink text-brand-pink'
                    : 'border-brand-blue/30 hover:bg-brand-blue/10 text-brand-blue bg-black/20'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <RobuxIcon className="w-5 h-5 md:w-6 md:h-6" /> {/* Icon Pengganti R$ */}
                    <span className="font-bold text-lg md:text-xl text-white">{val}</span>
                  </div>
                  <div className="text-[10px] md:text-xs opacity-80 bg-black/40 px-2 py-0.5 rounded-full">
                    {formatRupiah(val * ROBUX_RATE)}
                  </div>
                </button>
              ))}
            </div>

            {/* INPUT CUSTOM */}
            <div className="relative mt-4">
                 <div className="absolute left-4 top-3.5 pointer-events-none text-brand-blue font-bold text-sm">Custom</div>
                 <input
                    type="number"
                    placeholder="Minimal 100"
                    className="w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 pl-20 focus:outline-none focus:border-brand-pink text-right font-bold text-white placeholder-brand-blue/50"
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
            </div>
          </div>

          {/* 2. DATA AKUN (LAYOUT BARU: INPUT GROUP) */}
          <div className="bg-brand-navy border border-brand-blue/30 p-4 md:p-6 rounded-2xl shadow-lg">
            <h2 className="text-base md:text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Akun Roblox
            </h2>

            {/* INPUT USERNAME GAYA BARU (MIRIP LINK) */}
            <div className="relative mb-2">
              <User className="absolute left-3 top-3.5 text-brand-blue w-5 h-5" />
              
              <input
                type="text"
                placeholder="Username Roblox..."
                className={`w-full bg-black/20 border rounded-xl p-3 pl-10 pr-12 focus:outline-none transition-all text-white ${
                     !userData && username ? 'border-yellow-500/50 focus:border-yellow-500' : 
                     'border-brand-blue/30 focus:border-brand-pink'
                }`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUserData(null);
                }}
              />

              {/* TOMBOL CEK DI DALAM INPUT */}
              <button
                onClick={handleVerify}
                disabled={loadingVerify || !username}
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                    !userData && username ? 'bg-yellow-500 text-black animate-pulse' : 'bg-brand-blue/20 text-brand-pink'
                }`}
              >
                {loadingVerify ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            {/* HASIL PENCARIAN USER */}
            <AnimatePresence>
              {userData && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                  <img src={userData.avatar} className="w-10 h-10 rounded-full bg-black/30" alt="Avatar" />
                  <div>
                    <p className="font-bold text-green-400 text-sm">{userData.displayName}</p>
                    <p className="text-xs text-brand-blue">@{userData.username}</p>
                  </div>
                  <CheckCircle className="ml-auto text-green-500 w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {!userData && username && !loadingVerify && (
               <p className="text-[10px] text-yellow-500 mt-1 ml-1 flex items-center gap-1">
                 <AlertCircle size={10}/> Klik kaca pembesar untuk verifikasi
               </p>
            )}
          </div>

          {/* 3. GAME PASS LINK */}
          <div className={`transition-all duration-300 ${amount >= 100 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="bg-brand-navy border border-brand-blue/30 p-4 md:p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
                  <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Game Pass Link
                </h2>
                <Link to="/guide" target="_blank" className="text-[10px] md:text-xs bg-brand-pink text-brand-navy font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 hover:bg-white transition">
                  <HelpCircle size={12} /> Panduan
                </Link>
              </div>

              <div className="bg-brand-blue/10 border border-brand-blue/30 p-3 rounded-xl mb-4 text-center">
                <p className="text-brand-blue text-xs mb-1">⚠️ Buat Game Pass seharga:</p>
                <div className="flex items-center justify-center gap-2">
                     <RobuxIcon className="w-6 h-6 text-brand-pink" />
                     <p className="text-2xl font-extrabold text-brand-pink tracking-wide">{gamepassPrice}</p>
                </div>
                <p className="text-[10px] text-brand-blue mt-1">Agar kamu terima bersih <b>{amount}</b></p>
              </div>

              <div className="relative mb-2">
                <LinkIcon className="absolute left-3 top-3.5 text-brand-blue w-5 h-5" />
                <input
                  type="url"
                  placeholder="https://www.roblox.com/game-pass/..."
                  className={`w-full bg-black/20 border rounded-xl p-3 pl-10 pr-12 focus:outline-none transition-all text-white ${isPassValid === true ? 'border-green-500 focus:border-green-500' :
                    isPassValid === false ? 'border-red-500 focus:border-red-500' :
                      'border-brand-blue/30 focus:border-brand-pink'
                  }`}
                  value={gamepassLink}
                  onChange={(e) => {
                    setIsPassValid(null);
                    handleLinkChange(e);
                  }}
                />
                <button
                  onClick={handleCheckGamepass}
                  disabled={checkingPass || !gamepassLink}
                  className={`absolute right-2 top-2 p-1.5 rounded-lg disabled:opacity-50 transition-colors ${isPassValid === true ? 'bg-green-500/20 text-green-400' :
                    isPassValid === false ? 'bg-red-500/20 text-red-400' :
                      'bg-brand-blue/20 text-brand-pink hover:bg-brand-blue/30'
                  }`}
                >
                  {checkingPass ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                </button>
              </div>

              {/* Status Validasi */}
              {isPassValid === true && (
                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                  <CheckCircle size={14} /> <span><b>ID Valid!</b> Gamepass ditemukan.</span>
                </div>
              )}
              {isPassValid === false && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <XCircle size={14} /> <span><b>ID Tidak Ditemukan.</b> Cek link kamu.</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. METODE PEMBAYARAN */}
          <div className="bg-brand-navy border border-brand-blue/30 p-4 md:p-6 rounded-2xl shadow-lg">
            <h2 className="text-base md:text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="bg-brand-pink text-brand-navy w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Metode Pembayaran
            </h2>

            <div className="mb-2">
              <PaymentButton code="qris" name="QRIS (All E-Wallet)" customLogo={`${LOGO_BASE}/qris.svg`} />
            </div>

            {/* Accordion Simple untuk Mobile */}
            <div className="space-y-2">
                <div className="border border-brand-blue/20 rounded-xl overflow-hidden">
                  <div onClick={() => setExpandedCategory(expandedCategory === 'ewallet' ? '' : 'ewallet')} className="p-3 bg-black/20 flex justify-between items-center cursor-pointer active:bg-brand-blue/10">
                    <span className="font-bold text-white text-sm">E-Wallet</span>
                    {expandedCategory === 'ewallet' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <AnimatePresence>
                    {expandedCategory === 'ewallet' && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/30 p-2 overflow-hidden">
                        <PaymentButton code="gopay" name="GoPay" />
                        <PaymentButton code="shopeepay" name="ShopeePay" />
                        <PaymentButton code="dana" name="DANA" />
                        <PaymentButton code="ovo" name="OVO" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border border-brand-blue/20 rounded-xl overflow-hidden">
                  <div onClick={() => setExpandedCategory(expandedCategory === 'va' ? '' : 'va')} className="p-3 bg-black/20 flex justify-between items-center cursor-pointer active:bg-brand-blue/10">
                    <span className="font-bold text-white text-sm">Virtual Account</span>
                    {expandedCategory === 'va' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <AnimatePresence>
                    {expandedCategory === 'va' && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/30 p-2 overflow-hidden">
                        <PaymentButton code="bca" name="BCA" />
                        <PaymentButton code="bri" name="BRI" />
                        <PaymentButton code="mandiri" name="Mandiri" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: CHECKOUT (Sticky Mobile Friendly) */}
        <div className="lg:col-span-1">
          <div className="bg-brand-navy border border-brand-blue/30 p-4 md:p-6 rounded-2xl sticky top-24 shadow-xl">
            <h3 className="text-lg md:text-xl font-bold mb-4 text-white border-b border-brand-blue/30 pb-3">Ringkasan</h3>

            <div className="space-y-2 mb-4">
              <SummaryRow label="Username" value={userData ? userData.username : '-'} />
              <SummaryRow label="Nominal" value={amount > 0 ? `${amount}` : '-'} />
              <SummaryRow label="Metode" value={selectedPayment.toUpperCase() || '-'} isHighlight />
              <div className="h-px bg-brand-blue/20 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Total</span>
                <span className="font-bold text-xl text-brand-pink">
                  {amount > 0 && selectedPayment
                    ? formatRupiah(calculateTotal(selectedPayment))
                    : '-'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-brand-blue w-4 h-4" />
                <input
                  type="email"
                  placeholder="Email (Bukti Bayar)"
                  className="w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-brand-pink text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-3.5 text-brand-blue w-4 h-4" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  className="w-full bg-black/20 border border-brand-blue/30 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-brand-pink text-white"
                />
              </div>

              <button
                onClick={handleOrder}
                disabled={loadingOrder || !isFormValid}
                className={`w-full font-extrabold py-3.5 rounded-xl text-base md:text-lg flex justify-center items-center gap-2 transition-all active:scale-95 ${loadingOrder || !isFormValid
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
                  : 'bg-brand-pink text-brand-navy hover:bg-white hover:shadow-[0_0_20px_rgba(216,167,208,0.5)]'
                  }`}
              >
                {loadingOrder ? "Processing..." : "BAYAR SEKARANG"} <Wallet className="w-5 h-5" />
              </button>

              {!isFormValid && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  <p className="text-red-400 text-[10px] font-bold mb-1 flex items-center gap-1">
                    <AlertCircle size={10} /> Mohon lengkapi data:
                  </p>
                  <ul className="text-[10px] text-red-300 list-disc list-inside space-y-0.5 ml-1">
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
  <div className="flex justify-between text-xs md:text-sm">
    <span className="text-brand-blue">{label}</span>
    <span className={`font-bold truncate max-w-[120px] ${isHighlight ? 'text-brand-pink' : 'text-white'}`}>{value}</span>
  </div>
);