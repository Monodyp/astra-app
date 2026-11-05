import { Link } from 'react-router-dom';
import mascot from '../assets/mascot.png';
import lightWave from '../assets/wave-light.svg';
import darkWave from '../assets/wave-dark.svg';
import glow from '../assets/glow.svg';
import logo from '../assets/logo-blue.png';
import whiteLogo from '../assets/logo-white.png';
import nexLogoDark from '../../../partners_logo/Nex_logo_dark.png';
import nexLogoWhite from '../../../partners_logo/Nex_logo_white.png';
import { DiscordIcon, DiscordLink } from '../components/DiscordLink';
import { serviceCards } from '../forms/services';
import { useAstrascendTheme } from '../components/AstrascendLayout';
import { StarBackground } from '../background/StarBackground';
import {
    badge,
    button,
    container,
    focus,
    heading,
    section,
    sectionCopy,
    sectionHeading,
} from '../styles/styles';

const steps = [
    [
        'Browse and submit',
        'Read the guidelines and send the form for your service.',
    ],
    ['Review', 'Officers check requirements, feasibility, and capacity.'],
    ['Approve and assign', 'An authorized lead approves and assigns a team.'],
    [
        'Build or deliver',
        'The team works while a Project Lead tracks progress.',
    ],
    ['Check and hand over', 'We review the output and deliver it to you.'],
    ['Feedback and closure', 'We collect feedback and close the request.'],
];
const questions = [
    [
        'Who can submit a request?',
        'Students, campus organizations, colleges, community groups, and suitable external or industry partners can propose a request or collaboration. Learning support is intended mainly for ASTRA members; non-members may be referred.',
    ],
    [
        'Is every request accepted?',
        'Submission does not guarantee acceptance. Officers assess technical readiness, member availability, resources, and leadership approval. Scope and next steps are clarified before work begins. No fixed response time is promised.',
    ],
    [
        'Are the services free?',
        'Any costs for hosting, tools, materials, or external services are discussed and agreed before work begins. Available resources and the project scope determine what support can be offered.',
    ],
    [
        'Does a delivered website include ongoing support?',
        'Ongoing hosting, maintenance, and future changes are separate arrangements. The team will clarify handover responsibilities and any support agreement with you.',
    ],
];

const stepColors = [
    'bg-[#d4e1ff] text-[#0b1437] as-dark:bg-[#14224a]',
    'bg-[#b5ccff] text-[#0b1437] as-dark:bg-[#192e66]',
    'bg-[#8db2ff] text-[#0b1437] as-dark:bg-[#1d3b86]',
    'bg-[#5e91ff] text-[#0b1437] as-dark:bg-[#2250be]',
    'bg-[#2563eb] text-white as-dark:bg-[#2471ff]',
    'bg-[#2563eb] text-white as-dark:bg-[#3a86ff]',
];
const communityCard =
    'flex min-h-[340px] flex-col items-start gap-3.5 rounded-[28px] p-7 sm:min-h-[360px] lg:p-10 as-compact:min-h-[324px] as-compact:p-9';
const communityHeading =
    'text-[28px] font-bold leading-[1.25] lg:text-[32px] as-compact:text-[29px]';
const wave =
    'pointer-events-none absolute left-[calc(50%_-_1100px)] top-[470px] h-[900px] w-[2200px] max-w-none as-compact:top-[calc(100%_-_252px)]';

