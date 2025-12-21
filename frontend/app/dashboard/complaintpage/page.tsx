"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import axios from "axios"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  UploadCloud, 
  RefreshCw, 
  Terminal, 
  Loader2,
  Database,
  ArrowRight,
  FileText,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";


export default function InputPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 🔧 ALL STATE HOOKS (no conditions)
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [fetchedEmails, setFetchedEmails] = useState<any[]>([]);
  const [loginTime, setLoginTime] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ EFFECT 1: auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // ✅ EFFECT 2: client-only time
  useEffect(() => {
    setLoginTime(new Date().toLocaleTimeString());
  }, []);

  // 🚫 RETURNS ONLY AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Initializing secure session…
      </div>
    );
  }

  if (!user) return null;
  
  // --- EXISTING GMAIL FETCH ---
  const handleFetchComplaints = async () => {
  setIsFetching(true);
  setLogs(["> Initializing secure connection to Gmail Gateway..."]);
  setFetchedEmails([]); 

  try {
    const res = await fetch("/api/gmail/fetch");
    
    // Check auth first
    if (res.status === 401) {
      setLogs(prev => [...prev, "> Authentication required. Redirecting to Secure Auth..."]);
      setTimeout(() => { window.location.href = "/api/gmail/auth"; }, 1500);
      return;
    }

    // ✅ CHECK IF RESPONSE IS OK BEFORE PARSING JSON
    if (!res.ok) {
      const errorText = await res.text(); // Get error as text first
      console.error("API Error Response:", errorText);
      setLogs(prev => [...prev, `> Error: Server returned ${res.status}. Check console for details.`]);
      setIsFetching(false);
      return;
    }

    // ✅ CHECK CONTENT TYPE
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await res.text();
      console.error("Non-JSON response:", text);
      setLogs(prev => [...prev, "> Error: Server returned invalid response format."]);
      setIsFetching(false);
      return;
    }

    // ✅ NOW SAFE TO PARSE JSON
    const data = await res.json();
    
    if (data.logs) {
      data.logs.forEach((log: string, index: number) => {
        setTimeout(() => setLogs(prev => [...prev, log]), index * 400);
      });
      
      setTimeout(() => {
        if (data.emails) setFetchedEmails(data.emails);
        setIsFetching(false);
      }, data.logs.length * 400 + 500);
    }

  } catch (error) {
    console.error("Fetch error:", error);
    setLogs(prev => [...prev, "> Error: Connection failed. Check network and console."]);
    setIsFetching(false);
  }
};
  // --- NEW MANUAL UPLOAD HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true);
    setLogs(prev => [...prev, `> Uploading ${files.length} manual document(s)...`]);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      console.log("📤 Sending request to backend...");
      
      const response = await axios.post("http://127.0.0.1:8000/process-complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Backend Response:", response.data);

      setLogs(prev => [...prev, `> Success: Processed ${response.data.results.length} files.`]);
      
      // ✅ CORRECT DATA MAPPING - filename is at ROOT level
      const newEntries = response.data.results.map((item: any, index: number) => {
        console.log(`Processing item ${index}:`, item); // Debug each item
        
        return {
          // Fields for THIS Page (Input Page Table)
          id: `manual-${Date.now()}-${index}`,
          source: item.extracted.subject || item.filename || "Unnamed Document",
          sender: item.extracted.sender || "Manual Upload",
          contentType: item.filename?.endsWith('.pdf') ? "PDF Report" : 
                       item.filename?.endsWith('.docx') ? "DOCX Document" : 
                       item.filename?.endsWith('.csv') ? "CSV Structure" :
                       "Document",
          timestamp: new Date().toISOString(),
          
          // Fields for RESULT Page (Dashboard)
          title: item.extracted.subject || item.filename || "Unknown Issue",
          zone: item.extracted.location || "Unknown Location",
          priority: item.risk_analysis.severity, 
          score: item.risk_analysis.risk_score,
          coords: item.extracted.coordinates || [19.0760, 72.8777], // Default Mumbai
          fullAnalysis: item.extracted.complaint || "No detailed analysis available."
        };
      });

      console.log("✅ Transformed Entries:", newEntries);

      // 1. Update Table on Input Page
      setFetchedEmails(prev => {
        const updatedData = [...prev, ...newEntries];
        
        // 2. SAVE TO LOCAL STORAGE FOR NEXT PAGE
        localStorage.setItem("dashboardData", JSON.stringify(updatedData));
        console.log("✅ Saved to localStorage:", updatedData);
        
        return updatedData;
      });

      setLogs(prev => [...prev, `> ✓ Data saved to memory for AI Analysis`]);

    } catch (error: any) {
      console.error("❌ Upload error:", error);
      
      // Better error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        setLogs(prev => [...prev, `> Error: ${error.response.data.detail || 'Backend error'}`]);
      } else if (error.request) {
        console.error("No response received:", error.request);
        setLogs(prev => [...prev, "> Error: No response from backend. Is it running on port 8000?"]);
      } else {
        console.error("Error setting up request:", error.message);
        setLogs(prev => [...prev, `> Error: ${error.message}`]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-purple-500/30 font-sans">
      <Navbar />

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
             <h1 className="text-4xl font-bold mb-2">Data Ingestion Node</h1>
             <p className="text-gray-400">Connect external sources to feed the Decision Support System.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-xs font-mono text-purple-300 uppercase tracking-widest">System Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COL: CONTROLS --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* GMAIL CARD */}
            <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Mail className="w-40 h-40 text-purple-500" />
               </div>
               
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/20">
                        <Mail className="w-6 h-6 text-red-400" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold">Public Complaints Portal</h3>
                        <p className="text-sm text-gray-400">Source: Reports & Grievances (Gmail)</p>
                     </div>
                  </div>

                  <p className="text-gray-400 mb-8 max-w-lg leading-relaxed">
                    Fetch unread emails, recursively extract PDF/CSV attachments, and categorize grievances automatically. 
                  </p>

                  <button 
                    onClick={handleFetchComplaints}
                    disabled={isFetching}
                    className={`
                      relative overflow-hidden px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3
                      ${isFetching 
                        ? "bg-purple-900/20 text-purple-400 border border-purple-500/30 cursor-not-allowed" 
                        : "bg-white text-black hover:scale-[1.02] active:scale-95"}
                    `}
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Fetch & Analyze
                      </>
                    )}
                  </button>
               </div>
            </div>
            
             {/* --- MANUAL UPLOAD SECTION (Now Functional) --- */}
             <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.doc"
             />

             <div 
               onClick={() => fileInputRef.current?.click()}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
               className={`
                  p-8 rounded-3xl border flex items-center justify-between cursor-pointer transition-all duration-300
                  ${isDragging 
                    ? 'bg-blue-500/10 border-blue-400 border-dashed opacity-100 scale-[1.02]' 
                    : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'
                  }
               `}
             >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                     {isUploading ? (
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                     ) : (
                        <UploadCloud className="w-6 h-6 text-blue-400" />
                     )}
                  </div>
                  <div>
                     <h3 className="text-lg font-bold">
                        {isUploading ? "Processing Document Intelligence..." : "Manual Upload"}
                     </h3>
                     <p className="text-xs text-gray-500">
                        {isDragging ? "Release to upload" : "Drag & Drop .DOCX or .PDF reports"}
                     </p>
                  </div>
               </div>
               <div className={`
                  w-8 h-8 rounded-full border flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-blue-500 text-white border-blue-500' : 'border-white/10'}
               `}>+</div>
            </div>

          </div>

          {/* --- RIGHT COL: TERMINAL --- */}
          <div className="lg:col-span-1">
             <div className="h-full min-h-[500px] max-h-[600px] bg-[#0A0510] rounded-3xl border border-white/10 p-6 relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                   <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span className="text-xs  text-gray-400 uppercase">System_Log.sh</span>
                   </div>
                   <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500/20" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                      <div className="w-2 h-2 rounded-full bg-green-500/50" />
                   </div>
                </div>

                <div className="flex-1 text-xs space-y-3 overflow-y-auto font-mono">
                   <div className="text-gray-500">
                      Last login: {loginTime || "..."} on ttys002<br/>
                      CivicMind AI v2.0.4 initialized...
                   </div>
                   <AnimatePresence>
                      {logs.map((log, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-purple-300 border-l-2 border-purple-500/30 pl-3 py-1 break-words"
                        >
                          {log}
                        </motion.div>
                      ))}
                   </AnimatePresence>
                   {(isFetching || isUploading) && (
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-purple-500"
                      >_</motion.div>
                   )}
                </div>
             </div>
          </div>

        </div>

        {/* --- SECTION 3: INGESTION HISTORY TABLE --- */}
        <div className="mt-12">
           <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-400" />
              Ingestion History
           </h2>
           
           <div className="bg-[#0A0510]/50 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                       <th className="py-4 px-6 font-medium">Source Data</th>
                       <th className="py-4 px-6 font-medium">Content Type</th>
                       <th className="py-4 px-6 font-medium">Status</th>
                       <th className="py-4 px-6 font-medium text-right">Timestamp</th>
                    </tr>
                 </thead>
                 <tbody className="text-sm text-gray-300">
                    {fetchedEmails.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                             Waiting for data ingestion... Click "Fetch" to begin.
                          </td>
                       </tr>
                    ) : (
                       fetchedEmails.map((email, idx) => (
                          <motion.tr 
                            key={email.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                             {/* SOURCE COLUMN: Filename Priority */}
                             <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                   {/* Icon logic: PDF vs CSV vs Mail */}
                                   <div className={`p-2 rounded-lg ${
                                      email.contentType.includes("PDF") ? "bg-red-500/10" : 
                                      email.contentType.includes("Structure") ? "bg-blue-500/10" : 
                                      "bg-purple-500/10"
                                   }`}>
                                      {email.contentType.includes("PDF") ? (
                                          <FileText className="w-4 h-4 text-red-400" />
                                      ) : email.contentType.includes("Structure") ? (
                                          <Database className="w-4 h-4 text-blue-400" />
                                      ) : (
                                          <Mail className="w-4 h-4 text-purple-400" />
                                      )}
                                   </div>
                                   
                                   <div>
                                      {/* Main Text: The File Name or Subject */}
                                      <div className="font-bold text-white mb-0.5">
                                          {email.source}
                                      </div>
                                      {/* Sub Text: The Sender Context */}
                                      <div className="text-xs text-gray-500">
                                          Via: {email.sender}
                                      </div>
                                   </div>
                                </div>
                             </td>

                             <td className="py-4 px-6">
                                <span className={`px-2 py-1 rounded text-xs border ${
                                   email.contentType.includes("PDF") 
                                     ? "bg-red-500/10 border-red-500/20 text-red-400" 
                                     : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                }`}>
                                   {email.contentType}
                                </span>
                             </td>

                             <td className="py-4 px-6">
                                <span className="text-green-400 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                   Analyzed ✓
                                </span>
                             </td>

                             <td className="py-4 px-6 text-right text-gray-500 font-mono text-xs">
                                {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </td>
                          </motion.tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>

           {/* --- ANALYZE BUTTON (Appears only after data is fetched) --- */}
           {fetchedEmails.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mt-6"
              >
                <Link href="/dashboard/resultpage">
                   <button className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                      <span className="relative z-10 flex items-center gap-3">
                          View AI Analysis Dashboard <ArrowRight className="w-5 h-5" />
                      </span>
                   </button>
                </Link>
              </motion.div>
           )}

        </div>
      </main>
    </div>
  );
}