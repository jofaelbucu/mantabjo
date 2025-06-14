import * as React from "react";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

export interface CalendarProps {
  selected?: Date | { from?: Date; to?: Date };
  onSelect: (date?: Date | { from?: Date; to?: Date }) => void;
  mode?: "single" | "range";
  locale?: Locale;
  initialFocus?: boolean;
  numberOfMonths?: number;
  defaultMonth?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  mode = "single",
  locale = indonesiaLocale,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      if (mode === "range") {
        onSelect({ from: newDate, to: newDate });
      } else {
        onSelect(newDate);
      }
    }
  };

  let displayDate = "";
  if (mode === "single" && selected instanceof Date && !isNaN(selected.getTime())) {
    displayDate = format(selected, "yyyy-MM-dd");
  } else if (
    mode === "range" &&
    typeof selected === "object" &&
    selected?.from instanceof Date &&
    !isNaN(selected.from.getTime())
  ) {
    displayDate = format(selected.from, "yyyy-MM-dd");
  }

  return (
    <div className={mode === "range" ? "w-[320px]" : "w-full"}>
      <label className="block text-sm font-semibold text-white mb-1">
        Pilih Tanggal
      </label>
      <input
        type="date"
        value={displayDate}
        onChange={handleChange}
        className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-white text-black placeholder-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ colorScheme: "light" }}
      />
      {mode === "range" && (
        <p className="text-sm mt-1 text-white">
          Tanggal dipilih: {displayDate ? displayDate : "Belum dipilih"}
        </p>
      )}
    </div>
  );
};

export default Calendar;
