import { useId } from "react";
import { shade } from "@/lib/avatarConfig";

const HAIR_BACK = {
  short: "M108 190 Q96 58 200 46 Q304 58 292 190 Q286 120 200 112 Q114 120 108 190Z",
  spiky: "M112 200 L66 150 L106 132 L74 76 L138 92 L146 30 L192 70 L232 22 L250 86 L318 64 L292 128 L336 148 L288 200 Q284 120 200 112 Q116 120 112 200Z",
  bob: "M98 280 Q84 54 200 44 Q316 54 302 280 Q290 300 272 284 L276 170 Q200 120 124 170 L128 284 Q110 300 98 280Z",
  long: "M96 380 Q74 60 200 44 Q326 60 304 380 Q260 396 236 360 L262 190 Q200 120 138 190 L164 360 Q140 396 96 380Z",
  ponytail: "M106 200 Q96 56 200 46 Q304 56 294 200 Q286 120 200 112 Q114 120 106 200Z M280 96 Q352 110 344 220 Q338 300 300 340 Q318 260 300 190 Q292 130 270 110Z",
};

const HAIR_FRONT = {
  short: "M114 178 Q108 64 200 58 Q292 64 286 178 L270 128 L252 158 L238 112 L216 150 L200 104 L184 150 L162 112 L148 158 L130 128Z",
  spiky: "M112 176 Q106 64 200 56 Q294 64 288 176 L276 120 L258 160 L250 106 L222 150 L210 92 L190 148 L170 100 L156 156 L134 116 L124 168Z",
  bob: "M116 196 Q106 60 200 56 Q294 60 284 196 L276 150 Q240 132 200 134 Q160 132 124 150Z",
  long: "M118 220 Q104 62 200 56 Q296 62 282 220 L272 150 Q252 120 232 150 L220 116 L206 150 Q186 112 162 148 L150 124 L132 160Z",
  ponytail: "M116 176 Q108 62 200 56 Q292 62 284 176 L272 130 Q236 100 214 146 L204 112 Q180 106 156 148 L140 126Z",
};