export function LandingPage() {
    const theme = useAstrascendTheme();
    return (
        <div data-as-landing className="relative as-dark:[--as-muted:#d5e0fa]">
            {theme === 'dark' && <StarBackground />}
            <section
                className="as-hero relative overflow-hidden bg-[#2563eb] text-white as-dark:bg-[#070c1d]"
                data-as-hero
            >
                <img
                    className="pointer-events-none absolute -left-60 -top-60 hidden max-w-none as-dark:block"
                    src={glow}
                    alt=""
                    width="660"
                    height="660"
                />
                <img
                    className="pointer-events-none absolute -bottom-60 -right-60 hidden max-w-none as-dark:block"
                    src={glow}
                    alt=""
                    width="660"
                    height="660"
                />
                <img
                    className={`${wave} as-dark:hidden`}
                    src={lightWave}
                    alt=""
                />
                <img
                    className={`${wave} hidden as-dark:block`}
                    src={darkWave}
                    alt=""
                />
                <div
                    className={`${container} relative grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] md:gap-9 lg:grid-cols-[minmax(0,1fr)_500px] lg:gap-16 lg:py-[88px] as-compact:grid-cols-[minmax(0,1fr)_minmax(0,clamp(312px,45vh,364px))] as-compact:gap-9 as-compact:py-[clamp(43px,5.4vh,50px)]`}
                >
                    <div
                        data-as-star-mask
                        className="flex flex-col items-start gap-6 lg:gap-7 as-compact:gap-[18px]"
                    >
                        <span
                            data-as-star-mask="surface"
                            className={badge(true)}
                        >
                            AN ASTRA DEVELOPERS INITIATIVE · AY 2026–2027 ·
                            LAUNCHING NOV 3
                        </span>
                        <h1
                            className={`${heading} text-[clamp(48px,11vw,72px)] md:text-[64px] lg:text-[clamp(56px,6.4vw,92px)] as-compact:text-[clamp(54px,min(4.5vw,8.1vh),61px)]`}
                        >
                            Great ideas.
                            <br />
                            New heights.
                            <br />
                            Let’s ascend.
                        </h1>
                        <p className="max-w-[620px] text-[18px] font-medium lg:text-[20px] as-compact:text-[18px]">
                            A campus full of possibilities. A community ready to
                            build. Bring your ideas to ASTRA Developers and turn
                            possibility into meaningful impact.
                        </p>
                        <div
                            data-as-star-mask="surface"
                            className="flex w-full max-w-[540px] items-center gap-4 rounded-[24px] border border-[#ffffff40] bg-white/10 p-4 backdrop-blur-sm as-dark:border-[#ffffff26] as-dark:bg-[#ffffff0d] sm:gap-5 sm:p-5 as-compact:max-w-[480px] as-compact:p-4"
                        >
                            <div className="flex shrink-0 flex-col items-center rounded-[16px] border border-[#f59e0b]/60 bg-[#f59e0b]/15 px-3.5 py-2.5 as-compact:px-3 as-compact:py-2">
                                <span className="text-[11px] font-bold tracking-[.14em] text-[#fde68a] as-dark:text-[#fcd34d]">
                                    NOV
                                </span>
                                <span className="text-[30px] font-bold leading-none text-[#f59e0b] as-compact:text-[27px]">
                                    6
                                </span>
                                <span className="text-[11px] font-semibold tracking-[.08em] text-[#fde68a] as-dark:text-[#fcd34d]">
                                    2026
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-[15px] font-bold tracking-[.01em] as-compact:text-[14px]">
                                    <span
                                        aria-hidden="true"
                                        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#f59e0b] motion-reduce:animate-none"
                                    />
                                    Upcoming Briefing
                                </p>
                                <p className="mt-0.5 text-[18px] font-bold as-compact:text-[17px]">
                                    1:00 – 3:00 PM
                                </p>
                                <p className="mt-0.5 text-[14px] font-medium text-white/80 as-compact:text-[13px]">
                                    Stay tuned · details coming soon
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                data-as-star-mask="surface"
                                className={button()}
                                to="/astrascend/request"
                            >
                                Let’s build something ↗
                            </Link>
                            <Link
                                data-as-star-mask="surface"
                                className={button('white')}
                                to="#services"
                            >
                                Explore our services ↓
                            </Link>
                        </div>
                    </div>
                    <div
                        data-as-star-mask="surface"
                        className="as-hero-art relative aspect-[500/520] w-full max-w-[500px] justify-self-center overflow-hidden rounded-[32px] as-dark:shadow-[0_0_24px_#1b63eb33,0_24px_48px_-12px_#0006] md:max-w-none md:justify-self-auto"
                    >
                        <img
                            className="absolute -left-[193.8%] -top-[13.42%] h-[113.42%] w-[310.08%] max-w-none"
                            src={mascot}
                            alt="ASTRA's blue astronaut mascot reaching for new heights"
                        />
                    </div>
                </div>
            </section>
            <div className="bg-ascend-selected py-7 as-dark:bg-[#0a1126] as-compact:py-[25px]">
                <div
                    className={`${container} grid grid-cols-2 items-center justify-between gap-x-6 gap-y-4 text-[14px] font-semibold sm:flex sm:flex-wrap sm:text-[16px]`}
                >
                    <strong
                        data-as-star-mask
                        className="col-span-full text-[12px]"
                    >
                        OPEN TO IDEAS FROM
                    </strong>
                    <span data-as-star-mask>Students</span>
                    <span data-as-star-mask>Campus organizations</span>
                    <span data-as-star-mask>Community groups</span>
                    <span data-as-star-mask>Industry partners</span>
                </div>
            </div>
            <section
                className={`${section} as-dark:bg-[#0d1530]`}
                id="services"
                aria-labelledby="as-services-heading"
            >
                <div className={container}>
                    <div
                        data-as-star-mask
                        className="mb-10 as-compact:mb-[29px]"
                    >
                        <h2
                            data-as-star-mask
                            className={sectionHeading}
                            id="as-services-heading"
                        >
                            What we can do for you
                        </h2>
                        <p className={sectionCopy}>
                            Four services, one request form. Pick the one
                            closest to your need and we’ll route it to the right
                            team.
                        </p>
                    </div>
                    <div className="as-service-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 as-compact:gap-[22px]">
                        {serviceCards.map((card) => (
                            <article
                                data-as-star-mask="surface"
                                className="flex min-h-0 flex-col gap-6 rounded-[20px] border border-ascend-line bg-ascend-panel p-6 shadow-[0_8px_24px_-8px_#0b14370a] as-dark:border-[#ffffff0a] as-dark:bg-[#111d38] sm:min-h-[410px] sm:gap-5 lg:min-h-[455px] lg:px-4 as-wide:px-5 as-compact:min-h-[410px] as-compact:gap-[18px] as-compact:px-[18px] as-compact:py-[22px]"
                                key={card.service}
                            >
                                <div>
                                    <h3 className="text-[26px] font-bold tracking-[-.02em] as-dark:text-[#5c97ff] as-wide:text-[30px] as-compact:text-[27px]">
                                        {card.name}
                                    </h3>
                                    <p className="mt-1 text-[20px] font-medium as-compact:text-[18px]">
                                        {card.title}
                                    </p>
                                    <p className="mt-2 text-[15px] text-ascend-muted">
                                        {card.description}
                                    </p>
                                </div>
                                <ul className="grid list-none gap-2 p-0 text-[17px] as-compact:text-[16px]">
                                    {card.benefits.map((benefit) => (
                                        <li key={benefit}>{benefit}</li>
                                    ))}
                                </ul>
                                <Link
                                    className={`${button('primary', 'service')} mt-auto`}
                                    to={`/astrascend/request?service=${card.service}`}
                                >
                                    {card.action}
                                </Link>
                            </article>
                        ))}
                    </div>
                    <p
                        data-as-star-mask
                        className="mt-8 text-[13px] text-ascend-muted"
                    >
                        A request starts a conversation, not a guaranteed
                        commitment. Services depend on technical readiness,
                        member availability, resources, and leadership approval.
                    </p>
                </div>
            </section>
            <section
                className={`${section} bg-ascend-tint as-dark:bg-[#070c1d]`}
                id="how-it-works"
                aria-labelledby="as-process-heading"
            >
                <div className={container}>
                    <div
                        data-as-star-mask
                        className="mb-10 as-dark:mb-3 as-compact:mb-[29px]"
                    >
                        <h2
                            data-as-star-mask
                            className={sectionHeading}
                            id="as-process-heading"
                        >
                            From request to result
                        </h2>
                        <p className={`${sectionCopy} as-dark:mt-3`}>
                            Every request follows the same six steps. No fixed
                            response time is promised, and not every request is
                            accepted.
                        </p>
                    </div>
                    <ol className="grid list-none grid-cols-1 gap-4 px-0 pb-0 pt-6 as-dark:pt-0 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:pt-16 as-compact:pt-[58px]">
                        {steps.map(([title, description], index) => (
                            <li
                                data-as-star-mask="surface"
                                className={`${stepColors[index]} min-h-0 rounded-[20px] px-4 py-6 as-dark:border as-dark:border-[#ffffff0a] as-dark:text-[#f1f4ff] sm:min-h-[260px] lg:min-h-[320px] as-wide:px-5 as-compact:min-h-[288px] as-compact:px-[18px] as-compact:py-[22px]`}
                                key={title}
                            >
                                <span
                                    className="text-[36px] font-bold leading-[1.125]"
                                    aria-hidden="true"
                                >
                                    {index + 1}
                                </span>
                                <h3 className="my-3 text-[18px] font-semibold">
                                    {title}
                                </h3>
                                <p className="text-[16px]">{description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
            <section
                className={`${section} as-dark:bg-[#111c40]`}
                id="community"
                aria-labelledby="as-community-heading"
            >
                <div className={container}>
                    <h2
                        data-as-star-mask
                        className={sectionHeading}
                        id="as-community-heading"
                    >
                        Stay close to ASTRA
                    </h2>
                    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 as-compact:gap-[22px]">
                        <article
                            data-as-star-mask="surface"
                            className={`${communityCard} bg-[#2563eb] text-white as-dark:bg-[#0a1fc8]`}
                        >
                            <DiscordIcon className="h-12 w-12 shrink-0" />
                            <h3 className={communityHeading}>
                                ASTRA Developers Discord
                            </h3>
                            <p className="text-[17px] text-white as-compact:text-[16px]">
                                Ask technical questions, find learning
                                resources, and hear announcements. Verified
                                ASTRA members also get the Technology Support
                                Hub.
                            </p>
                            <div className="mt-auto pt-9 text-white">
                                <DiscordLink className={button('white')}>
                                    Join our Discord{' '}
                                    <span aria-hidden="true">↗</span>
                                </DiscordLink>
                            </div>
                        </article>
                        <article
                            data-as-star-mask="surface"
                            className={`${communityCard} bg-ascend-tint as-dark:bg-[#18264f]`}
                        >
                            <img
                                className="h-12 w-auto shrink-0"
                                src={theme === 'dark' ? whiteLogo : logo}
                                alt=""
                                width="49"
                                height="48"
                            />
                            <h3 className={communityHeading}>
                                ASTRA Developers App
                            </h3>
                            <p className="text-[17px] text-ascend-muted as-compact:text-[16px]">
                                Your digital member ID, partner perks, and
                                rewards in one place. Coming soon, starting with
                                membership and benefits.
                            </p>
                            <span className="mt-auto pt-9 text-ascend-accent">
                                Coming soon
                            </span>
                        </article>
                    </div>
                </div>
            </section>
            <section
                className={`${section} bg-ascend-tint as-dark:bg-[#070c1d]`}
                aria-labelledby="as-partners-heading"
            >
                <div className={container}>
                    <h2
                        data-as-star-mask
                        className={sectionHeading}
                        id="as-partners-heading"
                    >
                        In partnership with
                    </h2>
                    <div
                        className="mt-8 flex flex-wrap items-center gap-4 md:gap-6 as-compact:gap-[22px]"
                        aria-label="Partners"
                    >
                        <div
                            data-as-star-mask="surface"
                            className="flex min-h-[84px] min-w-[160px] items-center justify-center rounded-2xl border border-ascend-line px-8 py-4 text-center text-[14px] text-ascend-muted as-compact:min-h-[72px] as-compact:py-3"
                        >
                            <img
                                src={theme === 'dark' ? nexLogoWhite : nexLogoDark}
                                alt="NEX"
                                className="h-11 w-auto max-h-12 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </section>
            <section
                className={`${section} as-dark:bg-[#0d1530]`}
                aria-labelledby="as-faq-heading"
            >
                <div className={container}>
                    <h2
                        data-as-star-mask
                        className={sectionHeading}
                        id="as-faq-heading"
                    >
                        Before you send a request
                    </h2>
                    <div
                        data-as-star-mask
                        className="mt-10 md:mt-20 as-compact:mt-9"
                    >
                        {questions.map(([question, answer]) => (
                            <details
                                className="group border-t border-ascend-line py-6 last:border-b as-compact:py-[22px]"
                                key={question}
                            >
                                <summary
                                    className={`flex cursor-pointer list-none items-center justify-between gap-5 text-[22px] font-bold [&::-webkit-details-marker]:hidden as-compact:text-[20px] ${focus}`}
                                >
                                    {question}
                                    <span
                                        data-as-star-mask="surface"
                                        className="after:text-[28px] after:font-normal after:text-ascend-muted after:content-['+'] group-open:after:content-['−']"
                                        aria-hidden="true"
                                    />
                                </summary>
                                <p className="mt-3 max-w-[760px] text-[17px] text-ascend-muted as-compact:text-[16px]">
                                    {answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
            <section className="relative bg-[#2563eb] py-16 text-white as-dark:bg-[#2471ff] as-compact:py-[43px]">
                <div data-as-star-mask className={container}>
                    <h2
                        className={`${heading} mb-8 max-w-[980px] text-[clamp(40px,5vw,72px)] as-compact:mb-[22px] as-compact:text-[clamp(36px,3.6vw,43px)]`}
                    >
                        Have an idea? Start with one conversation.
                    </h2>
                    <Link
                        data-as-star-mask="surface"
                        className={button('white')}
                        to="/astrascend/request"
                    >
                        Share your idea ↗
                    </Link>
                </div>
            </section>
        </div>
    );
}
