import { FacebookIcon, FacebookLink } from '@/features/astrascend/components/FacebookLink';
import { DiscordIcon, DiscordLink } from '@/features/astrascend/components/DiscordLink';
import wordmark from '@/assets/astra-home/wordmark.png';

export default function LandingFooter() {
  return (
    <footer className="relative border-t z-10 border-astra-primary-dark/80 px-[112px] py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 sm:flex-row">
        <img src={wordmark} alt="ASTRA Developers" className="w-40" />
        <p className="font-astra text-xs text-astra-white">An initiative of ASTRA Developers · AY 2026-2027</p>
        <div className="flex justify-center items-center gap-4">
          {/* <a href="https://www.facebook.com" target='_blank' aria-label="ASTRA Developers on Facebook" className="text-astra-white hover:text-astra-primary-light"><FacebookIcon className="h-5 w-5" /></a> */}
          {/* <a href="https://discord.com" target='_blank' aria-label="ASTRA Developers on Discord" className="text-astra-white hover:text-astra-primary-light"><DiscordIcon className="h-5 w-5" /></a> */}
          <FacebookLink className='w-5 h-5' >
            <FacebookIcon className='' />
          </FacebookLink>
          <DiscordLink className='w-5 h-5' >
            <DiscordIcon className='' />
          </DiscordLink>
        </div>
      </div>
    </footer>
  );
}