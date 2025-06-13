import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    // Mengubah latar belakang utama agar sesuai dengan tema
    <div className="flex min-h-screen flex-col bg-pink-50/50">
      <Navbar />
      {/* Container utama untuk konten halaman */}
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
      {/* Footer dengan sentuhan tema */}
      <footer className="border-t border-pink-100/80 py-4 bg-white/30 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-gray-600 md:text-left">
            &copy; {new Date().getFullYear()} MantabJo. All rights reserved.
          </p>
          <p className="text-center text-sm text-pink-700 font-medium">
            Dibuat dengan ❤️ untuk Istri Tercinta
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;