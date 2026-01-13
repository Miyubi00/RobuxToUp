import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import midtransClient from 'midtrans-client';

// Load env vars
dotenv.config();

const app = express();

// [FIX] Trust Proxy (Penting untuk Vercel agar rate limit akurat)
app.set('trust proxy', 1);

app.use(express.json());

// [FIX] CORS Configuration
// Allow all origin '*' atau ganti dengan domain frontend kamu nanti
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    credentials: true
}));

// Supabase Init (Pastikan nama ENV sesuai di Vercel)
// Gunakan SERVICE_ROLE key untuk backend (SUPABASE_KEY)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_KEY);

// Midtrans Init
let snap = new midtransClient.Snap({
    isProduction: false, // Ubah true jika sudah production
    serverKey: process.env.MIDTRANS_SERVER_KEY
});

// Rate Limiter
const limiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});
app.use(limiter);

// --- KONFIGURASI BIAYA ADMIN ---
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

// --- HELPER FUNCTIONS ---
const sendDiscordNotify = async (order) => {
  let title = "📦 Pesanan Baru Masuk";
  let color = 16776960; 
  let description = "Menunggu Pembayaran...";

  if (order.status === 'PENDING_PEMBAYARAN') {
      title = "⏳ Menunggu Pembayaran";
      color = 16776960;
      description = "User baru saja membuat pesanan. Belum dibayar.";
  } 
  else if (order.status === 'PENGECEKAN_GAMEPASS' || order.payment_status === 'PAID') {
      title = "✅ PAYMENT SUCCESS - Robux Pending";
      color = 3066993;
      description = "**SIAP PROSES!** Segera kirim Robux ke user ini.";
  }
  else if (order.status === 'GAGAL') {
      title = "❌ Pesanan Gagal / Expired";
      color = 15158332;
      description = "Pembayaran gagal atau kadaluarsa.";
  }

  const embed = {
    title: title,
    description: description,
    color: color,
    fields: [
      { name: "Order ID", value: `\`${order.id}\``, inline: true },
      { name: "Username", value: `**${order.roblox_username}**`, inline: true },
      { name: "Nominal", value: `💎 ${order.robux_amount} Robux`, inline: true },
      { name: "Harga Gamepass", value: `💰 ${order.gamepass_price} Robux`, inline: true },
      { name: "WhatsApp", value: order.whatsapp ? `\`${order.whatsapp}\`` : "-", inline: true },
      { name: "Status", value: `\`${order.status}\``, inline: true },
      { name: "Link Gamepass", value: order.gamepass_link ? `[Klik Disini](${order.gamepass_link})` : "Tidak ada link" },
      { name: "Profile Roblox", value: `[Buka Profil](https://www.roblox.com/users/${order.roblox_user_id}/profile)` }
    ],
    footer: { text: "Robux Topup System" },
    timestamp: new Date().toISOString()
  };
  
  try {
    if (process.env.DISCORD_WEBHOOK_URL) {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, { embeds: [embed] });
    }
  } catch (err) { console.error("Discord Error", err); }
};

// --- ROUTES ---

// Root check
app.get('/', (req, res) => res.send('Robux API Running...'));

