import { motion } from "motion/react";
import { MapPin, Phone, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ItemCard({
  id,
  title,
  status,
  name,
  location,
  contact,
  phone,
  description,
  image,
  timestamp,
  isResolved,
  isOld,
  onResolve,
  userId,
  ownerId,
  isAdmin,
  onDelete,
  onOpenDetails,
}) {
  const statusColor = status === "lost" ? "bg-rose-500/95" : "bg-emerald-500/95";
  const opacity = isResolved || isOld ? "opacity-70" : "";
  const isOwner = userId === ownerId;
  const canOpenDetails = Boolean(onOpenDetails) && !isResolved;

  return (
    <motion.div
      layout
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      exit={{ scale: 1.08, opacity: 0, filter: "blur(6px)" }}
      transition={{ layout: { duration: 0.28, ease: "easeInOut" }, duration: 0.24, ease: "easeInOut" }}
      className={`group backdrop-blur-xl bg-white/[0.075] border border-white/10 rounded-[1.6rem] shadow-xl shadow-black/15 hover:border-teal-200/25 hover:shadow-2xl hover:shadow-teal-950/20 transition-all overflow-hidden ${opacity} ${
        canOpenDetails ? "cursor-pointer" : ""
      }`}
      onClick={() =>
        canOpenDetails &&
        onOpenDetails?.({ id, title, status, name, location, contact, phone, image, timestamp, description })
      }
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
        <div className="absolute top-3 right-3 flex gap-2">
          <span
            className={`${statusColor} backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-[0.14em]`}
          >
            {status === "lost" ? "Lost" : "Found"}
          </span>
          {isResolved && (
            <span className="bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-[0.14em]">
              Resolved
            </span>
          )}
          {isOld && !isResolved && (
            <span className="bg-slate-400/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-[0.14em]">
              Old
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-xl mb-3 text-white tracking-tight">{title}</h3>

        <div className="space-y-2.5 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {status === "lost" ? "Owner:" : "Finder:"}
            </span>
            {name}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-200" />
            {location}
          </div>

          {!isResolved && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-200" />
              {phone ? `+91 ${phone}` : contact}
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </div>
        </div>

        {!isResolved && !isOld && onResolve && isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve(id);
            }}
            className="mt-4 w-full bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 text-slate-950 py-2.5 rounded-2xl transition-all text-sm font-bold shadow-lg shadow-emerald-950/25"
          >
            Mark as Resolved
          </button>
        )}

        {isAdmin && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="mt-3 w-full bg-rose-500/12 hover:bg-rose-500/20 border border-rose-300/20 text-rose-100 py-2.5 rounded-2xl transition-all text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Remove Request
          </button>
        )}
      </div>
    </motion.div>
  );
}
