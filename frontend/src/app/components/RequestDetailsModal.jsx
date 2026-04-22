import { AnimatePresence, motion } from "motion/react";
import { Clock, MapPin, MessageCircle, Phone, User, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RequestDetailsModal({ item, onClose }) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#071017]/75 backdrop-blur-xl z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[60] p-4 sm:p-6 flex items-center justify-center"
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl bg-[#071017]/90 border border-white/10 rounded-[2rem] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 backdrop-blur-2xl bg-[#071017]/75">
                <h2 className="text-lg font-semibold text-white">Request Details</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-2xl text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <img src={item.image} alt={item.title} className="w-full h-64 object-cover rounded-3xl border border-white/10" />

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${item.status === "lost" ? "bg-red-500/90" : "bg-green-500/90"}`}>
                    {item.status === "lost" ? "Lost" : "Found"}
                  </span>
                  <span className="text-sm text-slate-300 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white">{item.title}</h3>

                <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 text-teal-200" />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 text-teal-200" />
                    <span>{item.phone ? `+91 ${item.phone}` : item.contact}</span>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-teal-200" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Full Description</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.description?.trim() || "No additional description provided."}
                  </p>
                </div>

                {item.phone && (
                  <a
                    href={`https://wa.me/91${item.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 text-slate-950 py-3 rounded-2xl font-bold transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
