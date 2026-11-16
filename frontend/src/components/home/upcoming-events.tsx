import { useMemo } from "react";
import { SectionHeading } from "./ui-util";

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


export default function UpcomingEvents({ events = defaultEvents }: { events?: UpcomingEvent[] }) {
  const visibleEvents = useMemo(() => events.length ? events : defaultEvents, [events]);

  return (
    <section id="events" className="scroll-mt-[120px] space-y-8">
      <SectionHeading title="Upcoming Events" subtitle="Connect. Create. Collaborate" />
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
    </section>
  );
}