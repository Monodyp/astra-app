import { useMemo } from "react";
import { SectionHeading, technicalCorners } from "./ui-util";

export type UpcomingEvent = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status?: string;
};

function NoEvents() {
  return (
    <div
      role="status"
      className="border border-astra-primary-dark relative mx-0 flex flex-col items-center overflow-hidden bg-astra-black/40 px-4 py-10 text-center sm:mx-6 sm:px-8 sm:py-16 lg:mx-12"
    >
      {technicalCorners}
      {/* Soft glow behind the icon, matching the site's cyan accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-2xl"
      />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-astra-primary-light"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M9 15h6" />
        </svg>
      </div>

      <h3 className="relative mt-6 font-astra text-2xl font-bold text-astra-white">
        No upcoming events yet
      </h3>
      <p className="relative mt-3 max-w-sm font-astra text-base leading-6 text-astra-white/70">
        New workshops and projects are on the way. Check back soon!
      </p>
    </div>
  );
}

export default function UpcomingEvents({ events }: { events?: UpcomingEvent[] }) {
  const visibleEvents = useMemo(() => events, [events]);
  const hasEvents = !!visibleEvents?.length;

  return (
    <section id="events" className="scroll-mt-24 lg:scroll-mt-[120px] space-y-8">
      <SectionHeading title="Upcoming Events" subtitle="Connect. Create. Collaborate" />
      {!hasEvents ? (
        <NoEvents />
      ) : (
        <div
          className="mx-0 sm:mx-6 lg:mx-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:gap-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {visibleEvents.map((event) => (
            <article key={event.id} className="relative w-full min-w-0 shrink-0 snap-start overflow-hidden rounded-2xl bg-astra-black p-5 sm:min-w-[min(88vw,550px)] sm:w-auto sm:p-8">
              {event.imageUrl && <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
              <div className="relative flex flex-col justify-between gap-12 sm:gap-20">
                <div>
                  <p className=" font-astra text-xs font-bold text-astra-primary-light">{event.status ?? 'Happening Soon'}</p>
                  <h3 className="mt-2 font-astra text-2xl font-bold text-astra-white">{event.title}</h3>
                  <p className="mt-4 max-w-sm font-astra text-base leading-6 text-astra-white">{event.description}</p>
                </div>
                <a href={`/events/${event.id}`} className="inline-flex min-h-11 items-center self-end rounded-full bg-astra-primary-light px-6 py-2 font-astra text-sm font-bold text-white transition-transform hover:scale-105">Register Now</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
