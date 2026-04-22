import { motion } from "motion/react";

export function FilterTabs({ activeFilter, onFilterChange }) {
  const tabs = [
    { id: "all", label: "All Items" },
    { id: "lost", label: "Lost" },
    { id: "found", label: "Found" },
  ];

  return (
    <div className="inline-flex gap-1 mb-6 backdrop-blur-xl bg-white/[0.07] border border-white/10 rounded-2xl p-1 shadow-lg shadow-black/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`relative px-5 py-2.5 font-bold transition-all rounded-xl ${
            activeFilter === tab.id
              ? "text-slate-950 bg-teal-200 shadow-lg shadow-teal-950/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          {tab.label}
          {activeFilter === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 -z-10 rounded-xl bg-teal-200"
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
