/** The app mark: an open book with one highlighted word (same drawing as assets/logo.svg). */
export default function Logo({ size = 32 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="40 40 944 944" aria-hidden="true">
            <rect x="40" y="40" width="944" height="944" rx="220" fill="#2f6b5a" />
            <path d="M512 322 C430 270 318 258 206 276 V736 C318 718 430 730 512 782 Z" fill="#fbfaf7" />
            <path d="M512 322 C594 270 706 258 818 276 V736 C706 718 594 730 512 782 Z" fill="#efede6" />
            <g strokeLinecap="round" strokeWidth="28" stroke="#c9d6cf" fill="none">
                <path d="M266 382 Q360 370 452 394" /><path d="M266 462 Q360 450 452 474" />
                <path d="M266 542 Q360 530 452 554" /><path d="M266 622 Q340 612 404 628" />
                <path d="M572 394 Q664 370 758 382" /><path d="M688 456 Q724 452 758 462" />
                <path d="M572 554 Q664 530 758 542" /><path d="M572 634 Q640 616 706 624" />
            </g>
            <path d="M556 440 Q616 424 672 422 L676 500 Q618 502 560 516 Z" fill="#f4c95d" />
            <path d="M574 474 Q620 462 656 460" stroke="#1c1c1a" strokeWidth="28" strokeLinecap="round" fill="none" />
        </svg>
    );
}
