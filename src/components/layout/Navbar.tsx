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
import AppLogo from '@/assets/mantabjo-icon.svg';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center space-x-2">
            {/* PERUBAHAN: Ukuran logo diperbesar */}
            <img src={AppLogo} alt="MantabJo Logo" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              {menuItems.map((item) => (
                <NavigationMenuItem key={item.path}>
                  <Link to={item.path}>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      active={isActive(item.path)}
                    >
                      {item.name}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          
          {user && (
            <div className="flex items-center gap-3 border-l pl-4">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">
                {user.email}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
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
            <SheetContent side="right" className="w-full max-w-xs pr-0">
              <Link to="/dashboard" className="flex items-center space-x-2 px-4 mb-4">
                 {/* PERUBAHAN: Ukuran logo mobile juga disesuaikan */}
                 <img src={AppLogo} alt="MantabJo Logo" className="h-10 w-auto" />
              </Link>
              <div className="flex flex-col gap-2 px-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center py-2 px-4 rounded-md text-base font-medium ${
                        isActive(item.path) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {user && (
                  <>
                    <div className="px-4 py-2 text-sm font-medium border-t pt-4 mt-4 flex items-center gap-2">
                      <UserCircle2 className="h-4 w-4 text-muted-foreground"/>
                      {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mx-4"
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
