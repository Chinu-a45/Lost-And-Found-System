import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function AuthModal({ isOpen, onClose, onAuthSuccess, departments = ["IIPS"] }) {
  const [mode, setMode] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    department: "IIPS",
  });

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      department: departments[0] || "IIPS",
    }));
  }, [departments]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const endpoint = mode === "login" ? "login" : "signup";
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          department: formData.department,
          ...(mode === "signup" ? { name: formData.name } : {}),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Authentication failed");
      }

      onAuthSuccess(payload);
      handleClose();
    } catch (error) {
      console.error("Authentication failed:", error);
      setErrorMessage(error.message || "Unable to authenticate right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: "", password: "", name: "", department: departments[0] || "IIPS" });
    setMode("login");
    setErrorMessage("");
    onClose();
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400 transition-all";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#071017]/80 backdrop-blur-xl z-40"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-300/20 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <div className="mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-400 text-slate-950 grid place-items-center shadow-lg shadow-teal-950/30">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {mode === "login" ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Select your department and continue securely.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-white border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className={inputClass}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className={inputClass}
                    >
                      {departments.map((department) => (
                        <option key={department} value={department} className="text-slate-950">
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="********"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 disabled:opacity-50 text-slate-950 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/30"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {mode === "login" ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      <>{mode === "login" ? "Sign In" : "Sign Up"}</>
                    )}
                  </button>
                </form>

                {errorMessage && (
                  <div className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-5 text-center text-sm text-slate-300">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        onClick={() => {
                          setMode("signup");
                          setErrorMessage("");
                        }}
                        className="text-teal-200 hover:text-teal-100 font-bold"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => {
                          setMode("login");
                          setErrorMessage("");
                        }}
                        className="text-teal-200 hover:text-teal-100 font-bold"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
