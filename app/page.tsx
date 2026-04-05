"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, Trash2, CreditCard, Loader2, LogOut, 
  WifiOff, Printer, Mail, CheckCircle, LayoutGrid, 
  ReceiptText, Settings, Store, Plus, Minus, Search,
  X 
} from "lucide-react";
import { supabase } from "../lib/supabase";

const tailwindSafelist = ["bg-amber-700", "bg-amber-900", "bg-orange-400", "bg-yellow-400", "bg-green-600", "bg-red-500"];

type Product = { id: number; name: string; price: number; category: string; color: string; };
type CartItem = Product & { quantity: number; };

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isOffline, setIsOffline] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email ?? null);
        try {
          const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
          if (error) throw error;
          if (data) setProducts(data);
        } catch (error) {
          console.error("Gagal mengambil data produk:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkUserAndFetch();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCheckout) return;
      if (e.key === "Enter" && barcodeBuffer.current.length > 0) {
        const scannedId = parseInt(barcodeBuffer.current);
        const foundProduct = products.find(p => p.id === scannedId);
        if (foundProduct) addToCart(foundProduct);
        barcodeBuffer.current = ""; 
      } else {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router, products, showCheckout]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePayment = async () => {
    const transactionData = { items: cart, total: total, date: new Date().toISOString(), cashier: userEmail };
    if (isOffline) {
      const pendingTxs = JSON.parse(localStorage.getItem('pendingTransactions') || '[]');
      pendingTxs.push(transactionData);
      localStorage.setItem('pendingTransactions', JSON.stringify(pendingTxs));
    }
    setPaymentSuccess(true);
  };

  const handleEmailReceipt = async () => {
    if (!customerEmail) return alert("Masukkan email pelanggan!");
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, cart, total }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(`Struk elektronik berhasil dikirim ke ${customerEmail}`);
        setCustomerEmail("");
      } else {
        alert(`Gagal mengirim email: ${result.details || result.error}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan pada sistem jaringan saat menghubungi server email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert("Browser Anda memblokir pop-up! Tolong izinkan pop-up untuk mencetak struk.");
      return;
    }

    const itemsHtml = cart.map(item => `
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">${item.name}</span>
          <span style="font-weight: bold;">Rp ${(item.price * item.quantity).toLocaleString("id-ID")}</span>
        </div>
        <div style="color: #444; font-size: 10px;">
          ${item.quantity} x Rp ${item.price.toLocaleString("id-ID")}
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Struk</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0 auto; padding: 10px; color: black; font-size: 12px; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed black; margin: 10px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            @media print { @page { margin: 0; } body { width: 100%; padding: 5px; } }
          </style>
        </head>
        <body>
          <div class="text-center font-bold" style="font-size: 16px; margin-bottom: 5px;">TOKO DEMO KITA</div>
          <div class="text-center" style="margin-bottom: 15px;">${new Date().toLocaleString('id-ID')}</div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="flex-between font-bold" style="font-size: 14px;">
            <span>TOTAL</span>
            <span>Rp ${total.toLocaleString("id-ID")}</span>
          </div>
          <div class="text-center" style="margin-top: 20px; font-size: 10px;">
            Terima kasih atas kunjungan Anda!<br>
            Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden relative">

      <aside className="w-20 bg-white border-r border-gray-200 hidden md:flex flex-col items-center py-6 z-10">
        <div className="bg-blue-600 text-white p-3 rounded-xl mb-8 shadow-md">
          <Store size={28} />
        </div>
        <nav className="flex flex-col gap-6 w-full items-center flex-1">
          <button className="p-3 text-blue-600 bg-blue-50 rounded-xl transition"><LayoutGrid size={24} /></button>
          <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"><ReceiptText size={24} /></button>
          <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"><Settings size={24} /></button>
        </nav>
        <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Keluar">
          <LogOut size={24} />
        </button>
      </aside>

      <div className="flex-1 flex flex-col w-full md:w-auto h-full overflow-hidden">
        <header className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Kasir Utama</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 font-medium">{userEmail}</span>
              {isOffline && <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full"><WifiOff size={12}/> OFFLINE</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" placeholder="Cari produk..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all w-64"
              />
            </div>
            <button onClick={() => setShowCartMobile(!showCartMobile)} className="md:hidden relative p-3 bg-blue-600 text-white rounded-full shadow-md">
              <ShoppingCart size={20} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
            </button>
          </div>
        </header>

        <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0 hide-scrollbar">
          {['Semua', 'Minuman', 'Makanan', 'Snack'].map((cat, i) => (
            <button key={i} className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${i === 0 ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        <main className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`${product.color} group relative aspect-square rounded-2xl shadow-sm text-white flex flex-col justify-end p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 active:scale-95 overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="relative z-10 text-left w-full">
                  <h3 className="font-bold leading-tight mb-1">{product.name}</h3>
                  <p className="text-sm font-medium text-white/90">Rp {product.price.toLocaleString("id-ID")}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>

      <aside className={`${showCartMobile ? 'flex' : 'hidden'} md:flex absolute md:relative right-0 w-full md:w-[400px] h-full bg-white shadow-2xl md:shadow-[-4px_0_24px_-16px_rgba(0,0,0,0.1)] flex-col z-20`}>
        <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><ShoppingCart size={20} /></div>
            <h2 className="font-bold text-xl">Pesanan Saat Ini</h2>
          </div>
          <button onClick={() => setShowCartMobile(false)} className="md:hidden text-gray-500 font-medium">Tutup</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="bg-gray-100 p-6 rounded-full"><ShoppingCart size={48} className="text-gray-300" /></div>
              <p className="font-medium">Keranjang masih kosong</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 leading-tight">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-blue-600">Rp {(item.price * item.quantity).toLocaleString("id-ID")}</p>
                    
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-blue-600 transition"><Minus size={16} /></button>
                      <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-blue-600 transition"><Plus size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_24px_-16px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-medium">Total Tagihan</span>
            <span className="text-3xl font-extrabold text-gray-900">Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
          >
            BAYAR SEKARANG
          </button>
        </div>
      </aside>

      {showCheckout && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 relative">
            
            {!paymentSuccess ? (
              <>
                <button 
                  onClick={() => setShowCheckout(false)} 
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-full transition"
                  title="Tutup"
                >
                  <X size={20} />
                </button>

                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center mt-2">Konfirmasi Pembayaran</h2>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl mb-4 text-center border border-blue-100">
                  <p className="text-sm font-semibold text-blue-600/80 mb-2 uppercase tracking-wider">Total Tagihan</p>
                  <p className="text-4xl font-black text-blue-700">Rp {total.toLocaleString("id-ID")}</p>
                </div>

                {/* --- RINGKASAN PESANAN (KONFIRMASI) --- */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2 text-xs uppercase tracking-wider">Ringkasan Pesanan</h3>
                  
                  <div className="space-y-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-700 font-medium">{item.name}</span>
                          <span className="text-gray-400 text-xs mt-0.5">
                            {item.quantity} x Rp {item.price.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <span className="font-bold text-gray-800 mt-0.5">
                          Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button className="py-3 bg-gray-100 font-bold rounded-xl text-gray-600 border-2 border-transparent hover:border-blue-500 hover:text-blue-600 transition">Tunai</button>
                  <button className="py-3 bg-gray-100 font-bold rounded-xl text-gray-600 border-2 border-transparent hover:border-blue-500 hover:text-blue-600 transition">QRIS</button>
                </div>

                <div className="flex gap-3 mt-auto">
                  <button onClick={() => setShowCheckout(false)} className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                  <button onClick={handlePayment} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition">Terima Uang</button>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setCart([]); setShowCheckout(false); setPaymentSuccess(false); }} 
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-full transition"
                  title="Tutup"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 mt-2">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-800">Pembayaran Sukses!</h2>
                </div>

                {/* --- RINGKASAN PESANAN (SUKSES) --- */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2 text-xs uppercase tracking-wider">Ringkasan Pesanan</h3>
                  
                  <div className="space-y-4 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-700 font-medium">{item.name}</span>
                          <span className="text-gray-400 text-xs mt-0.5">
                            {item.quantity} x Rp {item.price.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <span className="font-bold text-gray-800 mt-0.5">
                          Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                    <span className="font-bold text-gray-500 text-sm">Total Dibayar</span>
                    <span className="text-xl font-black text-blue-600">Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button onClick={handlePrintReceipt} className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg transition">
                    <Printer size={20} /> Cetak Struk
                  </button>
                  
                  <div className="flex gap-2">
                    <input 
                      type="email" placeholder="Email pelanggan..." 
                      value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} 
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium" 
                    />
                    <button 
                      onClick={handleEmailReceipt} 
                      disabled={isSendingEmail}
                      className="px-5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition disabled:opacity-50"
                    >
                      {isSendingEmail ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                    </button>
                  </div>

                  <button onClick={() => { setCart([]); setShowCheckout(false); setPaymentSuccess(false); }} className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition">
                    Transaksi Baru
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}