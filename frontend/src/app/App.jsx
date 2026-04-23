import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { FilterTabs } from "./components/FilterTabs";
import { ItemCard } from "./components/ItemCard";
import { AddRequestModal } from "./components/AddRequestModal";
import { AuthModal } from "./components/AuthModal";
import { RequestDetailsModal } from "./components/RequestDetailsModal";
import { ProfileSettingsModal } from "./components/ProfileSettingsModal";
import { Toaster, toast } from "sonner";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array(0);
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error("Failed to decode VAPID key", e);
    return new Uint8Array(0);
  }
}

const subscribeToPushNotifications = async (userId, isManual = false) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (isManual) toast.error("Push notifications are not supported in this browser.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (isManual) toast.error("Notification permission denied. Please enable it in browser settings.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
         console.warn("VAPID_PUBLIC_KEY is not defined");
         if (isManual) toast.error("Notification setup error: VAPID key missing.");
         return;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        subscription,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to subscribe on backend");
    }

    if (isManual) toast.success("Notifications enabled successfully!");
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    toast.error("Failed to enable push notifications.");
  }
};


const normalizeItem = (item) => ({
  ...item,
  timestamp: new Date(item.timestamp),
  description: item.description || "",
  phone: item.phone || "",
});

export default function App() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState(["IIPS"]);
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentView, setCurrentView] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadItems = async () => {
    setIsLoadingItems(true);
    setItemsError("");

    try {
      const departmentQuery = user?.department
        ? `?department=${encodeURIComponent(user.department)}`
        : "";
      const response = await fetch(`${API_BASE_URL}/api/items${departmentQuery}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load items");
      }

      setItems(payload.map(normalizeItem));
    } catch (error) {
      console.error("Error loading items:", error);
      setItems([]);
      setItemsError(error.message || "Unable to load requests right now.");
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config`);
      const payload = await response.json();

      if (response.ok && Array.isArray(payload.departments) && payload.departments.length > 0) {
        setDepartments(payload.departments);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("lostfound_user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (user?.department) {
      loadItems();
    }
  }, [user?.department]);

  useEffect(() => {
    if (user?.id) {
      subscribeToPushNotifications(user.id);
    }
  }, [user?.id]);

  const handleAuthSuccess = (userData) => {
    const normalizedUser = {
      ...userData,
      department: userData.department || "IIPS",
    };
    localStorage.setItem("lostfound_user", JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    setIsAuthModalOpen(false);
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem("lostfound_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleSignOut = () => {
    localStorage.removeItem("lostfound_user");
    setUser(null);
    setIsAuthModalOpen(true);
    setIsSidebarOpen(false);
  };

  const handleDeleteAllRequests = async () => {
    const confirmed = window.confirm("Delete every request from the system?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete all requests");
      }

      setItems([]);
      alert(payload.message);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Failed to delete all requests:", error);
      alert(error.message || "Unable to delete all requests right now.");
    }
  };

  const handleDeleteRequest = async (id) => {
    const confirmed = window.confirm("Remove this request?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete request");
      }

      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
      setSelectedItem((current) => (current?.id === id ? null : current));
    } catch (error) {
      console.error("Failed to delete request:", error);
      alert(error.message || "Unable to delete this request right now.");
    }
  };

  const handleAddRequest = async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        status: data.type,
        name: data.name,
        location: data.location,
        contact: data.contact,
        phone: data.phone,
        description: data.description,
        image: data.image,
        ownerId: data.ownerId,
        department: user.department,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Failed to create request");
    }

    setItems((prevItems) => [normalizeItem(payload), ...prevItems]);
  };

  const handleResolve = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${id}/resolve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: user.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to resolve request");
      }

      setItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? normalizeItem(payload) : item))
      );
    } catch (error) {
      console.error("Error resolving request:", error);
      alert(error.message || "Unable to resolve this request right now.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = activeFilter === "all" || item.status === activeFilter;

    if (currentView === "my-requests") {
      return matchesSearch && matchesFilter && item.ownerId === user?.id;
    }

    return matchesSearch && matchesFilter;
  });

  const activeItems = filteredItems.filter(
    (item) => !item.isResolved && !isOlderThan7Days(item.timestamp)
  );
  const resolvedItems = filteredItems.filter((item) => item.isResolved);
  const oldItems = filteredItems.filter(
    (item) => !item.isResolved && isOlderThan7Days(item.timestamp)
  );

  function isOlderThan7Days(date) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date < sevenDaysAgo;
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onAuthSuccess={handleAuthSuccess}
          departments={departments}
        />
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="min-h-screen bg-[#071017] relative overflow-hidden text-slate-50">
      <Toaster position="top-right" theme="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_8%_-5%,rgba(20,184,166,0.28),transparent_65%),radial-gradient(720px_520px_at_96%_5%,rgba(251,191,36,0.16),transparent_58%),linear-gradient(145deg,#071017_0%,#0d1b24_46%,#13251f_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(45,212,191,0.16),transparent_42%)]" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-32 w-[30rem] h-[30rem] bg-teal-400/18 rounded-full mix-blend-screen blur-3xl animate-blob"></div>
        <div className="absolute -bottom-52 -left-36 w-[32rem] h-[32rem] bg-amber-300/12 rounded-full mix-blend-screen blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-[34%] left-[52%] -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] bg-sky-300/10 rounded-full mix-blend-screen blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setIsSidebarOpen(true)}
        user={user}
        onProfileClick={() => setIsProfileModalOpen(true)}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
        onSignOut={handleSignOut}
        onDeleteAllRequests={handleDeleteAllRequests}
        onProfileClick={() => {
          setIsSidebarOpen(false);
          setIsProfileModalOpen(true);
        }}
        onEnableNotifications={() => subscribeToPushNotifications(user.id, true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 sm:p-8 shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-teal-100 mb-4">
            {user.department || "IIPS"} Desk
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {currentView === "dashboard" ? "All Requests" : "My Requests"}
          </h1>
          <p className="text-slate-300 max-w-2xl">
            {currentView === "dashboard"
              ? "A cleaner, faster board for lost and found updates across your department."
              : "Track and resolve the requests you have submitted."}
          </p>
        </div>

        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {itemsError && (
          <div className="mb-6 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg shadow-red-950/20">
            {itemsError}
          </div>
        )}

        {isLoadingItems && (
          <div className="py-16 text-center text-slate-300">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-teal-200/30 border-t-teal-200 animate-spin" />
            Loading requests...
          </div>
        )}

        {!isLoadingItems && activeItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Active Requests</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {activeItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    {...item}
                    userId={user.id}
                    isAdmin={user.role === "admin"}
                    onResolve={handleResolve}
                    onDelete={handleDeleteRequest}
                    canResolve={currentView === "my-requests"}
                    onOpenDetails={setSelectedItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {!isLoadingItems && resolvedItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Resolved Requests</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resolvedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  {...item}
                  userId={user.id}
                  isAdmin={user.role === "admin"}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoadingItems && oldItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Old Requests (7+ days)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {oldItems.map((item) => (
                <ItemCard
                  key={item.id}
                  {...item}
                  userId={user.id}
                  isAdmin={user.role === "admin"}
                  isOld
                  onDelete={handleDeleteRequest}
                  onOpenDetails={setSelectedItem}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoadingItems && filteredItems.length === 0 && (
          <div className="text-center py-16 rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-xl">
            <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-teal-300/10 border border-teal-200/20 flex items-center justify-center text-sm font-bold text-teal-100">
              {currentView === "my-requests" ? "My" : "No"}
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {currentView === "my-requests" ? "No requests yet" : "No items found"}
            </h3>
            <p className="text-slate-300">
              {currentView === "my-requests"
                ? "Start by posting a lost or found item"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        )}
      </main>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-teal-300 to-emerald-400 hover:from-teal-200 hover:to-emerald-300 text-slate-950 p-4 rounded-full shadow-lg shadow-teal-950/40 hover:shadow-xl hover:shadow-teal-950/50 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AddRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddRequest}
        user={user}
      />

      <RequestDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={handleUserUpdate}
      />
    </div>
  );
}
