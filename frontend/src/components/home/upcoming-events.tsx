import { useMemo } from "react";
import { SectionHeading, technicalCorners } from "./ui-util";

import eventOne from '@/assets/astra-home/event-one.png';
import eventTwo from '@/assets/astra-home/event-two.png';
import eventThree from '@/assets/astra-home/event-three.png';

export type UpcomingEvent = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status?: string;
};

const defaultEvents: UpcomingEvent[] = [
  {
    id: 'html-css-lab',
    title: "What's in the BAHHHx?!",
    description:
      'Learn how to build your first webpage with HTML and CSS. Beginners welcome. Bring your laptop.',
    imageUrl: eventOne,
    status: 'Happening Soon',
  },
  {
    id: 'frontend-lab',
    title: "What's in the BAHHHx?!",
    description:
      'Learn how to build your first webpage with HTML and CSS. Beginners welcome. Bring your laptop.',
    imageUrl: eventTwo,
    status: 'Happening Soon',
  },
  {
    id: 'community-lab',
    title: "What's in the BAHHHx?!",
    description:
      'Learn how to build your first webpage with HTML and CSS. Beginners welcome. Bring your laptop.',
    imageUrl: eventThree,
    status: 'Happening Soon',
  },
];


function NoEvents() {
  return (
    <div
      role="status"
      className="border border-astra-primary-dark relative mx-12 flex flex-col items-center overflow-hidden bg-astra-black/40 px-8 py-16 text-center"
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
    <section id="events" className="scroll-mt-[120px] space-y-8">
      <SectionHeading title="Upcoming Events" subtitle="Connect. Create. Collaborate" />

      {!hasEvents ? (
        <NoEvents />
      ) : (
        <div
          className="mx-12 flex snap-x gap-6 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {visibleEvents.map((event) => (
            <article key={event.id} className="relative min-w-[min(88vw,550px)] snap-start overflow-hidden rounded-2xl bg-astra-black p-8">
              {event.imageUrl && <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
              <div className="relative flex flex-col justify-between gap-20">
                <div>
                  <p className=" font-astra text-xs font-bold text-astra-primary-light">{event.status ?? 'Happening Soon'}</p>
                  <h3 className="mt-2 font-astra text-2xl font-bold text-astra-white">{event.title}</h3>
                  <p className="mt-4 max-w-sm font-astra text-base leading-6 text-astra-white">{event.description}</p>
                </div>
                <a href={`/events/${event.id}`} className="self-end rounded-full bg-astra-primary-light px-6 py-2 font-astra text-sm font-bold text-white transition-transform hover:scale-105">Register Now</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}