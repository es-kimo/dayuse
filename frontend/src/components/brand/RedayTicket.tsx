import { useId } from "react";

/** 리데이 티켓. 글자 없는 마크 하나를 모든 크기에서 쓴다.
 *  - size 20 이하이면 점선 구멍이 없는 단순형이 자동으로 쓰인다.
 *  - used: 꼬리표가 찢겨 나간 회색 티켓 (사용 내역용) */
export function RedayTicket({
  size = 24,
  used = false,
  title,
  className,
}: {
  size?: number;
  used?: boolean;
  title?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} {...a11y}>
      {used ? (
        <>
          <defs>
            <mask id={id + "m"} maskUnits="userSpaceOnUse">
              <rect x="-10" y="-10" width="84" height="84" fill="white" />
              <path
                d="M29.80,25.53 A7.9,7.9 0 1 1 18.11,28.66"
                fill="none"
                stroke="black"
                strokeWidth="3.9"
                strokeLinecap="round"
              />
              <path
                d="M13.66,26.58 L21.40,21.61 L22.56,30.74 Z"
                fill="black"
                stroke="black"
                strokeWidth="1.17"
                strokeLinejoin="round"
              />
            </mask>
            <clipPath id={id + "t2"}>
              <path d="M0,12 H39.839999999999996 L39.8,16.0 L41.6,19.2 L39.8,22.4 L41.6,25.6 L39.8,28.8 L41.6,32.0 L39.8,35.2 L41.6,38.4 L39.8,41.6 L41.6,44.8 L39.8,48.0 L39.839999999999996,52.6 H0 Z" />
            </clipPath>
          </defs>
          <g transform="rotate(-12 32 32)">
            <g mask={`url(#${id}m)`} clipPath={`url(#${id}t2)`}>
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                transform="translate(0 2.6)"
                fill="#94A3B8"
              />
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                fill="#CBD5E1"
              />
            </g>
          </g>
        </>
      ) : size <= 20 ? (
        <>
          <defs>
            <mask id={id + "m"} maskUnits="userSpaceOnUse">
              <rect x="-10" y="-10" width="84" height="84" fill="white" />
              <path
                d="M29.80,25.53 A7.9,7.9 0 1 1 18.11,28.66"
                fill="none"
                stroke="black"
                strokeWidth="3.9"
                strokeLinecap="round"
              />
              <path
                d="M13.66,26.58 L21.40,21.61 L22.56,30.74 Z"
                fill="black"
                stroke="black"
                strokeWidth="1.17"
                strokeLinejoin="round"
              />
            </mask>
            <clipPath id={id + "s"}>
              <rect x="40.739999999999995" y="0" width="64" height="64" />
            </clipPath>
            <clipPath id={id + "k"}>
              <rect x="0" y="0" width="40.739999999999995" height="64" />
            </clipPath>
          </defs>
          <g transform="rotate(-12 32 32)">
            <g mask={`url(#${id}m)`}>
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                transform="translate(0 3)"
                fill="#1E3A8A"
              />
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                fill="#2563EB"
              />
              <g clipPath={`url(#${id}s)`}>
                <path
                  d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                  transform="translate(0 3)"
                  fill="#1D4ED8"
                />
                <path
                  d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                  fill="#60A5FA"
                />
              </g>
            </g>
          </g>
        </>
      ) : (
        <>
          <defs>
            <mask id={id + "m"} maskUnits="userSpaceOnUse">
              <rect x="-10" y="-10" width="84" height="84" fill="white" />
              <circle cx="40.739999999999995" cy="24.00" r="1.35" fill="black" />
              <circle cx="40.739999999999995" cy="32.00" r="1.35" fill="black" />
              <circle cx="40.739999999999995" cy="40.00" r="1.35" fill="black" />
              <path
                d="M29.80,25.53 A7.9,7.9 0 1 1 18.11,28.66"
                fill="none"
                stroke="black"
                strokeWidth="3.9"
                strokeLinecap="round"
              />
              <path
                d="M13.66,26.58 L21.40,21.61 L22.56,30.74 Z"
                fill="black"
                stroke="black"
                strokeWidth="1.17"
                strokeLinejoin="round"
              />
            </mask>
            <clipPath id={id + "s"}>
              <rect x="40.739999999999995" y="0" width="64" height="64" />
            </clipPath>
            <clipPath id={id + "k"}>
              <rect x="0" y="0" width="40.739999999999995" height="64" />
            </clipPath>
          </defs>
          <g transform="rotate(-12 32 32)">
            <g mask={`url(#${id}m)`}>
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                transform="translate(0 2.6)"
                fill="#1E3A8A"
              />
              <path
                d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                fill="#2563EB"
              />
              <g clipPath={`url(#${id}s)`}>
                <path
                  d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                  transform="translate(0 2.6)"
                  fill="#1D4ED8"
                />
                <path
                  d="M15.5,16 H48.5 A6.5,6.5 0 0 1 55,22.5 V27.4 A4.6,4.6 0 0 0 55,36.6 V41.5 A6.5,6.5 0 0 1 48.5,48 H15.5 A6.5,6.5 0 0 1 9,41.5 V36.6 A4.6,4.6 0 0 0 9,27.4 V22.5 A6.5,6.5 0 0 1 15.5,16 Z"
                  fill="#60A5FA"
                />
              </g>
            </g>
          </g>
        </>
      )}
    </svg>
  );
}
