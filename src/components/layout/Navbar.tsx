import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Menu, UserCircle2 } from 'lucide-react';

// Path ke logo Anda
import AppLogo from './src/assets/mantabjo-merpati.png';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    // Membuat link Dashboard hanya aktif jika path-nya persis, bukan sebagai awalan
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    // Untuk link lain, akan aktif jika path saat ini diawali dengan path link
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Transaksi', path: '/dashboard/transaksi' },
    { name: 'Modal', path: '/dashboard/modal' },
    { name: 'Pengeluaran', path: '/dashboard/pengeluaran' },
    { name: 'Hutang', path: '/dashboard/hutang' },
    { name: 'Pelanggan', path: '/dashboard/pelanggan' },
    { name: 'Laporan', path: '/dashboard/laporan' },
  ];

  return (
    // Latar belakang navbar dengan efek glassmorphism dan sentuhan pink
    <header className="sticky top-0 z-40 w-full border-b border-pink-100/80 bg-white/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center space-x-2">
            {/* Ukuran logo disesuaikan agar pas di dalam navbar */}
            <img src={AppLogo} alt="MantabJo Logo" className="h-14 w-auto" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              {menuItems.map((item) => (
                <NavigationMenuItem key={item.path}>
                  <Link to={item.path}>
                    {/* Styling untuk link navigasi dengan state aktif dan hover */}
                    <NavigationMenuLink
                      className={`${navigationMenuTriggerStyle()} transition-colors duration-200 text-sm font-medium ${
                        isActive(item.path)
                          ? 'bg-pink-100 text-pink-700 font-semibold focus:bg-pink-100 focus:text-pink-700'
                          : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600 focus:bg-pink-50'
                      }`}
                    >
                      {item.name}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          
          {user && (
            <div className="flex items-center gap-3 border-l pl-4 ml-2">
              <UserCircle2 className="h-5 w-5 text-pink-600" />
              <div className="text-sm font-medium text-gray-700">
                {user.email}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
              >
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs pr-0 bg-white">
              <Link to="/dashboard" className="flex items-center space-x-2 px-4 mb-4">
                 <img src={AppLogo} alt="MantabJo Logo" className="h-12 w-auto" />
              </Link>
              <div className="flex flex-col gap-2 px-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    // Styling untuk link mobile dengan state aktif dan hover
                    className={`flex items-center py-2.5 px-4 rounded-md text-base font-medium transition-colors duration-200 ${
                        isActive(item.path)
                          ? 'bg-pink-100 text-pink-700 font-bold'
                          : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {user && (
                  <>
                    <div className="px-4 py-2 text-sm font-medium border-t pt-4 mt-4 flex items-center gap-2 text-gray-700">
                      <UserCircle2 className="h-4 w-4 text-pink-600"/>
                      {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mx-4 border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                      onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}
                    >
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
