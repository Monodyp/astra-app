import React from 'react';

import wordmark from '../assets/astra-home/wordmark.png';
import starfield from '../assets/astra-member/member-starfield.svg';
import photoPlaceholder from '../assets/astra-member/member-photo-placeholder.svg';
import verification from '../assets/astra-member/member-verification.svg';

export type MemberIdCardProps = {
  name?: string;
  memberNumber?: string;
  program?: string;
  yearRole?: string;
  membershipId?: string;
  joinMessage?: string;
  className?: string;
};

// The card is designed at 600px wide. cq(px) converts a design pixel value
// into a share of the card's width, so everything scales with the card.
const DESIGN_WIDTH = 600;
const cq = (px: number) => `${(px / DESIGN_WIDTH) * 100}cqw`;

export const MemberIdCard: React.FC<MemberIdCardProps> = ({
  name = 'Jane Doe',
  memberNumber = '2024-XXXXX',
  program = 'Your Program',
  yearRole = 'Year | Role',
  membershipId = 'ASTR1D-XXXX',
  joinMessage = 'Join to get yours',
  className = '',
}) => {
  return (
    // Container: cqw units inside resolve against this element's width.
    <div className="w-full" style={{ containerType: 'inline-size' }}>
      <article
        className={`relative aspect-[600/378] w-full overflow-hidden border border-[#84b2ea] bg-[linear-gradient(164deg,#102960_9%,#174491_32%,#1a55ab_76%,#124381_109%),linear-gradient(90deg,#097aaa,#097aaa)] text-white ${className}`}
        style={{ borderRadius: cq(22), padding: cq(32) }}
        aria-label={`${name} ASTRA Developers member identification`}
      >
        <img
          src={starfield}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex flex-col items-start" style={{ gap: cq(6) }}>
            <img
              src={wordmark}
              alt="ASTRA Developers"
              className="h-auto"
              style={{ width: cq(221) }}
            />
            <p
              className="font-sans text-[#d3e5ff]"
              style={{ fontSize: cq(10), lineHeight: cq(14) }}
            >
              Member identification
            </p>
          </div>

          <div
            className="flex min-h-0 items-center justify-between"
            style={{ gap: cq(12) }}
          >
            <div className="flex min-w-0 items-start" style={{ gap: cq(20) }}>
              <img
                src={photoPlaceholder}
                alt="Member photo placeholder"
                className="h-auto shrink-0"
                style={{ width: cq(177) }}
              />
              <div className="min-w-0 overflow-hidden">
                <div className="flex flex-col" style={{ gap: cq(4) }}>
                  <p
                    className="truncate font-astra font-bold tracking-tight"
                    style={{ fontSize: cq(32), lineHeight: cq(40) }}
                  >
                    {name}
                  </p>
                  <p
                    className="font-astra text-[#d3e5ff]"
                    style={{ fontSize: cq(16), lineHeight: cq(24) }}
                  >
                    {memberNumber}
                  </p>
                </div>
                <div
                  className="flex flex-col"
                  style={{ marginTop: cq(8), gap: cq(4) }}
                >
                  <p
                    className="font-astra text-[#d3e5ff]"
                    style={{ fontSize: cq(14), lineHeight: cq(20) }}
                  >
                    {program}
                  </p>
                  <p
                    className="font-astra text-[#d3e5ff]"
                    style={{ fontSize: cq(12), lineHeight: cq(16) }}
                  >
                    {yearRole}
                  </p>
                </div>
              </div>
            </div>
            <img
              src={verification}
              alt="Verified membership"
              className="h-auto shrink-0"
              style={{ width: cq(140) }}
            />
          </div>

          <div
            className="flex items-center justify-between font-astra"
            style={{ gap: cq(12) }}
          >
            <p
              className="font-bold"
              style={{ fontSize: cq(12), lineHeight: cq(14) }}
            >
              {membershipId}
            </p>
            <p
              className="font-sans text-[#d3e5ff]"
              style={{ fontSize: cq(10), lineHeight: cq(14) }}
            >
              {joinMessage}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
};