// 1. Verify Roblox User (DENGAN HEADERS ANTI BLOKIR)
app.post('/api/roblox/verify-user', async (req, res) => {
  const { username } = req.body;
  
  if (!username) return res.status(400).json({ error: "Username kosong" });

  try {
    // Header Browser agar tidak diblokir Roblox di Vercel
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };

    // Cari User ID
    const searchRes = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: true
    }, config);

    if (searchRes.data.data.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const user = searchRes.data.data[0];

    // Ambil Avatar
    const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=true`, config);
    const avatarUrl = thumbRes.data.data[0].imageUrl;

    res.json({
      id: user.id,
      username: user.name,
      displayName: user.displayName,
      avatar: avatarUrl
    });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: "Gagal koneksi ke Roblox API" });
  }
});

// [BARU] Proxy Avatar (Wajib ada biar gambar muncul di Dashboard Admin)
app.get('/api/proxy/avatar/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const response = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
      );
      const realImageUrl = response.data.data[0].imageUrl;
      res.redirect(realImageUrl);
    } catch (error) {
      res.redirect('https://tr.rbxcdn.com/53549254345345'); // Fallback image
    }
});

// [BARU] Cek Gamepass (Existence Only - Lebih Aman)
app.post('/api/roblox/check-gamepass', async (req, res) => {
    const { gamePassId } = req.body;
    if (!gamePassId) return res.status(400).json({ error: "ID Kosong" });

    try {
        const apiRes = await axios.get(`https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${gamePassId}&size=150x150&format=Png&isCircular=false`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const data = apiRes.data.data[0];

        if (data && data.state === 'Completed') {
            res.json({ valid: true, imageUrl: data.imageUrl });
        } else {
            res.status(404).json({ valid: false });
        }
    } catch (error) {
        // Fail safe: Kalau error connection, anggap valid aja biar user tetap bisa bayar
        res.json({ valid: true, warning: "Connection error, bypassed" }); 
    }
});

// 2. Create Order
app.post('/api/order/create', async (req, res) => {
  const schema = z.object({
    username: z.string(),
    userId: z.number(),
    email: z.string().email(),
    amount: z.number().min(100),
    paymentMethod: z.string(),
    whatsapp: z.string().optional(),
    gamepassLink: z.string().optional()
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: "Data tidak valid" });

  const { username, userId, email, amount, paymentMethod, whatsapp, gamepassLink } = req.body;
  
  const ROBUX_RATE = 137.5; 
  const basePrice = Math.round(amount * ROBUX_RATE);
  
  let adminFee = 0;
  const feeRule = FEE_CONFIG[paymentMethod];
  if (feeRule) {
    if (feeRule.type === 'percent') adminFee = Math.round(basePrice * feeRule.value);
    else if (feeRule.type === 'flat') adminFee = feeRule.value;
  }

  const grossAmount = basePrice + adminFee;
  const gamepassPrice = Math.ceil(amount / 0.7);

  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      roblox_username: username,
      roblox_user_id: userId.toString(),
      email,
      whatsapp: whatsapp || '',
      gamepass_link: gamepassLink || '',
      robux_amount: amount,
      gamepass_price: gamepassPrice,
      status: 'PENDING_PEMBAYARAN'
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await sendDiscordNotify(order);

  // Midtrans Parameter
  let enabledPayments = [];
  let bankTransferConfig = {};

  switch (paymentMethod) {
      case 'qris': enabledPayments = ['qris']; break;
      case 'gopay': enabledPayments = ['gopay']; break;
      case 'shopeepay': enabledPayments = ['shopeepay']; break;
      case 'dana': case 'ovo': enabledPayments = ['qris']; break;
      case 'bca': enabledPayments = ['bca_va']; bankTransferConfig = { bank: 'bca', va_number: "12345678911" }; break;
      case 'bri': enabledPayments = ['bri_va']; bankTransferConfig = { bank: 'bri' }; break;
      case 'bni': enabledPayments = ['bni_va']; bankTransferConfig = { bank: 'bni' }; break;
      case 'permata': enabledPayments = ['permata_va']; break;
      case 'mandiri': enabledPayments = ['echannel']; break;
      default: enabledPayments = ['other_qris'];
  }

  try {
    let parameter = {
        transaction_details: { order_id: order.id, gross_amount: grossAmount },
        customer_details: { first_name: username, email: email, phone: whatsapp },
        item_details: [
            { id: `ROBUX-${amount}`, price: basePrice, quantity: 1, name: `${amount} Robux` },
            { id: `FEE-${paymentMethod}`, price: adminFee, quantity: 1, name: `Biaya Layanan` }
        ],
        enabled_payments: enabledPayments
    };

    if (['bca', 'bri', 'bni'].includes(paymentMethod)) parameter.bank_transfer = bankTransferConfig;
    if (paymentMethod === 'permata') parameter.permata_va = { recipient_name: username };
    if (paymentMethod === 'mandiri') parameter.echannel = { bill_info1: "Topup", bill_info2: "Robux Nexus" };

    const transaction = await snap.createTransaction(parameter);
    res.json({ orderId: order.id, token: transaction.token, redirect_url: transaction.redirect_url });

  } catch (err) {
      console.error("Midtrans Error:", err.message);
      res.status(500).json({ error: "Gagal payment gateway" });
  }
});

// 3. Webhook Payment
app.post('/api/payment/webhook', async (req, res) => {
  const notification = req.body;

  try {
      const orderId = notification.order_id;
      const transactionStatus = notification.transaction_status;
      const fraudStatus = notification.fraud_status;

      let isSuccess = false;
      let isFailed = false;

      if (transactionStatus == 'capture') {
          if (fraudStatus == 'accept') isSuccess = true;
      } else if (transactionStatus == 'settlement') {
          isSuccess = true;
      } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
          isFailed = true;
      }

      if (isSuccess) {
          const { data: order, error } = await supabase
            .from('orders')
            .update({ payment_status: 'PAID', status: 'PENGECEKAN_GAMEPASS' })
            .eq('id', orderId)
            .select()
            .single();

          if (!error && order) {
              await sendDiscordNotify(order);
          }

      } else if (isFailed) {
          await supabase
            .from('orders')
            .update({ payment_status: 'FAILED', status: 'GAGAL' })
            .eq('id', orderId);
      }

      res.status(200).send('OK');
  } catch (err) {
      console.error("Webhook Error:", err.message);
      res.status(500).send('Error');
  }
});

// WAJIB UNTUK VERCEL SERVERLESS: Export default app
export default app;