import { useId } from "react";
import { DAYU_COLORS, type DayuColor } from "./dayuColors";

export type DayuFace = "default" | "cheer" | "done" | "rest";

/** 얼굴 부분(눈·입). 몸통에서 뚫어내는 모양이라 mask 안에서 검정으로 그린다. */
function Face({ face }: { face: DayuFace }) {
  const s = { stroke: "black", strokeWidth: 2.8, strokeLinecap: "round" as const, fill: "none" };
  const eye = (cx: number) => <ellipse cx={cx} cy={35.5} rx={2.9} ry={4.1} fill="black" />;
  const happyEye = (cx: number) => (
    <path d={`M${cx - 3.19} 36.34 A3.4 3.4 0 0 1 ${cx + 3.19} 36.34`} {...s} />
  );
  switch (face) {
    case "done":
      return (<>{happyEye(21.5)}{happyEye(32.5)}<path d="M20.8 42.5 A6.2 6.2 0 0 0 33.2 42.5 Z" fill="black" /></>);
    case "cheer":
      return (<>{happyEye(21.5)}{eye(32.5)}<path d="M32.17 43.38 A5.5 5.5 0 0 1 21.83 43.38" {...s} /></>);
    case "rest":
      return (<><path d="M18.5 37 H24.5 M29.5 37 H35.5" {...s} /><path d="M29.76 44.81 A3.6 3.6 0 0 1 24.24 44.81" {...s} strokeWidth={2.6} /></>);
    default:
      return (<>{eye(21.5)}{eye(32.5)}<path d="M31.53 43.61 A5 5 0 0 1 22.47 43.61" {...s} /></>);
  }
}

/** 데이유 캐릭터 단독. 배경이 비치도록 얼굴은 투명하게 뚫린다. */
export function Dayu({ color = "#2563EB", face = "default", size = 64, className, title }: {
  color?: string; face?: DayuFace; size?: number; className?: string; title?: string;
}) {
  const id = useId();
  return (
    <svg viewBox="3 3.25 55.25 55.25" width={size} height={size} className={className}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <mask id={id}>
        <circle cx={27} cy={39} r={19.5} fill="white" />
        <path d="M42.5 52 L48.5 8.5" stroke="white" strokeWidth={10.5} strokeLinecap="round" />
        <Face face={face} />
      </mask>
      <rect x={0} y={0} width={64} height={64} fill={color} mask={`url(#${id})`} />
    </svg>
  );
}

/** 프로필 자리에 쓰는 원형 아바타. 옅은 배경 + 진한 데이유. */
export function DayuAvatar({ color = "blue", face = "default", size = 36, dim = false, className = "" }: {
  color?: DayuColor; face?: DayuFace; size?: number; dim?: boolean; className?: string;
}) {
  const c = DAYU_COLORS[color];
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${dim ? "opacity-35" : ""} ${className}`}
      style={{ width: size, height: size, background: c.bg }}
    >
      <Dayu color={c.fg} face={face} size={Math.round(size * 0.8)} className="translate-y-[18%]" />
    </span>
  );
}
