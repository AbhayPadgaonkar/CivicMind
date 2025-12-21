"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map as MapIcon,
  FileText,
  Bell,
  Search,
  CheckCircle,
  ArrowRight,
  Zap,
  Cpu,
  ShieldAlert,
  X,
  Activity,
  Siren,
  Upload,
  Logs,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";

const DUMMY_TASKS = [
  {
    id: "CMP-001",
    title: "Severe water leakage near main road",
    zone: "Ward 12 – Andheri East",
    priority: "Critical",
    score: 92,
    time: "2 mins ago",
    coords: [19.1136, 72.8697],
    fullAnalysis:
      "Major water pipeline leakage reported near the main road. Continuous water wastage observed, affecting traffic and nearby residences. Immediate intervention required to prevent further damage.",
  },
  {
    id: "CMP-002",
    title: "Garbage not collected for 5 days",
    zone: "Ward 7 – Borivali West",
    priority: "High",
    score: 78,
    time: "15 mins ago",
    coords: [19.2317, 72.8441],
    fullAnalysis:
      "Residents have reported accumulation of garbage for more than five days, causing foul smell and health risks. Sanitation department needs to deploy collection immediately.",
  },
  {
    id: "CMP-003",
    title: "Street light not working",
    zone: "Ward 3 – Dadar",
    priority: "Medium",
    score: 54,
    time: "30 mins ago",
    coords: [19.0176, 72.8562],
    fullAnalysis:
      "Multiple street lights reported non-functional, causing safety concerns during night hours. Electrical maintenance required.",
  },
  {
    id: "CMP-004",
    title: "Illegal construction blocking drainage",
    zone: "Ward 19 – Kurla",
    priority: "Critical",
    score: 88,
    time: "1 hour ago",
    coords: [19.0728, 72.8826],
    fullAnalysis:
      "Unauthorized construction activity is blocking stormwater drainage, increasing flood risk during monsoon. Enforcement action required.",
  },
  {
    id: "CMP-005",
    title: "Potholes causing traffic congestion",
    zone: "Ward 10 – Malad East",
    priority: "High",
    score: 71,
    time: "2 hours ago",
    coords: [19.1864, 72.8484],
    fullAnalysis:
      "Large potholes reported on main road leading to frequent traffic jams and vehicle damage. Road repair team needs scheduling.",
  },
];


