require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const midtransClient = require('midtrans-client');

const app = express();

// [FIX] Trust Proxy (Penting untuk VPS/Ngrok agar tidak error rate limit)
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors());

// Supabase Init
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
    validate: { xForwardedForHeader: false } // Matikan validasi strict untuk VPS
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

// --- HELPER FUNCTIONS (UPDATED DISCORD) ---

const sendDiscordNotify = async (order) => {
  let title = "📦 Pesanan Baru Masuk";
  let color = 16776960; // Kuning (Default: Pending)
  let description = "Menunggu Pembayaran...";

  // Logika Warna & Judul Berdasarkan Status
  if (order.status === 'PENDING_PEMBAYARAN') {
      title = "⏳ Menunggu Pembayaran";
      color = 16776960; // Kuning
      description = "User baru saja membuat pesanan. Belum dibayar.";
  } 
  else if (order.status === 'PENGECEKAN_GAMEPASS' || order.payment_status === 'PAID') {
      title = "✅ PAYMENT SUCCESS - Robux Pending"; // Sesuai request
      color = 3066993; // Hijau
      description = "**SIAP PROSES!** Segera kirim Robux ke user ini.";
  }
  else if (order.status === 'GAGAL') {
      title = "❌ Pesanan Gagal / Expired";
      color = 15158332; // Merah
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
    await axios.post(process.env.DISCORD_WEBHOOK_URL, { embeds: [embed] });
  } catch (err) { console.error("Discord Error", err); }
};

// --- ROUTES ---

