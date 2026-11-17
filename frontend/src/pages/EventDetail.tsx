import React from 'react';
import { Link, useParams } from 'react-router-dom';
import wordmark from '../assets/astra-home/wordmark.png';

/** Target of the homepage "Register Now" links. Registration is not implemented, and we say so. */
export const EventDetail: React.FC = () => {
  const { id = '' } = useParams();
  return (
    <div className="flex min-h-dvh items-start justify-center bg-astra-black px-4 py-10 font-astra text-astra-white">
      <main className="w-full max-w-md space-y-4 border border-astra-primary-dark bg-black/30 p-5">
        <img src={wordmark} alt="ASTRA Developers" className="h-auto w-28" />
        <h1 className="text-xl font-bold">Event registration is not open yet</h1>
        <p className="text-sm text-astra-gray">
          Online registration for this event (<span className="break-all">{id}</span>) is not available in the app yet. Watch the ASTRA Discord and Facebook pages for announcements.
        </p>
        <Link to="/#events" className="flex min-h-12 items-center justify-center border border-astra-primary-light font-bold">Back to events</Link>
        <a href="https://discord.gg/NRvkKxkNxG" target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center border border-astra-primary-dark font-bold">
          Join the Discord community
        </a>
      </main>
    </div>
  );
};