// --- Dynamic Map Import ---
const RiskMap = dynamic(() => import("@/app/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#05020A] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function Dashboard() {
  // --- STATE ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hidden file input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FIXED: Load real data from localStorage
  useEffect(() => {
    setMounted(true);

    // Try to load data from localStorage (set by InputPage)
    const storedData = localStorage.getItem("dashboardData");

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);

        // Transform data to ensure correct structure
        const transformedData = parsedData.map((item: any) => ({
          id: item.id || `task-${Date.now()}-${Math.random()}`,
          title: item.title || item.source || "Unknown Issue",
          zone: item.zone || item.location || "Unknown Location",
          priority: item.priority || item.severity || "Medium",
          score: item.score || item.risk_score || 50,
          time: item.time || "Recently",
          coords: item.coords || item.coordinates || [19.0760, 72.8777], // Default Mumbai coords
          fullAnalysis: item.fullAnalysis || item.complaint || "No detailed analysis available.",
        }));

        const sortedData = transformedData.sort((a: any, b: any) => b.score - a.score);
        setTasks(sortedData);

        console.log("✅ Loaded analyzed data from localStorage:", sortedData);
      } catch (error) {
        console.error("❌ Failed to parse stored data:", error);
        console.warn("⚠️ Using dummy data as fallback");
        setTasks(DUMMY_TASKS);
      }
    } else {
      console.warn("⚠️ No analyzed data found in localStorage, using dummy data");
      setTasks(DUMMY_TASKS);
    }
  }, []);

  // --- API LOGIC (In case user uploads MORE files from dashboard) ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      // Call Python Backend
      const response = await axios.post(
        "http://127.0.0.1:8000/process-complaints",
        formData
      );

      console.log("✅ Backend response:", response.data);

      // TRANSFORM DATA
      const newTasks = response.data.results.map(
        (item: any, index: number) => ({
          id: `API-${Date.now()}-${index}`,
          title: item.extracted.subject || "Unknown Issue",
          zone: item.extracted.location || "Unknown Location",
          priority: item.risk_analysis.severity,
          score: item.risk_analysis.risk_score,
          time: "Just now",
          coords: item.extracted.coordinates || [19.0760, 72.8777],
          fullAnalysis: item.extracted.complaint,
        })
      );

      // Merge new files with existing tasks and sort
      setTasks((prev) => {
        const merged = [...newTasks, ...prev];
        const sorted = merged.sort((a: any, b: any) => b.score - a.score);

        // Update localStorage with new merged data
        localStorage.setItem("dashboardData", JSON.stringify(sorted));
        console.log("✅ Updated localStorage with new data");

        return sorted;
      });
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert("Failed to connect to AI Backend. Is it running on http://127.0.0.1:8000?");
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

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

  // Derived State
  const criticalTasks = tasks.filter(
    (t) => t.priority === "Critical" || t.priority === "High"
  );

  return (
    <div className="relative min-h-screen bg-[#05020A] text-white overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.doc"
      />

      {/* BACKGROUND AMBIENCE */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/3 w-200 h-200 bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* MAIN CONTENT */}
        <Navbar></Navbar>
        <main className="flex-1 mt-20 flex flex-col relative overflow-hidden">
          {/* DASHBOARD BODY */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
            {/* STATS STRIP - NOW DYNAMIC */}
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
                  className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 group
                    ${stat.alert
                      ? "bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                      : "bg-white/[0.02] border-white/5"
                    }
                  `}
                >
                  <div className="relative z-10">
                    <h3 className="text-4xl font-bold text-white tracking-tight mb-1">
                      {stat.val}
                    </h3>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[600px]">
              {/* LEFT: MAP & LIST */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* MAP - PASS DATA PROP */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 relative rounded-[32px] overflow-hidden border border-white/10 bg-[#0A0510] shadow-2xl group"
                >
                  <div className="w-full h-full opacity-70 group-hover:opacity-100 transition-opacity mix-blend-lighten">
                    <RiskMap data={tasks} />
                  </div>
                </motion.div>

                {/* TASK LIST - USING REAL 'tasks' STATE */}
                <div className="h-1/2 bg-white/[0.02] border border-white/5 rounded-[24px] p-6 backdrop-blur-md flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Priority Queue</h3>
                    <button
                      onClick={triggerUpload}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all text-sm"
                    >
                      {loading ? (
                        <>
                          <Logs className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Add More Files
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar relative z-10">
                    {tasks.length === 0 ? (
                      <div className="text-center text-gray-500 py-10">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No analyzed data found.</p>
                        <p className="text-xs mt-2">Upload files from the Input Page or use the button above.</p>
                      </div>
                    ) : (
                      tasks.map((task, i) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTicket(task)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group
                               ${selectedTicket?.id === task.id
                              ? "bg-purple-500/10 border-purple-500/30"
                              : "bg-transparent border-transparent hover:bg-white/5"
                            }
                            `}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`font-mono font-bold text-lg ${task.priority === "Critical"
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
                <Link href="/dashboard/track">
                  <button className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <span className="relative z-10 flex items-center gap-3">
                      Track complaints <ArrowRight className="w-5 h-5" />
                    </span>
                  </button>
                </Link>
              </div>

              {/* RIGHT: AI PANEL - USING 'selectedTicket' or 'criticalTasks' */}
              <div className="lg:col-span-4 flex flex-col h-full bg-[#0F0518]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {selectedTicket ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex-1 flex flex-col relative z-10 overflow-hidden"
                    >
                      <h3 className="text-2xl font-bold text-white mb-6 leading-tight">
                        {selectedTicket.title}
                      </h3>
                      <div className="p-5 bg-[#05020A] rounded-2xl border border-white/5 mb-6 shadow-inner">
                        <h4 className="text-xs font-bold text-purple-400 uppercase mb-4 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> AI Analysis
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {selectedTicket.fullAnalysis}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                      >
                        Back to Feed
                      </button>
                    </motion.div>
                  ) : (
                    // DEFAULT VIEW (Critical Feed)
                    <motion.div
                      key="alert-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col relative z-10 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                          <span className="text-red-400 font-bold tracking-widest text-xs uppercase">
                            Threat Level: Critical
                          </span>
                        </div>
                        <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">
                          {criticalTasks.length} Issues
                        </span>
                      </div>

                      {criticalTasks.length === 0 && (
                        <p className="text-gray-500 text-sm italic">
                          No critical threats detected.
                        </p>
                      )}

                      <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {criticalTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-5 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl"
                          >
                            <div className="text-white text-lg font-bold">
                              {task.title}
                            </div>
                            <div className="text-red-300/70 text-xs mb-3">
                              {task.zone}
                            </div>
                            <button
                              onClick={() => setSelectedTicket(task)}
                              className="text-xs text-red-400 underline flex items-center gap-1 hover:text-red-300 transition-colors"
                            >
                              View Analysis <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
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