"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

interface Booking {
  id: string;
  userId: string;
  slotId: string;
  status: "BOOKED" | "CANCELLED";
  cancelledAt: string | null;
  AppointmentSlot: Slot;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // UI states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Generate next 7 days for the calendar selector
  const [dateList, setDateList] = useState<{ label: string; dateStr: string; dayName: string }[]>([]);

  useEffect(() => {
    const list = [];
    for (let i = 0; i < 20; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      
      list.push({ label, dateStr, dayName });
    }
    setDateList(list);
    if (list.length > 0) {
      setSelectedDate(list[0].dateStr);
    }
  }, []);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      router.push("/login");
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // Fetch slots for selected date
  const fetchSlots = useCallback(async (date: string) => {
    if (!date) return;
    setLoadingSlots(true);
    setErrorMsg("");
    try {
      const res = await apiRequest<{ slots: Slot[] }>(`/slots?date=${date}`);
      setSlots(res.slots || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Fetch user bookings
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await apiRequest<{ bookings: Booking[] }>("/bookings");
      setBookings(res.bookings || []);
    } catch (err: any) {
      console.error("Failed to load bookings:", err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchBookings();
    }
  }, [fetchBookings]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const openBookingConfirmation = (slot: Slot) => {
    if (slot.isBooked) return;
    setSelectedSlot(slot);
    setIsConfirmOpen(true);
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await apiRequest("/bookings", "POST", { slotId: selectedSlot.id });
      setSuccessMsg("Appointment booked successfully!");
      setIsConfirmOpen(false);
      setSelectedSlot(null);
      // Refresh slots and bookings
      fetchSlots(selectedDate);
      fetchBookings();
    } catch (err: any) {
      setErrorMsg(err.message || "Booking failed");
      setIsConfirmOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, "PATCH");
      setSuccessMsg("Appointment cancelled successfully!");
      fetchSlots(selectedDate);
      fetchBookings();
    } catch (err: any) {
      setErrorMsg(err.message || "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formatting functions
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const getCancelWindowInfo = (startTimeStr: string) => {
    const start = new Date(startTimeStr);
    const now = new Date();
    const diffMs = start.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < 0) {
      return { allowed: false, text: "Past Appointment" };
    }
    if (diffMins < 120) {
      return { allowed: false, text: "Non-cancellable (Within 2h window)" };
    }
    
    const hoursRemaining = Math.floor(diffMins / 60);
    const minsRemaining = Math.floor(diffMins % 60);
    return { 
      allowed: true, 
      text: `Cancellable (${hoursRemaining}h ${minsRemaining}m left)` 
    };
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-3xl pointer-events-none"></div>

      {/* Navigation Header */}
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg shadow-indigo-600/20">
                A
              </span>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Scheduler
              </span>
            </div>
            
            {user && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-zinc-200">{user.name}</div>
                  <div className="text-xs text-zinc-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Banner Messages */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex justify-between items-center animate-fade-in">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="hover:text-red-300 font-bold px-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex justify-between items-center animate-fade-in">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="hover:text-emerald-300 font-bold px-2">×</button>
          </div>
        )}

        {/* Primary Page Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Booking Slots Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Book an Appointment</h2>
                <p className="text-zinc-500 text-xs mt-1">Select a date and choose an available hourly slot below.</p>
              </div>

              {/* Date Card Carousel */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {dateList.map((item) => {
                  const isActive = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-24 py-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25 scale-[1.03]"
                          : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                        {item.dayName}
                      </span>
                      <span className="text-sm font-extrabold mt-1">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Slots Listing */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-zinc-400">
                    {selectedDate ? formatDateLabel(selectedDate) : "Select a Date"}
                  </h3>
                  <span className="text-xs text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full font-medium">
                    {slots.length} Slots
                  </span>
                </div>

                {loadingSlots ? (
                  /* Skeleton Loader Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="h-20 rounded-2xl bg-zinc-900/50 border border-zinc-900 animate-pulse flex items-center justify-between px-5">
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-zinc-800 rounded-full"></div>
                          <div className="h-3 w-16 bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-8 w-20 bg-zinc-800 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40">
                    <p className="text-zinc-500 text-sm">No appointment slots available for this day.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {slots.map((slot) => {
                      const isPast = new Date(slot.startTime).getTime() < new Date().getTime();
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-2xl border p-4 flex items-center justify-between transition-all ${
                            slot.isBooked
                              ? "bg-zinc-900/20 border-zinc-900 text-zinc-600"
                              : isPast
                              ? "bg-zinc-900/10 border-zinc-900 text-zinc-600"
                              : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-200"
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block mt-1">
                              {slot.isBooked ? "Booked" : isPast ? "Passed" : "Available"}
                            </span>
                          </div>

                          <button
                            onClick={() => openBookingConfirmation(slot)}
                            disabled={slot.isBooked || isPast}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                              slot.isBooked
                                ? "bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                                : isPast
                                ? "bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer hover:scale-[1.02]"
                            }`}
                          >
                            {slot.isBooked ? "Booked" : isPast ? "Unavailable" : "Book Slot"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">My Bookings</h2>
                <p className="text-zinc-500 text-xs mt-1">Track and manage your upcoming schedule.</p>
              </div>

              {loadingBookings ? (
                /* Sidebar skeleton loader */
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-28 rounded-2xl bg-zinc-900/50 border border-zinc-900 animate-pulse p-4 space-y-3">
                      <div className="h-4 w-32 bg-zinc-800 rounded-full"></div>
                      <div className="h-3 w-40 bg-zinc-800 rounded-full"></div>
                      <div className="h-8 w-full bg-zinc-800 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40">
                  <p className="text-zinc-500 text-sm">You haven't booked any slots yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {bookings.map((booking) => {
                    const slot = booking.AppointmentSlot;
                    const isCancelled = booking.status === "CANCELLED";
                    const windowInfo = getCancelWindowInfo(slot.startTime);

                    return (
                      <div
                        key={booking.id}
                        className={`rounded-2xl border p-4 space-y-3 transition-all ${
                          isCancelled
                            ? "bg-red-500/[0.02] border-red-950/50 opacity-70"
                            : "bg-zinc-900/50 border-zinc-800/80"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm text-white">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
                              {new Date(slot.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isCancelled
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>

                        {/* Cancellation Window / Countdown Banner */}
                        {!isCancelled && (
                          <div className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border ${
                            windowInfo.allowed 
                              ? "bg-zinc-950/60 border-zinc-800/60 text-zinc-400" 
                              : "bg-amber-500/5 border-amber-500/10 text-amber-500/80"
                          }`}>
                            {windowInfo.text}
                          </div>
                        )}

                        {!isCancelled && windowInfo.allowed && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={actionLoading}
                            className="w-full bg-zinc-900 border border-zinc-800 hover:bg-red-950/20 hover:border-red-900 text-zinc-300 hover:text-red-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            Cancel Appointment
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Confirmation Modal */}
      {isConfirmOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Confirm Booking</h3>
              <p className="text-zinc-500 text-xs mt-1">Please review the details of your appointment.</p>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Date</span>
                <span className="font-semibold text-white">{formatDateLabel(selectedSlot.date)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Time Window</span>
                <span className="font-bold text-indigo-400">
                  {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60 leading-relaxed">
              ⚠️ <strong className="text-zinc-400">Terms & Policy:</strong> You may cancel this appointment free of charge up to 2 hours before the start time. You may only book one slot per day.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold px-4 py-2.5 text-xs transition-all cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleBookSlot}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex justify-center items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