// 1. Verify Roblox User
app.post('/api/roblox/verify-user', async (req, res) => {
  const { username } = req.body;
  try {
    const searchRes = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: true
    });

    if (searchRes.data.data.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const user = searchRes.data.data[0];
    const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=true`);
    const avatarUrl = thumbRes.data.data[0].imageUrl;

    res.json({
      id: user.id,
      username: user.name,
      displayName: user.displayName,
      avatar: avatarUrl
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal koneksi ke Roblox API" });
  }
});

app.get('/api/proxy/avatar/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // 1. Request ke Roblox API (Server side tidak kena CORS)
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
    );

    // 2. Ambil URL gambar yang asli dari dalam JSON
    // Contoh return: { data: [{ imageUrl: "https://tr.rbxcdn.com/..." }] }
    const realImageUrl = response.data.data[0].imageUrl;

    // 3. Redirect browser langsung ke gambar asli
    // Jadi di mata browser, link ini adalah gambar.
    res.redirect(realImageUrl);

  } catch (error) {
    console.error("Gagal ambil avatar:", error.message);
    // Fallback ke gambar default (Noob Head) jika error
    res.redirect('https://tr.rbxcdn.com/53549254345345'); 
  }
});


// [UPDATE FINAL] Cek Eksistensi Gamepass (Via Thumbnails API - Lebih Aman)
app.post('/api/roblox/check-gamepass', async (req, res) => {
  const { gamePassId } = req.body;

  if (!gamePassId || isNaN(gamePassId)) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  try {
    const apiRes = await axios.get(`https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${gamePassId}&size=150x150&format=Png&isCircular=false`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Header Browser
      }
    });
    
    const data = apiRes.data.data[0];

    // Cek apakah statusnya 'Completed' (Berarti gambar ada = ID Valid)
    if (data && data.state === 'Completed') {
        console.log(`✅ Gamepass ID ${gamePassId} Valid (Image Found)`);
        res.json({ 
            valid: true, 
            imageUrl: data.imageUrl 
        });
    } else {
        console.log(`❌ Gamepass ID ${gamePassId} Invalid (No Image)`);
        res.status(404).json({ valid: false });
    }

  } catch (error) {
    console.error("❌ Cek Exist Error:", error.message);
    // Jika error 429 (Too Many Requests) atau 403, anggap valid aja biar user tetap bisa bayar
    // (Fail safe strategy: lebih baik lolos daripada user gak bisa bayar)
    res.json({ valid: true, warning: "Cannot verify but allowed" }); 
  }
});

// 2. Create Order & Payment (NOTIFIKASI SAAT ORDER DIBUAT)
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
  
  // A. LOGIKA HARGA
  const ROBUX_RATE = 137.5; 
  const basePrice = Math.round(amount * ROBUX_RATE);
  
  // B. HITUNG FEE
  let adminFee = 0;
  const feeRule = FEE_CONFIG[paymentMethod];
  if (feeRule) {
    if (feeRule.type === 'percent') adminFee = Math.round(basePrice * feeRule.value);
    else if (feeRule.type === 'flat') adminFee = feeRule.value;
  }

  // C. TOTAL BAYAR
  const grossAmount = basePrice + adminFee;
  const gamepassPrice = Math.ceil(amount / 0.7);

  // Simpan ke Supabase
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

  // [BARU] Kirim Notifikasi Discord saat Pesanan Masuk (Status: Kuning)
  sendDiscordNotify(order);

  // D. MAPPING PAYMENT METHOD
  let enabledPayments = [];
  let bankTransferConfig = {};

  switch (paymentMethod) {
      case 'qris': enabledPayments = ['qris']; break;
      case 'gopay': enabledPayments = ['gopay']; break;
      case 'shopeepay': enabledPayments = ['shopeepay']; break;
      case 'dana': case 'ovo': enabledPayments = ['qris']; break;
      case 'bca': 
          enabledPayments = ['bca_va']; 
          bankTransferConfig = { bank: 'bca', va_number: "12345678911" }; 
          break;
      case 'bri': 
          enabledPayments = ['bri_va']; 
          bankTransferConfig = { bank: 'bri' }; 
          break;
      case 'bni': 
          enabledPayments = ['bni_va']; 
          bankTransferConfig = { bank: 'bni' }; 
          break;
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
      console.error("❌ MIDTRANS ERROR:", err.message);
      res.status(500).json({ error: "Gagal payment gateway" });
  }
});


// 3. Webhook Payment (SUPER DEBUG MODE)
app.post('/api/payment/webhook', async (req, res) => {
  const notification = req.body;

  try {
      const orderId = notification.order_id;
      const transactionStatus = notification.transaction_status;
      const fraudStatus = notification.fraud_status;

      // [DEBUG 1] Cek apakah Midtrans benar-benar memanggil URL ini
      console.log(`\n🔔 WEBHOOK MASUK!`);
      console.log(`👉 Order ID: ${orderId}`);
      console.log(`👉 Status: ${transactionStatus}`);

      // Logic Penentuan Status
      let isSuccess = false;
      let isFailed = false;

      if (transactionStatus == 'capture') {
          if (fraudStatus == 'challenge') {
              console.log("⚠️ Status Challenge (Belum Sukses)");
          } else if (fraudStatus == 'accept') {
              isSuccess = true;
          }
      } else if (transactionStatus == 'settlement') {
          isSuccess = true;
      } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
          isFailed = true;
      }

      // [DEBUG 2] Eksekusi Database
      if (isSuccess) {
          console.log("✅ Transaksi dianggap SUKSES. Mencoba update database...");

          const { data: order, error } = await supabase
            .from('orders')
            .update({ 
                payment_status: 'PAID', 
                status: 'PENGECEKAN_GAMEPASS' // Status berubah jadi siap proses
            })
            .eq('id', orderId)
            .select()
            .single();

          if (error) {
              console.error("❌ DATABASE UPDATE ERROR:", error.message);
              console.error("Detail:", error);
          } else {
              console.log("✅ Database berhasil diupdate:", order.id);
              
              // [DEBUG 3] Kirim Discord
              console.log("🚀 Mengirim Notifikasi Discord Hijau...");
              await sendDiscordNotify(order);
              console.log("✅ Notifikasi Discord Terkirim!");
          }

      } else if (isFailed) {
          console.log("❌ Transaksi GAGAL/EXPIRED. Update database...");
          await supabase
            .from('orders')
            .update({ payment_status: 'FAILED', status: 'GAGAL' })
            .eq('id', orderId);
      } else {
          console.log(`ℹ️ Status transaksi lain: ${transactionStatus} (Tidak ada aksi)`);
      }

      res.status(200).send('OK');
  } catch (err) {
      console.error("❌ CRITICAL WEBHOOK ERROR:", err.message);
      res.status(500).send('Error');
  }
});

// 4. Status Check
app.get('/api/order/status/:username', async (req, res) => {
  const { username } = req.params;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('roblox_username', username)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;