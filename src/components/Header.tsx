'use client';

import React from 'react';
import { Menu, Search, Bell, HelpCircle } from 'lucide-react';

interface HeaderProps {
    title: string;
}

// NOTE: With the new Sidebar design, the "Header" is mostly integrated into each view.
// This component is kept for mobile responsiveness or global actions if needed, 
// but in desktop view, it might be hidden or simplified.
const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-slate-100 rounded-md -ml-2">
            <Menu size={20} className="text-slate-600"/>
        </button>
        <span className="font-semibold text-slate-800">{title}</span>
      </div>

      <div className="flex items-center gap-2">
         <button className="p-2 text-slate-500">
             <Search size={20} />
         </button>
      </div>
    </header>
  );
};

export default Header;

