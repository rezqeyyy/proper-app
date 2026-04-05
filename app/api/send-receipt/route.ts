import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, cart, total } = await request.json();

    // 1. Konfigurasi "Kurir" Email menggunakan Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Buat Tampilan HTML Struk
    const itemsHtml = cart.map((item: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name} <br><small style="color: #666;">(x${item.quantity})</small></td>
        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="text-align: center; color: #2563eb; margin-bottom: 5px;">Toko Demo Kita</h2>
        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 0; margin-bottom: 20px;">
          ${new Date().toLocaleString('id-ID')}
        </p>
        <p>Terima kasih atas pembelian Anda! Berikut adalah rincian transaksinya:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${itemsHtml}
          <tr>
            <td style="padding-top: 15px;"><strong>TOTAL TAGIHAN</strong></td>
            <td style="padding-top: 15px; text-align: right; color: #2563eb;"><strong>Rp ${total.toLocaleString('id-ID')}</strong></td>
          </tr>
        </table>
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 30px;">
          Harap simpan email ini sebagai bukti pembayaran yang sah.
        </p>
      </div>
    `;

    // 3. Opsi Pengiriman Email
    const mailOptions = {
      from: `"Kasir Toko Kita" <${process.env.EMAIL_USER}>`, // Nama Pengirim
      to: email, // Email Pelanggan
      subject: 'Struk Pembayaran Anda - Toko Demo Kita',
      html: htmlContent,
    };

    // 4. Eksekusi Kirim Email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email terkirim' });
  } catch (error: any) {
    console.error("Error mengirim email:", error);
    return NextResponse.json({ error: 'Gagal mengirim email', details: error.message }, { status: 500 });
  }
}