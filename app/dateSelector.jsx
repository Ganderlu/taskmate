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
          className={`px-4 py-2 rounded-xl text-center border 
            ${selectedDate === d.date ? "bg-blue-600 text-white" : "bg-gray-100"}
            ${d.isToday ? "border-blue-600" : "border-transparent"}
          `}
        >
          <div className="font-bold">{d.dayNumber}</div>
          <div className="text-xs">{d.weekday}</div>
        </button>
      ))}
    </div>
  );
}
