import { Search, Menu, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function Navbar({
  searchQuery,
  onSearchChange,
  onMenuClick,
  user,
  notifications,
  unreadCount,
  onNotificationClick,
}) {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#071017]/75 shadow-lg shadow-black/15 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-white border border-white/10 bg-white/[0.04]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-500 text-slate-950 grid place-items-center shadow-lg shadow-teal-950/30">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white leading-tight">Lost & Found</h1>
                <p className="text-[11px] uppercase tracking-[0.24em] text-teal-100/70">
                  {user?.department || "IIPS"}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 md:hidden pointer-events-none">
            <Search className="w-5 h-5 text-teal-200" />
            <h1 className="font-bold text-lg text-white">Lost & Found</h1>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200" />
              <input
                type="text"
                placeholder="Search by item, person, or location..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={onNotificationClick}
                className="relative p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-white border border-white/10 bg-white/[0.04]"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-[11px] text-slate-950 font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifications?.length > 0 && (
                <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-3xl border border-white/10 bg-[#071017]/95 backdrop-blur-2xl shadow-2xl p-3">
                  <div className="mb-2 text-sm font-semibold text-white">Notifications</div>
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => onNotificationClick(notification)}
                        className={`w-full text-left rounded-2xl border px-3 py-3 transition-colors ${
                          notification.isRead
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-teal-300/30 bg-teal-300/10"
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">{notification.title}</div>
                        <div className="mt-1 text-xs text-slate-300">{notification.message}</div>
                        <div className="mt-2 text-[11px] text-teal-200">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-2 sm:bg-white/[0.07] sm:backdrop-blur-md sm:px-3 sm:py-1.5 sm:rounded-full sm:border sm:border-white/10">
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-7 h-7 rounded-full ring-2 ring-teal-300/70"
                />
                <span className="text-sm font-semibold text-white hidden sm:block">
                  {user.name}
                </span>
                {user.role === "admin" && (
                  <span className="hidden sm:inline-flex rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100 border border-amber-200/20">
                    Admin
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-300/40 focus:border-teal-200/40 outline-none text-white placeholder-slate-400"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
