import React from 'react';

import windowView from '../assets/astra-home/window-view.png';

import { MemberIdCard } from '../components/MemberIdCard';
import LandingHeader from '@/components/home/landing-header';

import wordmark from '../assets/astra-home/wordmark.png';
import { ActionLink, technicalCorners } from '@/components/home/ui-util';
import { TiltCard } from '@/components/home/tilt-wrapper';
import FeatureOverview from '@/components/home/feature-overview';
import HowItWorks from '@/components/home/how-it-works';
import MemberConsole from '@/components/home/member-console';
import UpcomingEvents from '@/components/home/upcoming-events';
import EventsCalendar from '@/components/home/events-calendar';
import LandingFooter from '@/components/home/landing-footer';

export const Home: React.FC = () => {
  return (
    <div id="home" className="relative min-h-screen overflow-hidden bg-astra-black font-astra text-astra-white">
      {/* Star field currently disabled as it lags ID interaction, currently seeking solution */}
      {/* <Starfield /> */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src={windowView} alt="" className="h-full w-full object-cover object-top" />
      </div>
      <LandingHeader />
      <main className="pt-[150px] lg:pt-[150px] relative z-10 mx-auto max-w-[1440px] px-4 pb-12 sm:px-8 lg:px-12 lg:pb-16">

        <div className="flex flex-col gap-14 py-4 sm:border sm:border-astra-primary-dark sm:py-12 lg:gap-28">
          <section id='home' className="mx-0 sm:mx-6 lg:mx-12 scroll-mt-[150px]">
            <div className="mb-3 hidden justify-between sm:flex gap-4 font-astra text-[10px] font-bold tracking-widest text-astra-gray">
              <span>ASTRA / FLIGHT INTERFACE</span>
              <span>WINDOW PROJECTION · ONLINE</span>
            </div>
            <div className="grid items-start gap-8 lg:grid-cols-[3fr_2.7fr] lg:gap-16">
              <div>
                <img src={wordmark} alt="ASTRA Developers" className="mb-5 w-44" />
                <h1 className="max-w-xl font-astra text-4xl font-bold leading-tight tracking-tight text-astra-white sm:text-5xl">One App for Your Student Developer Journey.</h1>
                <p className="mt-5 max-w-lg font-astra text-base leading-6 text-astra-gray">The central hub for ASTRA Developers members. Access your official digital member ID, earn points by attending workshops and building projects, and redeem exclusive partner perks.</p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                  <a href="/login" className="order-1 flex min-h-12 items-center justify-center border-2 border-astra-primary-light font-astra text-sm font-bold text-astra-white sm:hidden">Join ASTRA / Login</a>
                  <a href="#features" className="order-2 flex min-h-12 items-center justify-center rounded-full border border-astra-primary-dark px-7 py-3 font-astra text-sm font-bold text-astra-white sm:order-none sm:inline-flex sm:min-h-0 sm:border-0 sm:bg-astra-primary-light sm:text-white sm:transition-transform sm:hover:scale-105">Explore Features</a>
                  <ActionLink href="/login" className="hidden sm:inline-flex">Join ASTRA</ActionLink>
                </div>
              </div>
              <TiltCard className='mt-8 w-full aspect-[600/378]  max-w-sm lg:max-w-md'>
                <MemberIdCard />
              </TiltCard>
            </div>
          </section>
          <FeatureOverview />
          <HowItWorks />
          <MemberConsole />
          <UpcomingEvents />
          <EventsCalendar />
          <section className="mx-0 sm:mx-6 lg:mx-12 relative border border-astra-primary-dark bg-black/30 px-4 py-10 text-center sm:py-14 shadow-[0_0_16px_rgba(0,140,204,0.07)] sm:px-10">
            {technicalCorners}
            <h2 className="font-astra text-xl font-bold text-astra-white">Ready to build with ASTRA Developers?</h2>
            <p className="mt-3 font-astra text-base text-astra-white">Join hundreds of student engineers, designers, and innovators on campus.</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <a href="/login" className="flex min-h-12 w-full items-center justify-center rounded-full bg-astra-primary-light px-7 py-3 font-astra text-base font-bold text-white transition-transform hover:scale-105 sm:inline-flex sm:w-auto">Login to Portal</a>
              <ActionLink href="https://discord.gg/NRvkKxkNxG">Join Discord Community</ActionLink>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
};
