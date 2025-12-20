"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { logoutUser } from "@/lib/auth";

import { Brain, ArrowRight, Bell, Logs, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type UserProfile = {
  firstName: string;
  lastName: string;
};

export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const initials =
    profile?.firstName?.[0]?.toUpperCase() +
    profile?.lastName?.[0]?.toUpperCase();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* --- LOGO --- */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            CivicMind <span className="text-purple-400">AI</span>
          </span>
        </Link>

        {/* --- RIGHT SIDE --- */}
        {!loading && (
          <div className="flex items-center gap-4">
            {/* 🔓 NOT AUTHENTICATED */}
            {!user && (
              <>
                <Link href="/authentication/login">
                  <button className="group relative px-6 py-2.5 rounded-full bg-white text-black font-bold text-xs tracking-widest uppercase hover:scale-105 transition-transform">
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                </Link>

                <Link href="/authentication/signup">
                  <button className="group relative px-6 py-2.5 rounded-full bg-white text-black font-bold text-xs tracking-widest uppercase hover:scale-105 transition-transform">
                    <span className="flex items-center gap-2">
                      Sign Up <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                </Link>
              </>
            )}

            {/* 🔐 AUTHENTICATED */}
            {user && profile && (
              <>
                <Link href="/dashboard/complaintpage">
                  <Button variant="ghost" className="text-white">
                    Complaints <Logs className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" className="text-white">
                  Notifications <Bell className="ml-2 w-4 h-4" />
                </Button>

                {/* USER DROPDOWN */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition">
                      {/* Initials Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white">
                        {initials}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {profile.firstName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="bg-[#0F0518] border border-white/10 text-white"
                  >
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer focus:bg-red-500/10 text-red-400"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
