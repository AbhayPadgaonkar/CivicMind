import { LoginForm } from "@/components/login-form";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex items-center w-full max-w-lg flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-15 h-15 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <span className="font-bold text-3xl tracking-tight text-white">
            CivicMind <span className="text-purple-400">AI</span>
          </span>
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
