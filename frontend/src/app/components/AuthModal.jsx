import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Google colour logo
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, departments = ["IIPS"] }) {
  const [mode, setMode] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Holds data for new Google users who still need to pick a department
  const [googlePending, setGooglePending] = useState(null);
  const [pendingDepartment, setPendingDepartment] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    department: "",
  });

  useEffect(() => {
    const defaultDept = departments[0] || "IIPS";
    setFormData((prev) => ({ ...prev, department: defaultDept }));
    setPendingDepartment(defaultDept);
  }, [departments]);

  // ── Google sign-in ──────────────────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async ({ access_token }) => {
      try {
        await callGoogleEndpoint(access_token, null);
      } catch {
        setErrorMessage("Google sign-in failed. Please try again.");
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setErrorMessage("Google sign-in was cancelled or failed.");
      setIsGoogleLoading(false);
    },
  });

  /**
   * POST the access token (and optional department) to our backend.
   * If the backend replies 202 DEPARTMENT_REQUIRED the user is shown a dept picker.
   */
  const callGoogleEndpoint = async (accessToken, department) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, department }),
    });

    const payload = await response.json();

    if (response.status === 202 && payload.message === "DEPARTMENT_REQUIRED") {
      // First-time Google user — ask for department
      setGooglePending({
        accessToken,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
      setIsGoogleLoading(false);
      return;
    }

    if (!response.ok) {
      throw new Error(payload.message || "Google sign-in failed");
    }

    onAuthSuccess(payload);
    handleClose();
  };

  const handleGoogleClick = () => {
    setIsGoogleLoading(true);
    setErrorMessage("");
    googleLogin();
  };

  const handleDepartmentConfirm = async () => {
    if (!googlePending) return;
    setIsGoogleLoading(true);
    setErrorMessage("");
    try {
      await callGoogleEndpoint(googlePending.accessToken, pendingDepartment);
    } catch (err) {
      setErrorMessage(err.message || "Failed to complete sign-in.");
      setIsGoogleLoading(false);
    }
  };

  // ── Email / Password auth ───────────────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const endpoint = mode === "login" ? "login" : "signup";
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          department: formData.department,
          ...(mode === "signup" ? { name: formData.name } : {}),
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Authentication failed");

      onAuthSuccess(payload);
      handleClose();
    } catch (error) {
      setErrorMessage(error.message || "Unable to authenticate right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: "", password: "", name: "", department: departments[0] || "IIPS" });
    setMode("login");
    setErrorMessage("");
    setGooglePending(null);
    setIsGoogleLoading(false);
    onClose();
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400 transition-all";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#071017]/80 backdrop-blur-xl z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/30 backdrop-blur-2xl">
              {/* Top glow */}
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-300/20 to-transparent pointer-events-none" />

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <div className="mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-400 text-slate-950 grid place-items-center shadow-lg shadow-teal-950/30">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {googlePending ? "One last step" : mode === "login" ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {googlePending
                        ? "Pick your department to complete sign-in."
                        : "Select your department and continue securely."}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-white border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ── Step 2: Department picker for new Google users ── */}
                {googlePending ? (
                  <div className="space-y-5">
                    {/* Profile chip */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.06] border border-white/10">
                      {googlePending.picture ? (
                        <img
                          src={googlePending.picture}
                          alt={googlePending.name}
                          className="w-10 h-10 rounded-full ring-2 ring-teal-300/30 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-300/20 flex items-center justify-center text-teal-200 font-bold text-sm flex-shrink-0">
                          {googlePending.name?.[0] || "G"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{googlePending.name}</p>
                        <p className="text-xs text-slate-400 truncate">{googlePending.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Department</label>
                      <select
                        value={pendingDepartment}
                        onChange={(e) => setPendingDepartment(e.target.value)}
                        className={inputClass}
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept} className="text-slate-950">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleDepartmentConfirm}
                      disabled={isGoogleLoading}
                      className="w-full bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 disabled:opacity-50 text-slate-950 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/30"
                    >
                      {isGoogleLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Completing sign-in...</>
                      ) : (
                        "Complete Sign-In"
                      )}
                    </button>

                    {errorMessage && (
                      <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => { setGooglePending(null); setErrorMessage(""); }}
                      className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors py-1"
                    >
                      ← Go back
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ── Google button ── */}
                    <motion.button
                      type="button"
                      id="google-signin-btn"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGoogleClick}
                      disabled={isGoogleLoading || isLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-white/15 bg-white/[0.07] hover:bg-white/[0.12] hover:border-white/30 disabled:opacity-50 transition-all text-white font-semibold text-sm shadow-md backdrop-blur-sm"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
                      ) : (
                        <GoogleIcon />
                      )}
                      {isGoogleLoading ? "Connecting to Google…" : "Continue with Google"}
                    </motion.button>

                    {/* Divider */}
                    <div className="relative my-5 flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-slate-500 font-medium">or continue with email</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* ── Email / password form ── */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      {mode === "signup" && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">Full Name</label>
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
                        <label className="block text-sm font-semibold text-slate-200 mb-2">Department</label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className={inputClass}
                        >
                          {departments.map((dept) => (
                            <option key={dept} value={dept} className="text-slate-950">
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
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
                        <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || isGoogleLoading}
                        className="w-full bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 disabled:opacity-50 text-slate-950 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/30"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
                        ) : (
                          mode === "login" ? "Sign In" : "Sign Up"
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
                            type="button"
                            onClick={() => { setMode("signup"); setErrorMessage(""); }}
                            className="text-teal-200 hover:text-teal-100 font-bold"
                          >
                            Sign up
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => { setMode("login"); setErrorMessage(""); }}
                            className="text-teal-200 hover:text-teal-100 font-bold"
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
