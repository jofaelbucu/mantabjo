import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

import logoMantabJo from '@/assets/mantabjo-merpati.png';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }
    const timer = setTimeout(() => {
      navigate(user ? '/dashboard' : '/login');
    }, 3500); 

    return () => clearTimeout(timer);
  }, [loading, user, navigate]);


  return (
    // PERUBAHAN 1: Mengganti gradient background menjadi nuansa pink
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-pink-500 to-rose-600 p-4">
      <motion.div
        className="flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.img
          src={logoMantabJo}
          alt="Logo MantabJo"
          className="w-48 h-auto" 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, type: "spring", stiffness: 100, damping: 15 }}
        />
        
        <motion.p 
          // PERUBAHAN 2: Menyesuaikan warna teks agar kontras dan rapi
          className="text-xl text-white mt-4 font-semibold tracking-wide"
          style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.2)' }} // Efek bayangan untuk keterbacaan
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Manajemen Tabungan Jofael
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;