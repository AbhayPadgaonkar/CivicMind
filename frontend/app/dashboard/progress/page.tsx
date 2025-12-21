"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Zap,
  Calendar,
  User,
  FileText,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Activity,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";

interface Complaint {
  id: string;
  subject: string;
  complaint: string;
  location: string;
  sender: string;
  date: string;
  risk_score: number;
  severity: string;
  status: string;
  created_at: any;
  population_used?: number;
}

export default function UnresolvedComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUnresolvedComplaints();
  }, []);

  useEffect(() => {
    filterComplaintsList();
  }, [complaints, searchQuery, filterSeverity]);

  const fetchUnresolvedComplaints = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/admin/complaints");
      console.log("✅ Fetched complaints:", response.data);

      // Filter only unresolved (status: "open") and sort by risk_score
      const unresolved = response.data
        .filter((c: any) => c.status === "closed")
        .sort((a: any, b: any) => b.risk_score - a.risk_score);

      setComplaints(unresolved);
    } catch (error) {
      console.error("❌ Failed to fetch complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaintsList = () => {
    let filtered = [...complaints];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.sender?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Severity filter
    if (filterSeverity !== "all") {
      filtered = filtered.filter(
        (c) => c.severity?.toLowerCase() === filterSeverity.toLowerCase()
      );
    }

    setFilteredComplaints(filtered);
  };

  const markAsResolved = async (id: string) => {
  try {
    // Call backend to update Firebase
    const response = await axios.patch(
      `http://127.0.0.1:8000/admin/complaints/${id}/resolve`
    );
    
    console.log("✅ Backend response:", response.data);
    
    // Remove from UI (since it's now "closed")
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    setFilteredComplaints((prev) => prev.filter((c) => c.id !== id));
    setSelectedComplaint(null);
    
    // Optional: Show success toast/notification
    alert("Complaint marked as resolved!");
    
  } catch (error: any) {
    console.error("❌ Failed to mark as resolved:", error);
    alert(error.response?.data?.detail || "Failed to resolve complaint");
  }
};

  const getPriorityStyles = (severity: string) => {
    const sev = severity?.toLowerCase();
    if (sev === "critical")
      return "text-red-400 bg-red-500/10 border-red-500/20";
    if (sev === "high")
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    if (sev === "medium")
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  };

  const getPriorityBadge = (severity: string) => {
    const sev = severity?.toLowerCase();
    if (sev === "critical") return { icon: ShieldAlert, color: "text-red-400" };
    if (sev === "high") return { icon: AlertTriangle, color: "text-orange-400" };
    if (sev === "medium") return { icon: Clock, color: "text-yellow-400" };
    return { icon: Activity, color: "text-purple-400" };
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!mounted) return null;

  const criticalCount = complaints.filter((c) => c.severity === "Critical").length;
  const highCount = complaints.filter((c) => c.severity === "High").length;
  const avgScore =
    complaints.length > 0
      ? Math.round(
          complaints.reduce((sum, c) => sum + c.risk_score, 0) / complaints.length
        )
      : 0;

  return (
    <div className="relative min-h-screen bg-[#05020A] text-white overflow-hidden font-sans selection:bg-purple-500/30">
      {/* BACKGROUND AMBIENCE */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/3 w-200 h-200 bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="pt-28 pb-12 px-6 max-w-[1600px] mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-400" />
                Resolved Complaints
              </h1>
              <p className="text-gray-400">
                Great work! Keep helping out the citizens
              </p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-red-300 uppercase tracking-widest">
                {complaints.length} complaints resolved!
              </span>
            </div>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              {
                label: "Total resolved",
                val: complaints.length,
                sub: "Pending Action",
                icon: FileText,
                color: "text-indigo-400",
              },
              {
                label: "Critical Issues",
                val: criticalCount,
                sub: "Urgent Response",
                icon: ShieldAlert,
                color: "text-red-400",
                alert: criticalCount > 0,
              },
              {
                label: "High Priority",
                val: highCount,
                sub: "Action Required",
                icon: AlertTriangle,
                color: "text-orange-400",
              },
              {
                label: "Avg Risk Score",
                val: avgScore,
                sub: "System Index",
                icon: TrendingUp,
                color: "text-yellow-400",
              },
            ].map((stat, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 group
                  ${
                    stat.alert
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

          {/* FILTERS & SEARCH */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by subject, location, or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex gap-2">
              {["all", "critical", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-4 py-3 rounded-xl border transition-all capitalize text-sm font-bold ${
                    filterSeverity === sev
                      ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                      : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05]"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: COMPLAINTS LIST */}
            <div className="lg:col-span-8">
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                    <p className="text-gray-400">Loading complaints...</p>
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <CheckCircle className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg font-bold">No complaints found</p>
                    <p className="text-sm">
                      {searchQuery || filterSeverity !== "all"
                        ? "Try adjusting your filters"
                        : "All issues have been resolved!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredComplaints.map((complaint, idx) => {
                      const badge = getPriorityBadge(complaint.severity);
                      const Icon = badge.icon;

                      return (
                        <motion.div
                          key={complaint.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedComplaint(complaint)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer group
                            ${
                              selectedComplaint?.id === complaint.id
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "bg-transparent border-white/5 hover:bg-white/[0.02] hover:border-white/10"
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className={`w-10 h-10 rounded-lg ${getPriorityStyles(
                                    complaint.severity
                                  )} flex items-center justify-center`}
                                >
                                  <Icon className={`w-5 h-5 ${badge.color}`} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-base font-bold text-white mb-1">
                                    {complaint.subject || "Untitled Complaint"}
                                  </h3>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {complaint.location || "Unknown"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(complaint.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-400 line-clamp-2 pl-13">
                                {complaint.complaint}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div
                                className={`text-2xl font-bold font-mono ${badge.color}`}
                              >
                                {complaint.risk_score}
                              </div>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${getPriorityStyles(
                                  complaint.severity
                                )}`}
                              >
                                {complaint.severity}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: DETAIL PANEL */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 bg-[#0F0518]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-h-[600px] flex flex-col">
                <AnimatePresence mode="wait">
                  {selectedComplaint ? (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 flex flex-col"
                    >
                      {/* Header */}
                      <div className="mb-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-2xl font-bold text-white leading-tight flex-1">
                            {selectedComplaint.subject || "Untitled Issue"}
                          </h3>
                          <button
                            onClick={() => setSelectedComplaint(null)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <XCircle className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase ${getPriorityStyles(
                            selectedComplaint.severity
                          )}`}
                        >
                          <Zap className="w-3 h-3" />
                          {selectedComplaint.severity} Priority
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-4 mb-6 flex-1">
                        <div className="p-4 bg-[#05020A] rounded-xl border border-white/5">
                          <h4 className="text-xs font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Complaint Details
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {selectedComplaint.complaint}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[#05020A] rounded-lg border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                            <div className="text-xl font-bold text-white">
                              {selectedComplaint.risk_score}
                            </div>
                          </div>
                          <div className="p-3 bg-[#05020A] rounded-lg border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Population</div>
                            <div className="text-xl font-bold text-white">
                              {selectedComplaint.population_used?.toLocaleString() || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-[#05020A] rounded-xl border border-white/5 space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{selectedComplaint.location || "Unknown Location"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{selectedComplaint.sender || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(selectedComplaint.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <button
                          onClick={() => markAsResolved(selectedComplaint.id)}
                          className="w-full py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Resolved
                        </button>
                        <button
                          onClick={() => setSelectedComplaint(null)}
                          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 font-bold text-sm transition-colors"
                        >
                          Back to List
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center text-center text-gray-500"
                    >
                      <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                      <h3 className="text-lg font-bold mb-2">No Complaint Selected</h3>
                      <p className="text-sm">
                        Click on a complaint to view full details
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </div>
  );
}