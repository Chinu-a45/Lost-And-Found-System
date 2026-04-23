import { motion, AnimatePresence } from "motion/react";
import { X, Home, FileText, LogOut, Trash2 } from "lucide-react";

export function Sidebar({
  isOpen,
  onClose,
  user,
  currentView,
  onViewChange,
  onSignOut,
  onDeleteAllRequests,
  onProfileClick,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.22 }}
            className="fixed left-0 top-0 bottom-0 w-80 backdrop-blur-2xl bg-[#071017]/95 border-r border-white/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold text-lg text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-2xl transition-colors lg:hidden text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-12 h-12 rounded-full ring-2 ring-teal-300/70 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={onProfileClick}
                    title="Change Profile Picture"
                  />
                  <div>
                    <div className="font-semibold text-white">{user.name}</div>
                    <div className="text-sm text-slate-300">{user.email}</div>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 p-4">
              <button
                onClick={() => {
                  onViewChange("dashboard");
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${
                  currentView === "dashboard"
                    ? "bg-teal-300 text-slate-950 shadow-lg shadow-teal-950/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>

              <button
                onClick={() => {
                  onViewChange("my-requests");
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === "my-requests"
                    ? "bg-teal-300 text-slate-950 shadow-lg shadow-teal-950/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileText className="w-5 h-5" />
                My Requests
              </button>
            </nav>

            <div className="p-4 border-t border-white/10">
              {user?.role === "admin" && (
                <button
                  onClick={onDeleteAllRequests}
                  className="w-full flex items-center gap-3 px-4 py-3 mb-3 text-amber-200 hover:bg-amber-500/20 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Remove All Requests
                </button>
              )}

              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-500/20 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
