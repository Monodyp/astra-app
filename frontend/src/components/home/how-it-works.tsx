import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";

import howId from '@/assets/astra-home/how-id.png';
import howEvents from '@/assets/astra-home/how-events.png';
import howPerks from '@/assets/astra-home/how-perks.png';
import { ActionLink, technicalCorners } from "./ui-util";

const workflowSlides = [
  {
    eyebrow: 'Get Verified',
    title: 'Your digital ID is your membership pass.',
    description: 'Claim your digital ID and activate your annual member status.',
    action: 'Claim your ID',
    image: howId,
    href: '/login',
  },
  {
    eyebrow: 'Attend & Contribute',
    title: 'Every workshop and project earns you points.',
    description:
      'Check into campus workshops and contribute to student dev projects to rack up points.',
    action: 'Check events',
    image: howEvents,
    href: '#events',
  },
  {
    eyebrow: 'Redeem Perks',
    title: 'Turn your points into real rewards.',
    description:
      'Spend points in the perks marketplace for partner vouchers and swag.',
    action: 'Browse perks',
    image: howPerks,
    href: '#console',
  },
];

export default function HowItWorks() {
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const updateActiveSlide = () => {
      setActiveSlide(carouselApi.selectedScrollSnap());
    };

    updateActiveSlide();
    carouselApi.on('select', updateActiveSlide);

    return () => {
      carouselApi.off('select', updateActiveSlide);
    };
  }, [carouselApi]);

  return (
    <section id="how-it-works" className="scroll-mt-[150px] space-y-8 lg:scroll-mt-[120px]">
    <div className="mx-0 flex flex-col gap-2 sm:mx-6 sm:flex-row lg:mx-12 sm:items-end sm:justify-between">
      <h2 className="font-astra text-3xl font-bold tracking-tight text-astra-white sm:text-4xl">How the App Works</h2>
      <p className="font-astra text-sm text-astra-gray">A quick briefing before you begin.</p>
    </div>
      {/* Phones (390px reference): three stacked numbered cards instead of the carousel */}
      <ol className="space-y-4 md:hidden" aria-label="How the app works">
        {workflowSlides.map((slide, index) => (
          <li key={slide.eyebrow} className="relative border border-astra-primary-dark bg-black/30 p-4">
            {technicalCorners}
            <h3 className="font-astra text-base font-bold text-astra-white">{index + 1}. {slide.eyebrow}</h3>
            <p className="mt-3 font-astra text-base leading-6 text-astra-gray">{slide.description}</p>
            <ActionLink className="mt-3" href={slide.href}>{slide.action}</ActionLink>
          </li>
        ))}
      </ol>
      <Carousel
        opts={{ loop: true, align: 'center' }}
        plugins={[autoplay.current]}
        setApi={setCarouselApi}
        onMouseEnter={autoplay.current.stop}
        onMouseLeave={autoplay.current.reset}
        className="relative hidden md:block"
      >
        <CarouselContent className="ml-0 gap-8 pl-8">
          {workflowSlides.map((slide) => (
            <CarouselItem
              key={slide.eyebrow}
              className="basis-[88%] pl-0 sm:basis-[78%] lg:basis-[85%]"
            >
              {technicalCorners}
              <div className="grid min-h-[420px] w-full items-center gap-10 border border-astra-primary-dark bg-black/30 p-6 shadow-[0_0_30px_rgba(0,140,204,0.09)] sm:p-12 lg:grid-cols-[1fr_290px]">
                <div className="max-w-xl">
                  <p className="font-astra text-sm font-bold text-astra-white">{slide.eyebrow}</p>
                  <h3 className="mt-2 font-astra text-2xl font-medium leading-8 text-astra-white">{slide.title}</h3>
                  <p className="mt-3 max-w-sm font-astra text-base leading-6 text-astra-gray">{slide.description}</p>
                  <ActionLink className="mt-8" href={slide.href}>{slide.action}</ActionLink>
                </div>
                <img src={slide.image} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_4px_26px_3px_rgba(133,133,133,0.25)]" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-4 flex items-center justify-center gap-2">
          <CarouselPrevious className="h-11 w-11 xl:h-8 xl:w-8 !static !translate-y-0 border-astra-primary-dark bg-astra-black text-astra-white hover:bg-astra-primary-dark" />
          <div className="flex items-center gap-2" aria-label="How the app works slides">
            {workflowSlides.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => carouselApi?.scrollTo(index)}
                aria-label={`Show ${item.eyebrow}`}
                aria-current={index === activeSlide ? 'true' : undefined}
                className="group inline-flex h-11 w-11 items-center justify-center"
              >
                <span className={`rounded-full transition-all ${index === activeSlide ? 'h-3 w-3 bg-astra-primary-light' : 'h-2.5 w-2.5 bg-astra-gray/50'}`} />
              </button>
            ))}
          </div>
          <CarouselNext className="h-11 w-11 xl:h-8 xl:w-8 !static !translate-y-0 border-astra-primary-dark bg-astra-black text-astra-white hover:bg-astra-primary-dark" />
        </div>
      </Carousel>
    </section>
  );
}