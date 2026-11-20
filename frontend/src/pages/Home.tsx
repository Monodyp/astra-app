import React from 'react';

import astraBg from '../assets/astra-home/Astra-Bg.png';

import { MemberIdCard } from '../components/id/MemberIdCard';
import LandingHeader from '@/components/home/landing-header';

import wordmark from '../assets/astra-home/wordmark.png';
import { ActionLink, technicalCorners } from '@/components/home/ui-util';
import { TiltCard } from '@/components/id/tilt-wrapper';
import FeatureOverview from '@/components/home/feature-overview';
import HowItWorks from '@/components/home/how-it-works';
import MemberConsole from '@/components/home/member-console';
import UpcomingEvents from '@/components/home/upcoming-events';
import EventsCalendar from '@/components/home/events-calendar';
import LandingFooter from '@/components/home/landing-footer';
import Starfield from '@/components/star-field';
import { FloatingCardWrapper } from '@/components/id/FloatingCardWrapper';

export const Home: React.FC = () => {
  return (
    <div
      id="home"
      className="relative min-h-screen overflow-hidden bg-astra-black font-astra text-astra-white"
    >
      <Starfield />
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src={astraBg}
          alt=""
          className="h-full w-full object-cover object-top"
        />
      </div>
      <LandingHeader />
      <main className="pt-[150px] relative z-10 mx-auto max-w-[1440px] px-4 pb-16 sm:px-8 lg:px-12">
        <div className="flex flex-col border border-astra-primary-dark gap-28 py-12">
          <section id="home" className="mx-12">
            <div className="mb-3 flex justify-between gap-4 font-astra text-[10px] font-bold tracking-widest text-astra-gray">
              <span>ASTRA / FLIGHT INTERFACE</span>
              <span>WINDOW PROJECTION · ONLINE</span>
            </div>
            <div className="grid items-start gap-8 lg:grid-cols-[3fr_2.7fr] lg:gap-16">
              <div>
                <img
                  src={wordmark}
                  alt="ASTRA Developers"
                  className="mb-5 w-44"
                />
                <h1 className="max-w-xl font-astra text-4xl font-bold leading-tight tracking-tight text-astra-white sm:text-5xl">
                  One App for Your Student Developer Journey.
                </h1>
                <p className="mt-5 max-w-lg font-astra text-base leading-6 text-astra-gray">
                  The central hub for ASTRA Developers members. Access your
                  official digital member ID, earn points by attending workshops
                  and building projects, and redeem exclusive partner perks.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                  <a
                    href="/login"
                    className="order-1 flex min-h-12 items-center justify-center border-2 border-astra-primary-light font-astra text-sm font-bold text-astra-white sm:hidden"
                  >
                    Join ASTRA / Login
                  </a>
                  <a
                    href="#features"
                    className="order-2 flex min-h-12 items-center justify-center rounded-full border border-astra-primary-dark px-7 py-3 font-astra text-sm font-bold text-astra-white sm:order-none sm:inline-flex sm:min-h-0 sm:border-0 sm:bg-astra-primary-light sm:text-white sm:transition-transform sm:hover:scale-105"
                  >
                    Explore Features
                  </a>
                  <ActionLink href="/login" className="hidden sm:inline-flex">
                    Join ASTRA
                  </ActionLink>
                </div>
              </div>
              <div className="mx-auto flex aspect-[600/460] w-full min-w-0 max-w-[480px] items-center justify-center lg:mx-0 lg:mt-8 lg:block lg:aspect-auto lg:max-w-md">
                <FloatingCardWrapper
                  isPreview={true}
                  className="w-full max-w-md sm:max-w-lg aspect-[600/378]"
                  glowColor={'rgba(0, 177, 237, 0.25)'}
                >
                  <TiltCard
                    desktopInteractionOnly
                    className="aspect-[600/378] w-[82%] min-w-0 -translate-y-[8%] lg:w-full lg:translate-y-0"
                    isInteractable={true}
                  >
                    <MemberIdCard />
                  </TiltCard>
                </FloatingCardWrapper>
              </div>
            </div>
          </section>
          <FeatureOverview />
          <HowItWorks />
          <MemberConsole />
          <UpcomingEvents />
          <EventsCalendar />
          <section className="mx-12 relative border border-astra-primary-dark bg-black/30 px-6 py-14 text-center shadow-[0_0_16px_rgba(0,140,204,0.07)] sm:px-10">
            {technicalCorners}
            <h2 className="font-astra text-xl font-bold text-astra-white">
              Ready to build with ASTRA Developers?
            </h2>
            <p className="mt-3 font-astra text-base text-astra-white">
              Join hundreds of student engineers, designers, and innovators on
              campus.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/login"
                className="rounded-full bg-astra-primary-light px-7 py-3 font-astra text-base font-bold text-white transition-transform hover:scale-105"
              >
                Login to Portal
              </a>
              <ActionLink href="https://discord.gg/NRvkKxkNxG">
                Join Discord Community
              </ActionLink>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
};
