import { Link } from 'react-router-dom';
import type { SubmissionReceipt } from '../forms/types';
import { badge, button, container, heading, panel } from '../styles/styles';

export function SubmissionReceiptView({
    receipt,
    onStartAnother,
    modal = false,
}: {
    receipt: SubmissionReceipt;
    onStartAnother: () => void;
    modal?: boolean;
}) {
    const demo = receipt.mode === 'demo';
    return (
        <section
            className={
                modal
                    ? 'fixed inset-0 z-40 grid place-items-center bg-[#0b1437]/60 p-4 text-center backdrop-blur-sm'
                    : `${container} flex flex-col items-center gap-6 pb-20 pt-14 text-center`
            }
            role={modal ? 'dialog' : undefined}
            aria-modal={modal ? true : undefined}
            aria-labelledby="as-receipt-heading"
        >
            <div className={`${panel} flex w-full max-w-[560px] flex-col items-center gap-5 p-7 text-center md:p-9`}>
                <div
                    className="grid h-[64px] w-[64px] place-items-center rounded-[50%] bg-ascend-blue text-[30px] text-white"
                    aria-hidden="true"
                >
                    ✓
                </div>
                {demo && <span className={badge()}>DEMO SUBMISSION</span>}
                <h1
                    className={`${heading} text-[clamp(30px,4vw,42px)]`}
                    id="as-receipt-heading"
                >
                    {demo ? 'Demo request received' : 'Request received'}
                </h1>
                <p className="text-ascend-muted">Your reference number</p>
                <output
                    className="text-[28px] font-bold text-ascend-accent [overflow-wrap:anywhere]"
                    aria-label="Reference number"
                >
                    {receipt.referenceNumber}
                </output>
                {demo && (
                    <p className="max-w-[420px] text-[14px] text-ascend-muted" role="status">
                        This is a demonstration. No request was saved and no confirmation email was sent.
                    </p>
                )}
                <p className="text-[14px] text-ascend-muted">
                    We’ll review your request and clarify the next steps.
                </p>
                <time className="text-[12px] text-ascend-muted" dateTime={receipt.submittedAt}>
                    Submitted {new Date(receipt.submittedAt).toLocaleString()}
                </time>
                <div className="flex w-full flex-wrap justify-center gap-3 pt-2">
                    <button
                        type="button"
                        className={`${button()} w-full sm:w-auto`}
                        onClick={onStartAnother}
                    >
                        Start another request
                    </button>
                    <Link
                        className={`${button('outline')} w-full sm:w-auto`}
                        to="/astrascend"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </section>
    );
}