const Eye = ({ cx, blink, lookX, lookY, surprise, joy, sad, iris, line, uid }) => {
  const open = Math.max(0.06, 1 - blink) * (1 + surprise * 0.18) * (1 - joy * 0.25);
  const lid = (1 - open) * 26;
  const happyClosed = joy > 0.55 && blink > 0.6;
  return (
    <g transform={`translate(${cx} 206)`}>
      <clipPath id={`clip-${uid}-${cx}`}>
        <ellipse rx="25" ry={28 * open} cy={lid * 0.35} />
      </clipPath>
      <ellipse rx="25" ry={28 * open} cy={lid * 0.35} fill="#fff" />
      <g clipPath={`url(#clip-${uid}-${cx})`}>
        <circle cx={lookX * 8} cy={lookY * 6 + 3} r="18" fill={`url(#iris-${uid})`} />
        <circle cx={lookX * 8} cy={lookY * 6 + 3} r={8 - surprise * 3} fill="#0b0b14" />
        <circle cx={lookX * 8 - 7} cy={lookY * 6 - 6} r="6" fill="#fff" />
        <circle cx={lookX * 8 + 6} cy={lookY * 6 + 10} r="2.6" fill="#fff" opacity="0.9" />
        <rect x="-30" y="-40" width="60" height={14 + lid} fill={line} opacity="0.12" />
      </g>
      {happyClosed ? (
        <path d="M-24 4 Q0 -20 24 4" stroke={line} strokeWidth="5" fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M-29 ${-20 + lid} Q${-4 + sad * 6} ${-36 + lid * 1.25} 28 ${-22 + lid - sad * 4}`} stroke={line} strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
};

const Brow = ({ cx, side, raise, angle, color }) => (
  <path
    d="M-22 3 Q0 -7 22 0"
    transform={`translate(${cx} ${164 - raise * 12}) rotate(${angle * side})`}
    stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
  />
);

const Mouth = ({ jaw, smile, frown, pucker, uid }) => {
  const w = 20 + smile * 12 - pucker * 9;
  const open = jaw * 30;
  const cy = -smile * 8 + frown * 9;
  const up = cy - 2 - frown * 6 + smile * 4;
  const lo = cy + open * 2 + smile * 30 - frown * 4;
  const d = `M${-w} ${cy} Q0 ${up} ${w} ${cy} Q0 ${lo} ${-w} ${cy}Z`;
  const filled = open > 3 || smile > 0.35;
  return (
    <g transform="translate(200 272)">
      <clipPath id={`mouth-${uid}`}><path d={d} /></clipPath>
      <path d={d} fill={filled ? "#7a1d2b" : "none"} stroke="#5b1520" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {filled && (
        <g clipPath={`url(#mouth-${uid})`}>
          <rect x="-40" y={up - 14} width="80" height="12" fill="#fff" />
          <ellipse cx="0" cy={lo / 2 + cy / 2 + 8} rx={w * 0.6} ry="10" fill="#e0586f" />
        </g>
      )}
    </g>
  );
};

export const AnimeAvatar = ({ config, face, className = "", testId = "anime-avatar-svg" }) => {
  const uid = useId().replace(/:/g, "");
  const f = face;
  const hair = config.hairColor;
  const line = shade(hair, -0.18);
  const skinShadow = shade(config.skinColor, -0.1);
  const fx = f.yaw * 0.9, fy = f.pitch * 0.7;
  const browAngle = f.browAngle;
  return (
    <svg viewBox="0 0 400 400" className={className} data-testid={testId}>
      <defs>
        <radialGradient id={`iris-${uid}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={shade(config.eyeColor, 0.25)} />
          <stop offset="70%" stopColor={config.eyeColor} />
          <stop offset="100%" stopColor={shade(config.eyeColor, -0.25)} />
        </radialGradient>
        <linearGradient id={`hair-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(hair, 0.12)} />
          <stop offset="100%" stopColor={shade(hair, -0.08)} />
        </linearGradient>
      </defs>

      <path d="M70 400 Q84 336 160 322 L240 322 Q316 336 330 400Z" fill={config.shirtColor} />
      <path d="M170 322 L200 352 L230 322" fill={shade(config.shirtColor, -0.15)} />

      <g transform={`rotate(${f.roll} 200 330)`}>
        <rect x="176" y="280" width="48" height="50" rx="14" fill={skinShadow} />
        <g transform={`translate(${fx * 0.3} ${fy * 0.2})`}>
          <path d={HAIR_BACK[config.hairStyle]} fill={`url(#hair-${uid})`} />
        </g>
        <g transform={`translate(${fx * 0.15} ${fy * 0.1})`}>
          <ellipse cx="122" cy="218" rx="11" ry="20" fill={skinShadow} />
          <ellipse cx="278" cy="218" rx="11" ry="20" fill={skinShadow} />
          <path d="M122 150 Q120 64 200 62 Q280 64 278 150 L274 228 Q262 300 200 318 Q138 300 126 228Z" fill={config.skinColor} />
          <path d="M126 228 Q138 300 200 318 Q262 300 274 228 Q258 290 200 304 Q142 290 126 228Z" fill={skinShadow} opacity="0.5" />
          <ellipse cx="200" cy="200" rx="80" ry="90" fill="#ef4444" opacity={f.anger * 0.18} />
          <ellipse cx="200" cy="140" rx="70" ry="40" fill="#3b82f6" opacity={f.sadness * 0.18} />
        </g>

        <g transform={`translate(${fx} ${fy})`}>
          <ellipse cx="152" cy="244" rx="17" ry="8" fill="#f472b6" opacity={0.18 + f.joy * 0.55} />
          <ellipse cx="248" cy="244" rx="17" ry="8" fill="#f472b6" opacity={0.18 + f.joy * 0.55} />
          <Eye cx={160} blink={f.blinkL} lookX={f.lookX} lookY={f.lookY} surprise={f.surprise} joy={f.joy} sad={f.sadness} iris={config.eyeColor} line={line} uid={uid} />
          <Eye cx={240} blink={f.blinkR} lookX={f.lookX} lookY={f.lookY} surprise={f.surprise} joy={f.joy} sad={f.sadness} iris={config.eyeColor} line={line} uid={uid} />
          <Brow cx={160} side={1} raise={f.browRaise} angle={browAngle} color={line} />
          <Brow cx={240} side={-1} raise={f.browRaise} angle={browAngle} color={line} />
          <path d="M200 236 Q196 248 203 250" stroke={skinShadow} strokeWidth="3" fill="none" strokeLinecap="round" />
          {config.beard && (
            <g fill={hair} opacity="0.92">
              <path d="M130 238 Q134 316 200 324 Q266 316 270 238 Q262 300 228 292 Q214 284 200 286 Q186 284 172 292 Q138 300 130 238Z" />
              <path d="M176 262 Q200 252 224 262 Q212 258 200 260 Q188 258 176 262Z" />
            </g>
          )}
          <Mouth jaw={f.jaw} smile={f.smile} frown={f.frown} pucker={f.pucker} uid={uid} />
          {config.glasses && (
            <g fill="none" stroke="#1f2937" strokeWidth="4">
              <rect x="126" y="178" width="68" height="56" rx="16" />
              <rect x="206" y="178" width="68" height="56" rx="16" />
              <path d="M194 200 Q200 194 206 200" />
            </g>
          )}
          <g opacity={Math.max(0, f.sadness - 0.35) * 1.6}>
            <path className="tear" d="M146 236 Q140 252 146 258 Q152 252 146 236Z" fill="#7dd3fc" />
            <path className="tear tear-2" d="M254 236 Q248 252 254 258 Q260 252 254 236Z" fill="#7dd3fc" />
          </g>
        </g>

        <g transform={`translate(${fx * 0.6} ${fy * 0.4})`}>
          <path d={HAIR_FRONT[config.hairStyle]} fill={`url(#hair-${uid})`} />
          <path d="M150 88 Q190 70 230 80" stroke="#fff" strokeOpacity="0.35" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>

        <g opacity={f.anger} transform="translate(286 92)" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-14 -4 Q-4 -4 -4 -14 M4 -14 Q4 -4 14 -4 M14 4 Q4 4 4 14 M-4 14 Q-4 4 -14 4" />
        </g>
        <g opacity={f.sadness * 0.8} stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
          <path d="M170 60 L170 92 M190 54 L190 92 M210 54 L210 92 M230 60 L230 92" />
        </g>
        <g opacity={f.surprise} stroke="#fbbf24" strokeWidth="5" strokeLinecap="round">
          <path d="M92 110 L70 96 M84 150 L58 148 M308 110 L330 96 M316 150 L342 148 M200 28 L200 6" />
        </g>
        <g opacity={f.joy * 0.9} fill="#fde68a">
          <path className="sparkle" d="M84 120 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" />
          <path className="sparkle sparkle-2" d="M318 170 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" />
        </g>
      </g>
    </svg>
  );
};
