"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/app/components/Navbar";
// 1. Import Clerk Components
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { 
  ArrowRight, 
  Brain, 
  Activity, 
  Map as MapIcon, 
  Zap, 
  Layers, 
  ShieldAlert,
  Cpu,
  Globe,
  Server
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#020617] text-white font-sans selection:bg-purple-500/50 overflow-x-hidden">
      
      {/* --- 1. CINEMATIC BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Moving Floor */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] animate-grid-flow"></div>
        
        {/* The "Reactor" Glow behind Hero */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* --- 2. NAVBAR --- */}
      <Navbar></Navbar>

      <main className="relative z-10 pt-40 pb-20">
        
        {/* --- 3. HERO SECTION --- */}
        <div className="max-w-7xl mx-auto px-6 text-center relative">
          
          {/* Massive Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.0] text-white drop-shadow-2xl"
          >
            TRANSFORM CHAOS<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 animate-gradient">
              INTO INTELLIGENT ACTION.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
          >
            The Operating System for <span className="text-white font-medium">Future Cities</span>. 
            We turn administrative chaos into prioritized, AI-driven action.
          </motion.p>

          {/* 3D Dashboard Mockup (Exploded View) */}
          <motion.div 
            initial={{ opacity: 0, y: 100, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.4, duration: 1, type: "spring" }}
            className="mt-20 relative z-10 mx-auto max-w-6xl perspective-2000"
          >
            {/* Main Dashboard Card */}
            <div className="relative rounded-[24px] border border-white/10 bg-[#0A0510]/80 backdrop-blur-2xl shadow-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-700 ring-1 ring-white/5">
                
               {/* Browser Header */}
               <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-6 gap-2">
                 <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                 </div>
                 <div className="mx-auto h-6 w-96 bg-white/5 rounded-md border border-white/5 flex items-center justify-center text-[10px] text-gray-600 font-mono">civicmind.ai/live-monitor</div>
               </div>
               
               {/* Dashboard Content Mockup */}
               <div className="p-8 grid grid-cols-12 gap-6 h-[500px]">
                  {/* Left Sidebar */}
                  <div className="col-span-1 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-4 p-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20" />
                      <div className="w-8 h-8 rounded-lg bg-white/5" />
                      <div className="w-8 h-8 rounded-lg bg-white/5" />
                  </div>

                  {/* Main Map Area */}
                  <div className="col-span-8 bg-[#05020A] rounded-2xl border border-white/10 relative overflow-hidden">
                      {/* Map Grid */}
                      <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,#1e293b_1px),linear-gradient(90deg,transparent_1px,#1e293b_1px)] bg-[size:40px_40px] opacity-20" />
                      
                      {/* Scanner Effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(168,85,247,0.1))] animate-scan" />
                      
                      {/* Data Points */}
                      <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                      <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_20px_red]" />
                      
                      <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  </div>

                  {/* Right Panel */}
                  <div className="col-span-3 space-y-4">
                      <div className="h-1/3 bg-gradient-to-br from-purple-900/20 to-transparent rounded-2xl border border-purple-500/30 p-4 flex flex-col justify-center items-center">
                         <Cpu className="w-8 h-8 text-purple-400 mb-2" />
                         <div className="h-2 w-16 bg-purple-500/30 rounded-full" />
                      </div>
                      <div className="h-2/3 bg-white/5 rounded-2xl border border-white/5 p-4 space-y-3">
                         <div className="h-8 w-full bg-white/5 rounded-lg" />
                         <div className="h-8 w-full bg-white/5 rounded-lg" />
                         <div className="h-8 w-full bg-white/5 rounded-lg" />
                      </div>
                  </div>
               </div>
            </div>

            {/* --- FLOATING UI ELEMENTS (The "Exploded" Look) --- */}
            
            {/* Card 1: Critical Alert */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-12 top-20 w-64 p-4 bg-[#0F0518] rounded-2xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)] z-20"
            >
               <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Critical Risk</span>
               </div>
               <div className="text-white text-sm font-bold">Water Main Rupture</div>
               <div className="text-gray-500 text-xs">Zone A • 98% Probability</div>
            </motion.div>

            {/* Card 2: AI Processing */}
            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-12 bottom-32 w-56 p-4 bg-[#0F0518] rounded-2xl border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] z-20"
            >
               <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Live Analysis</span>
               </div>
               <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div className="w-2/3 h-full bg-purple-500" />
               </div>
               <div className="text-gray-400 text-xs font-mono">Processing 2,403 logs/sec</div>
            </motion.div>

            {/* Glow under the mockup */}
            <div className="absolute -inset-10 bg-purple-600/20 blur-[100px] -z-10 rounded-full opacity-60" />
          </motion.div>

        </div>

        {/* --- 4. BENTO GRID FEATURES --- */}
        <div id="mission" className="max-w-7xl mx-auto px-6 mt-48">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Intelligence Built In.</h2>
            <p className="text-gray-400 text-xl">Beyond digitization. We make your city infrastructure think.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="md:col-span-2 group p-10 rounded-[40px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-purple-500/30 transition-all relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
               <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                     <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                        <Brain className="w-6 h-6 text-purple-400" />
                     </div>
                     <h3 className="text-3xl font-bold text-white mb-4">Semantic Understanding</h3>
                     <p className="text-gray-400 text-lg leading-relaxed">
                        Our LLM doesn't just read text; it understands context. It knows that "no water" and "dry tap" are the same emergency, grouping them instantly.
                     </p>
                  </div>
                  <div className="w-full md:w-1/3 bg-black/40 rounded-2xl border border-white/10 p-6 font-mono text-xs text-gray-400 shadow-xl">
                     <div className="flex gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-red-500"/> Incoming Report</div>
                     <div className="text-white mb-4">"Pipe burst on Main St..."</div>
                     <div className="h-px bg-white/10 w-full mb-4" />
                     <div className="text-purple-400">Detected: Infrastructure Failure</div>
                     <div className="text-purple-400">Priority: Critical</div>
                  </div>
               </div>
            </div>

            {/* Feature 2 */}
            <div className="group p-10 rounded-[40px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                 <Globe className="w-32 h-32 text-indigo-500" />
               </div>
               <div className="relative z-10">
                 <MapIcon className="w-12 h-12 text-indigo-400 mb-6" />
                 <h3 className="text-2xl font-bold text-white mb-4">Spatial Intelligence</h3>
                 <p className="text-gray-400 leading-relaxed">
                   Auto-clusters grievances by location. We visualize the "Heatmap of Dissatisfaction" in real-time.
                 </p>
               </div>
            </div>

            {/* Feature 3 */}
            <div className="group p-10 rounded-[40px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-20">
                 <Layers className="w-32 h-32 text-pink-500" />
               </div>
               <div className="relative z-10">
                 <Zap className="w-12 h-12 text-pink-400 mb-6" />
                 <h3 className="text-2xl font-bold text-white mb-4">Predictive Risk</h3>
                 <p className="text-gray-400 leading-relaxed">
                   Our models analyze historical patterns to predict infrastructure failure 48 hours before it happens.
                 </p>
               </div>
            </div>

            {/* Feature 4 (Wide) */}
            <div className="md:col-span-2 group p-10 rounded-[40px] bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 relative overflow-hidden">
               <div className="relative z-10 flex flex-col items-center text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">Ready to Modernize?</h3>
                  <p className="text-gray-400 mb-8 max-w-lg">Join the city administrators who are switching from spreadsheets to Neural Networks.</p>
                  <Link href="/login">
                    <button className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
                        Deploy CivicMind <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
               </div>
               {/* Background Grid */}
               <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,rgba(168,85,247,0.1)_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

          </div>
        </div>

        {/* --- 5. TECH STACK (Marquee) --- */}
        <div id="tech" className="max-w-7xl mx-auto px-6 mt-40 mb-20">
           <div className="border-t border-white/5 pt-12">
              <p className="text-center text-gray-500 text-sm font-mono uppercase tracking-widest mb-12">Powered By</p>
              <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                 <div className="flex items-center gap-3"><Globe className="w-8 h-8" /><span className="font-bold text-2xl">Next.js</span></div>
                 <div className="flex items-center gap-3"><Cpu className="w-8 h-8" /><span className="font-bold text-2xl">TensorFlow</span></div>
                 <div className="flex items-center gap-3"><Server className="w-8 h-8" /><span className="font-bold text-2xl">Python</span></div>
                 <div className="flex items-center gap-3"><Brain className="w-8 h-8" /><span className="font-bold text-2xl">Llama 3</span></div>
              </div>
           </div>
        </div>

      </main>

      {/* --- 6. FOOTER --- */}
      <footer className="border-t border-white/10 bg-[#010308] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
               <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">CivicMind AI</span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2025 Team Git&Run.
          </p>
        </div>
      </footer>

      {/* Styles for Animations */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s linear infinite;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes grid-flow {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }
        .perspective-2000 {
          perspective: 2000px;
        }
      `}</style>
    </div>
  );
}