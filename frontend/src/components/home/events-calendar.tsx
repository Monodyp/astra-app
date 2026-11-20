import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { technicalCorners } from "./ui-util";

export type CalendarEvent = { date: string; title: string }; // date: YYYY-MM-DD

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Month calendar for the public homepage. Events come from the `events` prop;
 * none are published to this frontend yet, so by default the grid is empty and
 * says so (no invented dates).
 */
export default function EventsCalendar({
  events = [],
  initialMonth,
}: {
  events?: CalendarEvent[];
  initialMonth?: Date;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = initialMonth ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = `${year}-${pad(month + 1)}-`;
  const monthEvents = events.filter((e) => e.date.startsWith(prefix));
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));
  const navBtn =
    "inline-flex h-11 w-11 items-center justify-center border border-astra-primary-dark text-astra-white hover:bg-astra-primary-dark";

  return (
    <section id="events-calendar" className="scroll-mt-[150px] space-y-8 lg:scroll-mt-[120px]" aria-labelledby="events-calendar-heading">
      <div className="mx-0 flex flex-col gap-2 sm:mx-6 sm:flex-row sm:items-end sm:justify-between lg:mx-12">
        <h2 id="events-calendar-heading" className="font-astra text-3xl font-bold tracking-tight text-astra-white sm:text-4xl">Events Calendar</h2>
        <p className="font-astra text-sm text-astra-gray">Plan your semester.</p>
      </div>
      <div className="relative mx-0 border border-astra-primary-dark bg-black/30 p-4 sm:mx-6 sm:p-8 lg:mx-12">
        {technicalCorners}
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={navBtn} onClick={() => move(-1)} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h3 className="text-center font-astra text-lg font-bold text-astra-white" aria-live="polite">{label}</h3>
          <button type="button" className={navBtn} onClick={() => move(1)} aria-label="Next month">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div role="grid" aria-label={`Calendar for ${label}`} className="mt-4">
          <div role="row" className="grid grid-cols-7 text-center font-astra text-[11px] font-bold uppercase text-astra-gray sm:text-xs">
            {WEEKDAYS.map((d) => (
              <span key={d} role="columnheader" className="py-2">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-astra-primary-dark/40">
            {cells.map((day, i) => {
              const dayEvents = day ? monthEvents.filter((e) => e.date === `${prefix}${pad(day)}`) : [];
              return (
                <div
                  key={i}
                  role="gridcell"
                  aria-current={day && isToday(day) ? "date" : undefined}
                  className={`flex min-h-11 flex-col items-center bg-astra-black p-1 font-astra text-sm sm:min-h-16 sm:items-start sm:p-2 ${
                    day && isToday(day) ? "text-astra-primary-light ring-1 ring-inset ring-astra-primary-light" : "text-astra-white"
                  }`}
                >
                  {day}
                  {dayEvents.map((e) => (
                    <span key={e.title} className="mt-1 hidden truncate text-[11px] text-astra-primary-light sm:block">{e.title}</span>
                  ))}
                  {dayEvents.length > 0 && <span className="sr-only">{dayEvents.map((e) => e.title).join(", ")}</span>}
                </div>
              );
            })}
          </div>
        </div>
        {monthEvents.length === 0 ? (
          <p className="mt-4 font-astra text-sm text-astra-gray">
            No events are published for {label} yet. Dates are announced on our Discord and Facebook pages.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 font-astra text-sm text-astra-white">
            {monthEvents.map((e) => (
              <li key={e.date + e.title}>{e.date}: {e.title}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
