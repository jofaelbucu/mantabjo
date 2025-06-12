import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// PERUBAHAN UTAMA: Path import disesuaikan dengan nama file Anda
import logoMantabJo from '@/assets/mantabjo-logo-vertikal-warna.svg';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Logika navigasi ini sudah baik, tidak perlu diubah
    if (loading) {
      return;
    }
    const timer = setTimeout(() => {
      navigate(user ? '/dashboard' : '/login');
    }, 1500); // Durasi total splash screen

    return () => clearTimeout(timer);
  }, [loading, user, navigate]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-500 to-blue-700 p-4">
      <motion.div
        className="flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Menggunakan tag <img> untuk menampilkan logo yang diimpor */}
        <motion.img
          src={logoMantabJo}
          alt="Logo MantabJo"
          className="w-48 h-auto" // Atur ukuran logo di sini
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, type: "spring", stiffness: 100, damping: 15 }}
        />
        
        <motion.p 
          className="text-xl text-sky-100 mt-4" // Tambahkan margin top untuk memberi jarak dari logo
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Aplikasi Manajemen Keuangan Pulsa & PPOB
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
