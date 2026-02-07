"use client";
import { useState, useEffect } from "react";
import dayjs from "dayjs";

export default function DateSelector({ selectedDate, onChange }) {
  const [days, setDays] = useState([]);

  useEffect(() => {
    const today = dayjs();
    const twoWeeks = [];

    for (let i = -3; i <= 10; i++) {
      const d = today.add(i, "day");
      twoWeeks.push({
        date: d.format("YYYY-MM-DD"),
        dayNumber: d.format("D"),
        weekday: d.format("ddd"),
        isToday: d.isSame(today, "day"),
      });
    }

    setDays(twoWeeks);
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto py-3">
      {days.map((d, idx) => (
        <button
          key={idx}
          onClick={() => onChange(d.date)}
          className={`px-4 py-2 rounded-xl text-center border min-w-[70px] transition-all
            ${selectedDate === d.date 
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-105" 
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"}
            ${d.isToday ? "border-purple-600" : "border-gray-100 dark:border-gray-800"}
          `}
        >
          <div className="font-bold">{d.dayNumber}</div>
          <div className="text-xs">{d.weekday}</div>
        </button>
      ))}
    </div>
  );
}
