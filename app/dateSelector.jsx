"use client";
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export default function DateSelector({ selectedDate, onChange }) {
  const [days, setDays] = useState([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState("");
  const scrollContainerRef = useRef(null);

  const generateDays = (offsetWeeks = 0) => {
    const today = dayjs();
    const startFrom = today.add(offsetWeeks * 7, "day").subtract(3, "day");
    const twoWeeks = [];

    for (let i = 0; i < 14; i++) {
      const d = startFrom.add(i, "day");
      twoWeeks.push({
        date: d.format("YYYY-MM-DD"),
        dayNumber: d.format("D"),
        weekday: d.format("ddd"),
        isToday: d.isSame(today, "day"),
        month: d.format("MMMM"),
        year: d.format("YYYY"),
        isFirstOfMonth: d.date() === 1,
      });
    }

    setDays(twoWeeks);

    const middleDate = startFrom.add(7, "day");
    setCurrentMonth(middleDate.format("MMMM YYYY"));
  };

  useEffect(() => {
    generateDays(currentOffset);
  }, [currentOffset]);

  const goPrev = () => {
    setCurrentOffset((prev) => prev - 1);
  };

  const goNext = () => {
    setCurrentOffset((prev) => prev + 1);
  };

  const goToday = () => {
    setCurrentOffset(0);
    onChange(dayjs().format("YYYY-MM-DD"));
  };

  const scrollBy = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction * 300,
        behavior: "smooth",
      });
    }
  };

  const today = dayjs();
  const isTodaySelected = dayjs(selectedDate).isSame(today, "day");

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
            <CalendarIcon size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {currentMonth}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a date to view tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={goToday}
            disabled={isTodaySelected}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all mr-1 ${
              isTodaySelected
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 cursor-default"
                : "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            }`}
          >
            Today
          </button>

          <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => {
                goPrev();
                scrollBy(-1);
              }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-95"
              title="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <button
              onClick={() => {
                goNext();
                scrollBy(1);
              }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-95"
              title="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="relative ml-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Pick specific date"
            />
            <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
              <CalendarIcon size={14} />
              <span className="hidden sm:inline">Pick Date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Days Scroll */}
      <div className="relative group">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div
          ref={scrollContainerRef}
          className="flex gap-2.5 overflow-x-auto py-1 px-1 scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`
            .date-selector-scroll::-webkit-scrollbar {
              display: none;
            }
            @media (min-width: 1024px) {
              .date-selector-scroll {
                overflow-x: visible !important;
              }
            }
          `}</style>

          {days.map((d, idx) => {
            const isSelected = selectedDate === d.date;
            const isPast = dayjs(d.date).isBefore(today, "day") && !d.isToday;

            return (
              <div key={`${d.date}-${idx}`} className="flex flex-col">
                {d.isFirstOfMonth && idx > 0 && (
                  <div className="flex items-center justify-center -mt-0.5 mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {d.month} {d.year.slice(-2)}
                    </span>
                  </div>
                )}
                <button
                  key={idx}
                  onClick={() => onChange(d.date)}
                  className={`relative px-2.5 py-3 rounded-2xl text-center min-w-[68px] border-2 transition-all duration-200 active:scale-95 overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-purple-500/30 scale-105 border-transparent"
                      : d.isToday
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-purple-400 dark:border-purple-600 shadow-md shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20"
                      : isPast
                      ? "bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-500 dark:hover:text-gray-400"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_60%)]" />
                  )}
                  <div
                    className={`relative text-lg font-extrabold tracking-tight ${
                      isSelected ? "drop-shadow-sm" : ""
                    }`}
                  >
                    {d.dayNumber}
                  </div>
                  <div
                    className={`relative text-[11px] font-semibold mt-0.5 uppercase tracking-wide ${
                      isSelected
                        ? "text-white/80"
                        : d.isToday && !isSelected
                        ? "text-purple-600 dark:text-purple-400"
                        : ""
                    }`}
                  >
                    {d.weekday}
                  </div>
                  {d.isToday && !isSelected && (
                    <div className="relative flex justify-center mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    </div>
                  )}
                  {d.isToday && isSelected && (
                    <div className="relative flex justify-center mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
