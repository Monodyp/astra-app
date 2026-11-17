import { Sparkles } from "lucide-react";
import { ActionLink, SectionHeading, technicalCorners } from "./ui-util";

export default function MemberConsole() {
  const activities = [
    ['+ 100 Points', 'Workshop Participation'],
    ['+ 100 Points', 'Project Contribution'],
    ['- 50 Points', 'Claimed Coffee Voucher'],
  ];

  return (
    <section id="console" className="scroll-mt-[120px] space-y-8">
      <SectionHeading title="Your Member Console" subtitle="Your progress. Your next opportunity." />
      <div className="mx-12 grid gap-8 xl:grid-cols-[1.15fr_1fr]">
        <div className="relative border border-astra-primary-dark bg-black/30 p-6 shadow-[0_0_16px_rgba(0,140,204,0.07)] sm:p-8">
          {technicalCorners}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-astra text-lg font-bold text-astra-white">Your Membership Dashboard</h3>
              <p className="mt-3 font-astra text-4xl font-bold text-astra-white">430 <span className="text-xl">pts</span></p>
            </div>
            <div className="text-right">
              <span className="inline-flex rounded-full bg-astra-secondary px-5 py-2 font-astra text-sm font-bold text-white">Active</span>
              <p className="mt-2 font-astra text-xs text-astra-gray">Valid until Aug 2027</p>
            </div>
          </div>
          <h4 className="mt-10 font-astra text-lg font-medium text-astra-white">Recent Activity</h4>
          <div className="mt-5 space-y-4">
            {activities.map(([points, label]) => (
              <div key={label} className="relative flex gap-3 pl-1">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-astra-primary-light" />
                <div className="flex flex-1 items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="font-astra text-sm text-astra-white">{points}</p>
                    <p className="font-astra text-xs text-astra-gray">{label}</p>
                  </div>
                  <span className="whitespace-nowrap font-astra text-xs text-astra-gray">Mar 25, 2026 · 3:00 PM</span>
                </div>
              </div>
            ))}
          </div>
          <ActionLink className="mt-8" href="/login">Join Now to Start Earning</ActionLink>
        </div>
        <div className="relative border border-astra-primary-dark bg-black/30 p-6 shadow-[0_0_16px_rgba(0,140,204,0.07)] sm:p-8">
          {technicalCorners}
          <h3 className="font-astra text-lg font-bold text-astra-white">Perks &amp; Partner Rewards</h3>
          <div className="mt-6 space-y-4">
            {['Voucher Name', 'Coffee Voucher'].map((name) => (
              <div key={name} className="p-2 flex items-center justify-between overflow-hidden rounded-2xl bg-astra-secondary text-black">
                <div className="flex items-center gap-4 p-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-astra-primary-light/20">
                    <Sparkles className="h-6 w-6 text-astra-white" />
                  </div>
                  <div>
                    <p className="font-astra text-astra-white text-label-lg font-medium">{name}</p>
                    <p className="font-astra text-astra-white text-h5">150 <span className="text-label-md font-bold">pts</span></p>
                    <p className="font-astra text-astra-white text-label-md">Brew &amp; Bean</p>
                  </div>
                </div>
                <div className="h-24 pl-2  flex items-center justify-center w-14 text-astra-white border-l-2 border-dashed border-astra-primary-dark/50 font-astra text-h6 font-bold [writing-mode:vertical-rl]">Redeem</div>
              </div>
            ))}
          </div>
          <ActionLink className="mt-8" href="/marketplace">Explore More Rewards</ActionLink>
        </div>
      </div>
    </section>
  );
}