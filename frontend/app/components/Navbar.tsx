"use client";

import React from "react";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* --- LOGO (Left) --- */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            CivicMind <span className="text-purple-400">AI</span>
          </span>
        </Link>

        {/* --- RIGHT SIDE ACTIONS --- */}
        <div className="flex items-center gap-4">
          
          {/* 1. If User is LOGGED OUT (Show Start Now) */}
          <SignedOut>
            <Link href="/sign-up">
              <button className="group relative px-6 py-2.5 rounded-full bg-white text-black font-bold text-xs tracking-widest uppercase overflow-hidden hover:scale-105 transition-transform">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 group-hover:text-white transition-colors flex items-center gap-2">
                  Start now <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </Link>
          </SignedOut>

          {/* 2. If User is LOGGED IN (Show User Profile) */}
          <SignedIn>
            <div className="flex items-center gap-4">
               {/* Optional: Add a Dashboard link if you are on the homepage */}
               {/* <Link href="/dashboard/input_page" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                 Dashboard
               </Link> */}
               
               <UserButton 
                 appearance={{
                   elements: {
                     avatarBox: "w-10 h-10 border-2 border-purple-500/30 hover:border-purple-500 transition-colors"
                   }
                 }}
               />
            </div>
          </SignedIn>

        </div>
      </div>
    </nav>
  );
}