"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ShieldAlert,
  Zap,
  Activity,
  ArrowRight,
  Upload,
  Logs,
  CheckCircle2,
  Building2,
  AlertTriangle,
  Trash2,
  Network,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";

// Dynamic import for the Map component to avoid SSR issues
const RiskMap = dynamic(() => import("@/app/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#05020A] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data
  useEffect(() => {
    setMounted(true);
    const storedData = localStorage.getItem("dashboardData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        const sortedData = parsedData.sort(
          (a: any, b: any) => (b.score || 0) - (a.score || 0)
        );
        setTasks(sortedData);
      } catch (error) {
        console.error("Failed to load data", error);
        setTasks([]);
      }
    }
  }, []);

  const clearHistory = () => {
    if (confirm("Clear all dashboard history?")) {
      localStorage.removeItem("dashboardData");
      setTasks([]);
      setSelectedTicket(null);
    }
  };

  const testConnection = async () => {
    try {
      console.log("Testing connection to http://localhost:8001/health...");
      const res = await axios.get("http://localhost:8001/health");
      alert(
        `✅ Server is Online!\nStatus: ${res.data.status}\nDevice: ${res.data.device}`
      );
    } catch (error: any) {
      console.error("Connection failed:", error);
      alert(
        `❌ Connection Failed.\nMake sure backend is running on port 8001.\nError: ${error.message}`
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    console.log("📂 Files selected:", e.target.files.length);
    setLoading(true);

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        console.log(`\n🔍 Processing: ${file.name}`);

        // --- STEP 1: Extract Text via External Backend (Port 8000) ---
        console.log("📤 Sending file to extraction service (Port 8000)...");

        const formData = new FormData();
        formData.append("files", file);

        const extractionResponse = await axios.post(
          "http://localhost:8000/process-complaints",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log("📄 Extraction Response:", extractionResponse.data);

        // ⚠️ Parsing logic updated for your existing backend structure
        // Backend returns: { "results": [ { "extracted": { "complaint": "..." } } ] }
        const resultItem = extractionResponse.data.results?.[0];
        const textContent = resultItem?.extracted?.complaint;

        if (!textContent || typeof textContent !== "string") {
          throw new Error(
            `Failed to extract text from ${
              file.name
            }. Backend returned: ${JSON.stringify(extractionResponse.data)}`
          );
        }

        console.log(`📝 Extracted text length: ${textContent.length}`);
        // --- STEP 2: Analyze Text via AI Backend (Port 8001) ---
        console.log("📤 Sending text to AI Backend (Port 8001)...");

        const response = await axios.post("http://localhost:8001/chat", {
          query: textContent,
          top_k: 2,
        });

        console.log("✅ Full Response:", response.data);

        const aiAnswer = response.data.answer || response.data;
        console.log("🤖 AI Answer:", aiAnswer);

        if (!aiAnswer) {
          throw new Error("Backend returned empty response");
        }

        const severityMap: Record<string, number> = {
          Critical: 98,
          High: 85,
          Medium: 65,
          Low: 40,
        };

        const severity = aiAnswer?.severity || "Medium";
        const score = severityMap[severity] || 60;

        const newTask = {
          id: `AI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name,
          zone: aiAnswer?.location || aiAnswer?.zone || "Detected Zone",
          priority: severity,
          department: aiAnswer?.department || "General",
          explanation:
            aiAnswer?.explanation ||
            aiAnswer?.context ||
            "No explanation provided.",
          resolution:
            aiAnswer?.resolution ||
            aiAnswer?.recommended_action ||
            "No resolution provided.",
          score: score,
          time: "Just now",
          coords: [19.076, 72.8777],
        };

        console.log("✅ Created task:", newTask);

        setTasks((prev) => {
          const merged = [newTask, ...prev];
          const sorted = merged.sort((a: any, b: any) => b.score - a.score);
          localStorage.setItem("dashboardData", JSON.stringify(sorted));
          return sorted;
        });
      }

      alert(`✅ Successfully processed ${e.target.files.length} file(s)!`);
    } catch (error: any) {
      console.error("❌ Error:", error);

      let errorMessage = "Failed to process file:\n\n";
      if (error.response) {
        errorMessage += `Backend Error: ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMessage += `Connection Error: Check if backends (8000 & 8001) are running.`;
      } else {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  // Helper for small list items
  const getPriorityStyles = (p: string) => {
    const priority = p?.toLowerCase();
    if (priority === "critical")
      return "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
    if (priority === "high")
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    if (priority === "medium")
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  };

  if (!mounted) return null;
  const criticalTasks = tasks.filter(
    (t) => t.priority === "Critical" || t.priority === "High"
  );

  return (
    <div className="relative min-h-screen bg-[#05020A] text-white overflow-hidden font-sans selection:bg-purple-500/30">
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.csv,.json"
      />

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/3 w-200 h-200 bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      </div>

      <div className="relative z-10 flex h-screen">
        <Navbar />
        <main className="flex-1 mt-20 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
            {/* STATS STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Files Processed",
                  val: tasks.length,
                  sub: "Live Data",
                  icon: FileText,
                  color: "text-indigo-400",
                },
                {
                  label: "High Risk Zones",
                  val: criticalTasks.length,
                  sub: "Action Req",
                  icon: ShieldAlert,
                  color: "text-red-400",
                  alert: criticalTasks.length > 0,
                },
                {
                  label: "Avg Risk Score",
                  val:
                    tasks.length > 0
                      ? Math.round(
                          tasks.reduce((a, b) => a + b.score, 0) / tasks.length
                        )
                      : 0,
                  sub: "Global Index",
                  icon: Activity,
                  color: "text-amber-400",
                },
                {
                  label: "System Status",
                  val: "ONLINE",
                  sub: "Latency 12ms",
                  icon: Zap,
                  color: "text-emerald-400",
                },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 group backdrop-blur-md ${
                    stat.alert
                      ? "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "bg-white/10 border-white/10 hover:bg-white/15"
                  }`}
                >
                  <div className="relative z-10">
                    <h3 className="text-4xl font-bold text-white tracking-tight mb-1">
                      {stat.val}
                    </h3>
                    <div className="flex items-center gap-2">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[850px]">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                {/* MAP */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-[2] relative rounded-[32px] overflow-hidden border border-white/10 bg-[#0A0510] shadow-2xl group"
                >
                  <div className="w-full h-full opacity-100 transition-opacity">
                    <RiskMap data={tasks} />
                  </div>
                </motion.div>

                {/* PRIORITY QUEUE */}
                <div className="flex-[1] bg-white/[0.02] border border-white/5 rounded-[24px] p-6 backdrop-blur-md flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Priority Queue</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={testConnection}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-xs transition-all"
                      >
                        <Network className="w-3 h-3" /> Test API
                      </button>

                      {tasks.length > 0 && (
                        <button
                          onClick={clearHistory}
                          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      )}
                      <button
                        onClick={triggerUpload}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all text-sm disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Logs className="w-4 h-4 animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" /> Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar relative z-10 h-full">
                    {tasks.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No analyzed data found.</p>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTicket(task)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                            selectedTicket?.id === task.id
                              ? "bg-purple-500/10 border-purple-500/30"
                              : "bg-transparent border-transparent hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`font-mono font-bold text-lg ${
                                task.priority === "Critical"
                                  ? "text-red-400"
                                  : "text-purple-300"
                              }`}
                            >
                              {task.score}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {task.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {task.zone}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${getPriorityStyles(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Track Button */}
                <Link href="/dashboard/track">
                  <button className="group relative w-full px-8 py-3 bg-white text-black font-bold rounded-xl hover:scale-[1.01] transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Track complaints <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </Link>
              </div>

              {/* RIGHT COLUMN (AI Details) */}
              <div className="lg:col-span-4 flex flex-col h-full bg-[#0F0518]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {selectedTicket ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex flex-col relative z-10 overflow-hidden"
                    >
                      {/* HEADER BADGES */}
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        {/* Severity Badge */}
                        <div
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-[0_0_15px_rgba(0,0,0,0.3)] backdrop-blur-md ${
                            selectedTicket.priority === "Critical"
                              ? "bg-red-500/20 border-red-500/50 text-red-100 shadow-red-500/10"
                              : selectedTicket.priority === "High"
                              ? "bg-orange-500/20 border-orange-500/50 text-orange-100 shadow-orange-500/10"
                              : selectedTicket.priority === "Medium"
                              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-100"
                              : "bg-purple-500/20 border-purple-500/50 text-purple-100"
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span className="font-bold text-sm tracking-wide uppercase">
                            {selectedTicket.priority} SEVERITY
                          </span>
                        </div>

                        {/* Department Badge */}
                        {selectedTicket.department && (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-100 shadow-lg shadow-blue-500/10 backdrop-blur-md">
                            <Building2 className="w-4 h-4" />
                            <span className="font-bold text-sm">
                              {selectedTicket.department}
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-6 leading-snug break-words tracking-tight">
                        {selectedTicket.title}
                      </h3>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                        <div className="p-5 bg-[#05020A] rounded-2xl border border-white/10 shadow-inner">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-gray-300" />{" "}
                            Context & Explanation
                          </h4>
                          <p className="text-gray-200 text-base leading-relaxed">
                            {selectedTicket.explanation ||
                              "No explanation provided."}
                          </p>
                        </div>

                        <div className="p-5 bg-gradient-to-br from-purple-600/20 to-indigo-600/10 rounded-2xl border border-purple-500/30 shadow-lg">
                          <h4 className="text-xs font-bold text-purple-200 uppercase mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-purple-300" />{" "}
                            Recommended Resolution
                          </h4>
                          <p className="text-white text-base leading-relaxed font-medium">
                            {selectedTicket.resolution ||
                              "No resolution provided."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="mt-6 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        Close Analysis
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="alert-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col relative z-10 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                          <span className="text-red-400 font-bold tracking-widest text-xs uppercase">
                            Threat Level: Critical
                          </span>
                        </div>
                      </div>
                      {criticalTasks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                          <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500" />
                          <p>All clear.</p>
                        </div>
                      ) : (
                        <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                          <p className="text-xs text-gray-500 mb-2">
                            Select a task on the left to view AI resolution
                            plan.
                          </p>
                          {criticalTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTicket(task)}
                              className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl hover:bg-red-500/20 cursor-pointer transition-colors group"
                            >
                              <div className="text-white text-sm font-bold mb-1 group-hover:text-red-200 transition-colors">
                                {task.title}
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-red-300 text-xs font-medium">
                                  {task.zone}
                                </div>
                                <ArrowRight className="w-4 h-4 text-red-400 -rotate-45 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
