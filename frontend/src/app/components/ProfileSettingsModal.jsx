import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, Upload, Camera } from "lucide-react";
import { useState, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function ProfileSettingsModal({ isOpen, onClose, user, onUpdateUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!user) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be less than 5MB.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const base64Image = await convertToBase64(file);

      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/profile-image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to update profile image.");
      }

      onUpdateUser(payload);
    } catch (error) {
      console.error("Failed to update profile image:", error);
      setErrorMessage(error.message || "Failed to update profile image.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#071017]/80 backdrop-blur-xl z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/30 backdrop-blur-2xl">
              {/* Top glow */}
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-300/20 to-transparent pointer-events-none" />

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Profile Settings</h2>
                    <p className="mt-1 text-sm text-slate-300">Customize your appearance</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-white border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Image Section */}
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-teal-300/20 shadow-xl bg-[#071017]">
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin mb-1" />
                      ) : (
                        <Camera className="w-6 h-6 mb-1" />
                      )}
                      <span className="text-xs font-semibold">Change</span>
                    </button>
                  </div>

                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-white">{user.name}</h3>
                    <p className="text-sm text-teal-200">{user.department} Department</p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload New Picture
                      </>
                    )}
                  </button>

                  {errorMessage && (
                    <div className="w-full rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 text-center">
                      {errorMessage}
                    </div>
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
