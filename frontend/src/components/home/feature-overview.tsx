import {
  CircleUserRound,
  Medal,
  ScanLine,
  ShoppingCart,
} from 'lucide-react';
import { technicalCorners } from './ui-util';

type Feature = {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
};

const features: Feature[] = [
  {
    title: 'Digital Member ID',
    description: 'Verified student membership status and instant entry pass.',
    icon: CircleUserRound,
    href: '#console',
  },
  {
    title: 'Points & Rewards',
    description: 'Earn points for hackathons, workshops, and code contributions.',
    icon: Medal,
    href: '#console',
  },
  {
    title: 'Perks Marketplace',
    description: 'Trade points for discounts, exclusive merch, and partner perks.',
    icon: ShoppingCart,
    href: '#console',
  },
  {
    title: 'Fast Event Check-In',
    description: 'Seamless check-in system at all campus tech events.',
    icon: ScanLine,
    href: '#events',
  },
];

export default function FeatureOverview() {
  return (
    <section id="features" className="scroll-mt-[120px] xl:mt-16 relative border border-astra-primary-dark/90 bg-black/20 p-5 mx-12 sm:p-8">
      {technicalCorners}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ title, description, icon: Icon, href }) => (
          <a key={title} href={href} className="group flex flex-col items-center text-center">
            <Icon className="mb-4 h-12 w-12 text-astra-white transition-colors group-hover:text-astra-primary-light" strokeWidth={1.3} />
            <h3 className="font-astra text-lg font-bold text-astra-white group-hover:text-astra-primary-light">{title}</h3>
            <p className="mt-2 max-w-[240px] font-astra text-sm leading-6 text-astra-gray group-hover:text-astra-primary-light">{description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
