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
    const startFrom = today.add(offsetWeeks * 7, "day").subtract(2, "day");
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
    <div className="space-y-3 sm:space-y-4">
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between gap-2 sm:gap-0 sm:px-1">
        {/* Left: Month + small icon - MOBILE: compact row */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center shrink-0">
            <CalendarIcon
              size={15}
              className="sm:w-[18px] sm:h-[18px] text-violet-600 dark:text-violet-400"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight">
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
              {currentMonth.split(" ")[0]}
            </h3>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 -mt-0.5 sm:mt-0">
              {currentMonth.split(" ")[1] || ""}
              <span className="hidden sm:inline"> — Select a date</span>
            </p>
          </div>
        </div>

        {/* Right: Controls - MOBILE: compact, less padding */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Today Button */}
          <button
            onClick={goToday}
            disabled={isTodaySelected}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
              isTodaySelected
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 cursor-default"
                : "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
            }`}
          >
            Today
          </button>

          {/* Arrow Nav */}
          <div className="flex items-center gap-0 bg-gray-50 dark:bg-gray-800/60 rounded-lg sm:rounded-xl p-0.5">
            <button
              onClick={() => {
                goPrev();
                scrollBy(-1);
              }}
              className="p-1.5 sm:p-2 rounded-md sm:rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90"
              title="Previous week"
            >
              <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <div className="w-px h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <button
              onClick={() => {
                goNext();
                scrollBy(1);
              }}
              className="p-1.5 sm:p-2 rounded-md sm:rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90"
              title="Next week"
            >
              <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Date Picker - hidden on mobile, icon only */}
          <div className="relative hidden sm:block ml-0.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Pick specific date"
            />
            <div className="px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
              <CalendarIcon size={14} />
              <span>Pick</span>
            </div>
          </div>
        </div>
      </div>

      {/* Month header line (mobile only) */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 shrink-0">
          {dayjs(selectedDate).format("MMM DD")}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
      </div>

      {/* Days Scroll - Mobile optimized */}
      <div className="relative group">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-10 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />

        <div
          ref={scrollContainerRef}
          className="flex gap-1.5 sm:gap-2.5 overflow-x-auto py-1 px-1 scroll-smooth snap-x snap-mandatory"
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
              <div
                key={`${d.date}-${idx}`}
                className="flex flex-col snap-center"
              >
                {d.isFirstOfMonth && idx > 0 && (
                  <div className="flex items-center justify-center -mt-0.5 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {d.month.slice(0, 3)} {d.year.slice(-2)}
                    </span>
                  </div>
                )}
                <button
                  key={idx}
                  onClick={() => onChange(d.date)}
                  className={`relative px-2 sm:px-2.5 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-center min-w-[52px] sm:min-w-[68px] border transition-all duration-200 active:scale-92 overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 scale-[1.02] border-transparent"
                      : d.isToday
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-violet-400/60 dark:border-violet-500/50 shadow-sm shadow-violet-500/10 hover:shadow-md hover:shadow-violet-500/15"
                      : isPast
                      ? "bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-500 border-transparent hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700/60 hover:border-violet-200 dark:hover:border-violet-800/50 hover:shadow-sm"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.25),transparent_55%)]" />
                  )}
                  <div
                    className={`relative text-sm sm:text-lg font-extrabold tracking-tight leading-none ${
                      isSelected ? "drop-shadow-sm" : ""
                    }`}
                  >
                    {d.dayNumber}
                  </div>
                  <div
                    className={`relative text-[9px] sm:text-[11px] font-bold mt-1 uppercase tracking-[0.08em] ${
                      isSelected
                        ? "text-white/85"
                        : d.isToday && !isSelected
                        ? "text-violet-600 dark:text-violet-400"
                        : ""
                    }`}
                  >
                    {d.weekday.slice(0, 2)}
                  </div>
                  {d.isToday && !isSelected && (
                    <div className="relative flex justify-center mt-1">
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-500" />
                    </div>
                  )}
                  {d.isToday && isSelected && (
                    <div className="relative flex justify-center mt-1">
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white shadow-sm" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected date pill (mobile only) */}
      <div className="flex items-center justify-center sm:hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-900/40">
          <CalendarIcon
            size={12}
            className="text-violet-600 dark:text-violet-400"
          />
          <span className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300 tracking-wide">
            {dayjs(selectedDate).format("dddd, MMM D")}
          </span>
        </div>
      </div>
    </div>
  );
}
