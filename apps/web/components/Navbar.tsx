'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-slate-900 text-white border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo / Brand */}
            <Link href="/" className="text-xl font-bold tracking-tight">
              Brandon Wilcox Home Group
            </Link>
            
            {/* Main Nav Links */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/search" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
                Buy
              </Link>
              <Link href="/sell" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
                Sell
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
             <button className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
               Sign In
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
