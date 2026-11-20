import { FacebookIcon, FacebookLink } from '@/features/astrascend/components/FacebookLink';
import { DiscordIcon, DiscordLink } from '@/features/astrascend/components/DiscordLink';
import wordmark from '@/assets/astra-home/wordmark.png';

export default function LandingFooter() {
  return (
    <footer className="relative border-t z-10 border-astra-primary-dark/80 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-[112px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex flex-col items-start gap-3 self-stretch sm:items-center sm:self-auto">
          <img src={wordmark} alt="ASTRA Developers" className="w-40" />
          <p className="font-astra text-sm font-bold text-astra-white sm:sr-only">ASTRA Developers App</p>
        </div>
        <p className="self-stretch font-astra text-xs text-astra-white sm:self-auto">An initiative of ASTRA Developers · AY 2026-2027</p>
        <div className="flex items-center justify-center gap-4 self-stretch sm:self-auto">
          {/* <a href="https://www.facebook.com" target='_blank' aria-label="ASTRA Developers on Facebook" className="text-astra-white hover:text-astra-primary-light"><FacebookIcon className="h-5 w-5" /></a> */}
          {/* <a href="https://discord.com" target='_blank' aria-label="ASTRA Developers on Discord" className="text-astra-white hover:text-astra-primary-light"><DiscordIcon className="h-5 w-5" /></a> */}
          <FacebookLink className='flex h-11 min-w-11 flex-1 items-center justify-center border border-astra-primary-dark text-astra-white hover:text-astra-primary-light sm:h-11 sm:w-11 sm:min-w-0 sm:flex-none sm:border-0 lg:h-5 lg:w-5 lg:border-0' >
            <FacebookIcon className='h-5 w-5' />
          </FacebookLink>
          <DiscordLink className='flex h-11 min-w-11 flex-1 items-center justify-center border border-astra-primary-dark text-astra-white hover:text-astra-primary-light sm:h-11 sm:w-11 sm:min-w-0 sm:flex-none sm:border-0 lg:h-5 lg:w-5 lg:border-0' >
            <DiscordIcon className='h-5 w-5' />
          </DiscordLink>
        </div>
      </div>
    </footer>
  );
}