"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // TAMBAHKAN INI
import { ShoppingCart, Trash2, CreditCard, Loader2, LogOut } from "lucide-react"; // TAMBAHKAN LogOut
import { supabase } from "../lib/supabase";

// ... (Tipe Data Product & CartItem biarkan sama seperti sebelumnya) ...
type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  color: string;
};

type CartItem = Product & {
  quantity: number;
};

export default function POSPage() {
  const router = useRouter(); // TAMBAHKAN INI
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null); // State untuk menyimpan email user

  useEffect(() => {
    // FUNGSI BARU: Mengecek apakah user sudah login
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login"); // Lempar ke halaman login jika belum masuk
      } else {
        setUserEmail(session.user.email ?? null);
        fetchProducts(); // Hanya ambil produk jika sudah login
      }
    };

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        if (data) setProducts(data);
      } catch (error) {
        console.error("Gagal mengambil data produk:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router]);

  // FUNGSI BARU: Untuk Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ... (Fungsi addToCart, removeFromCart, dan total biarkan sama seperti sebelumnya) ...
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Jika masih loading inisialisasi, tampilkan layar kosong
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">Loyverse Clone POS</h1>
            {/* TAMPILKAN EMAIL USER */}
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Kasir: {userEmail}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded-md text-sm">Semua</button>
              <button className="px-4 py-2 bg-gray-200 rounded-md text-sm">Minuman</button>
              <button className="px-4 py-2 bg-gray-200 rounded-md text-sm">Makanan</button>
            </div>
            {/* TOMBOL LOGOUT */}
            <button 
              onClick={handleLogout}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="p-6 overflow-y-auto flex-1">
          {/* ... (Grid Produk sama seperti sebelumnya) ... */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`${product.color} h-32 rounded-lg shadow-md text-white flex flex-col justify-center items-center hover:opacity-90 transition-opacity active:scale-95`}
                >
                  <span className="font-semibold text-center px-2">{product.name}</span>
                  <span className="text-sm mt-1">Rp {product.price.toLocaleString("id-ID")}</span>
                </button>
              ))}
            </div>
        </main>
      </div>

      {/* ... (Bagian Kanan / Keranjang / Ticket biarkan persis sama seperti sebelumnya) ... */}
      <div className="w-96 bg-white shadow-xl flex flex-col z-10">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-700">
            <ShoppingCart size={20} />
            <span className="font-semibold">Ticket Baru</span>
          </div>
          <button onClick={() => setCart([])} className="text-red-500 text-sm hover:underline">
            Kosongkan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Keranjang masih kosong
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="flex justify-between items-start border-b pb-2">
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-800">
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </p>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-4 text-xl font-bold text-gray-800">
            <span>Total</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <CreditCard size={24} />
            BAYAR
          </button>
        </div>
      </div>
    </div>
  );
}