import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, Search, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Efek Glassmorphism saat discroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Tutup menu mobile saat pindah halaman
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Top Up Robux', path: '/', icon: <ShoppingBag className="w-4 h-4" /> },
    { name: 'Cek Pesanan', path: '/status', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent ${
        scrolled 
          ? 'bg-dark-bg/80 backdrop-blur-xl border-white/5 shadow-lg shadow-neon-primary/5' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-neon-primary to-neon-secondary p-2 rounded-lg group-hover:shadow-[0_0_15px_rgba(0,255,157,0.5)] transition-shadow duration-300">
              <Zap className="text-black w-6 h-6 fill-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              My<span className="text-neon-primary">Robux</span>
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
                    isActive ? 'text-neon-primary' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.icon}
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="underline"
                      className="absolute -bottom-8 left-0 right-0 h-[2px] bg-neon-primary shadow-[0_0_10px_#00ff9d]"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-300 hover:text-white p-2"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-neon-primary/10 text-neon-primary border border-neon-primary/20' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.icon}
                    <span className="font-medium">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}