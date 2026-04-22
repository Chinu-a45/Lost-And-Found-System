import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Loader2 } from "lucide-react";
import { useState } from "react";

export function AddRequestModal({ isOpen, onClose, onSubmit, user }) {
  const [step, setStep] = useState("select");
  const [requestType, setRequestType] = useState("lost");
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    description: "",
    phone: "",
  });
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeSelect = (type) => {
    setRequestType(type);
    setStep("form");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        type: requestType,
        ...formData,
        name: user.name,
        contact: user.email,
        image: imagePreview || "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400",
        ownerId: user.id,
      });

      setFormData({ title: "", location: "", description: "", phone: "" });
      setImagePreview("");
      setStep("select");
      onClose();
    } catch (error) {
      console.error("Failed to submit request:", error);
      alert(error.message || "Unable to submit request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setFormData({ title: "", location: "", description: "", phone: "" });
    setImagePreview("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="backdrop-blur-2xl bg-[#071017]/90 border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div
                className="sticky top-0 z-30 bg-[#071017]/70 border-b border-white/10 p-4 flex items-center justify-between"
                style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
              >
                <h2 className="font-semibold text-lg text-white">
                  {step === "select" ? "Add New Request" : requestType === "lost" ? "I Lost Something" : "I Found Something"}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {step === "select" ? (
                <div className="p-6 space-y-4">
                  <button
                    onClick={() => handleTypeSelect("lost")}
                    className="w-full p-6 border border-white/10 bg-white/[0.06] backdrop-blur-md rounded-3xl hover:border-rose-300/40 hover:bg-rose-500/10 transition-all group"
                  >
                    <div className="text-4xl mb-2">Lost</div>
                    <div className="font-bold text-lg text-white group-hover:text-rose-200">I Lost Something</div>
                    <div className="text-sm text-slate-300 mt-1">Report a missing item</div>
                  </button>

                  <button
                    onClick={() => handleTypeSelect("found")}
                    className="w-full p-6 border border-white/10 bg-white/[0.06] backdrop-blur-md rounded-3xl hover:border-teal-300/40 hover:bg-teal-300/10 transition-all group"
                  >
                    <div className="text-4xl mb-2">Found</div>
                    <div className="font-bold text-lg text-white group-hover:text-teal-200">I Found Something</div>
                    <div className="text-sm text-slate-300 mt-1">Help return a found item</div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Item Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Bag, Phone, Wallet"
                      className="w-full px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder={requestType === "lost" ? "Where did you lose it?" : "Where did you find it?"}
                      className="w-full px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Phone Number (India) *
                    </label>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-md overflow-hidden">
                      <span className="px-3 py-3 text-slate-200 border-r border-white/10 bg-white/5">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          })
                        }
                        placeholder="9876543210"
                        className="w-full px-4 py-3 bg-transparent focus:ring-2 focus:ring-teal-300/40 focus:border-transparent outline-none text-white placeholder-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Enter a valid 10-digit Indian mobile number.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Upload Image
                    </label>
                    <div className="border border-dashed border-white/20 bg-white/[0.05] backdrop-blur-md rounded-3xl p-6 text-center hover:border-teal-300/40 transition-colors">
                      {imagePreview ? (
                        <div className="relative">
                          <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setImagePreview("")}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-teal-200" />
                          <div className="text-sm text-slate-300">Click to upload or drag and drop</div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Additional details..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none resize-none text-white placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 disabled:opacity-50 text-slate-950 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/30"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
