import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    // 1. CENTERING WRAPPER
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative">
      
      {/* Optional: Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* 2. THE SIGN IN COMPONENT */}
      <SignIn 
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-[#0A0510]/80 border border-white/10 backdrop-blur-md shadow-2xl rounded-2xl",
            headerTitle: "text-white font-bold text-2xl",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all",
            socialButtonsBlockButtonText: "text-white font-medium",
            dividerLine: "bg-white/10",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-400",
            formFieldInput: "bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 transition-colors",
            formButtonPrimary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold tracking-wide",
            footerActionText: "text-gray-400",
            footerActionLink: "text-purple-400 hover:text-purple-300"
          }
        }}
      />
    </div>
  );
}