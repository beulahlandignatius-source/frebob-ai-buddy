// Simple friendly SVG illustrations for onboarding.
// Uses FreBob brand tokens: primary (deep purple) and accent (orange).

const purple = "hsl(var(--primary))";
const purpleSoft = "hsl(var(--primary) / 0.12)";
const purpleMid = "hsl(var(--primary) / 0.35)";
const orange = "hsl(var(--accent))";
const orangeSoft = "hsl(var(--accent) / 0.18)";
const ink = "hsl(var(--foreground))";
const paper = "hsl(var(--card))";
const neutral = "hsl(var(--muted))";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      role="img"
    >
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={purpleSoft} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="150" r="130" fill="url(#bg-grad)" />
      {children}
    </svg>
  );
}

export function IllustrationChat() {
  return (
    <Frame>
      {/* soft floor */}
      <ellipse cx="160" cy="270" rx="110" ry="10" fill={neutral} />
      {/* big chat bubble */}
      <rect x="60" y="70" width="180" height="110" rx="26" fill={paper} stroke={purpleMid} />
      <circle cx="100" cy="125" r="6" fill={purple} />
      <circle cx="125" cy="125" r="6" fill={purple} />
      <circle cx="150" cy="125" r="6" fill={purple} />
      <path d="M85 170 L75 190 L110 175 Z" fill={paper} stroke={purpleMid} />
      {/* small orange bubble */}
      <rect x="180" y="180" width="80" height="46" rx="16" fill={orange} />
      <circle cx="200" cy="203" r="3" fill="white" />
      <circle cx="220" cy="203" r="3" fill="white" />
      <circle cx="240" cy="203" r="3" fill="white" />
      {/* sparkle */}
      <path d="M245 80 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill={orange} />
      <circle cx="70" cy="60" r="4" fill={purple} />
    </Frame>
  );
}

export function IllustrationInventory() {
  return (
    <Frame>
      <ellipse cx="160" cy="270" rx="110" ry="10" fill={neutral} />
      {/* boxes */}
      <rect x="70" y="170" width="80" height="80" rx="10" fill={paper} stroke={purpleMid} />
      <rect x="70" y="170" width="80" height="18" fill={purple} />
      <rect x="160" y="150" width="90" height="100" rx="10" fill={paper} stroke={purpleMid} />
      <rect x="160" y="150" width="90" height="20" fill={orange} />
      <rect x="115" y="110" width="70" height="60" rx="10" fill={paper} stroke={purpleMid} />
      <rect x="115" y="110" width="70" height="16" fill={purple} />
      {/* checkmarks */}
      <circle cx="110" cy="220" r="10" fill={orange} />
      <path d="M105 220 l4 4 l7 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="205" cy="205" r="10" fill={purple} />
      <path d="M200 205 l4 4 l7 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* sparkle */}
      <path d="M250 90 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill={orange} />
    </Frame>
  );
}

export function IllustrationInsights() {
  return (
    <Frame>
      <ellipse cx="160" cy="270" rx="110" ry="10" fill={neutral} />
      {/* dashboard card */}
      <rect x="60" y="80" width="200" height="150" rx="18" fill={paper} stroke={purpleMid} />
      {/* small stat pill */}
      <rect x="76" y="96" width="70" height="24" rx="8" fill={purpleSoft} />
      <rect x="84" y="104" width="40" height="8" rx="4" fill={purple} />
      {/* bars */}
      <rect x="80" y="200" width="20" height="-40" transform="translate(0,200) scale(1,-1)" fill={purple} />
      <rect x="80" y="160" width="20" height="40" rx="4" fill={purple} />
      <rect x="110" y="140" width="20" height="60" rx="4" fill={purpleMid} />
      <rect x="140" y="170" width="20" height="30" rx="4" fill={purple} />
      <rect x="170" y="130" width="20" height="70" rx="4" fill={orange} />
      <rect x="200" y="150" width="20" height="50" rx="4" fill={purpleMid} />
      <rect x="230" y="120" width="20" height="80" rx="4" fill={purple} />
      {/* trend line */}
      <path
        d="M80 190 Q120 150 160 160 T240 110"
        stroke={orange}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="240" cy="110" r="5" fill={orange} />
    </Frame>
  );
}

export function IllustrationLocal() {
  return (
    <Frame>
      <ellipse cx="160" cy="270" rx="110" ry="10" fill={neutral} />
      {/* storefront */}
      <rect x="80" y="130" width="160" height="120" rx="10" fill={paper} stroke={purpleMid} />
      {/* awning */}
      <path d="M70 130 L250 130 L240 100 L80 100 Z" fill={orange} />
      <path d="M100 130 L110 100 M130 130 L135 100 M160 130 L160 100 M190 130 L185 100 M220 130 L215 100" stroke="white" strokeWidth="2" />
      {/* door */}
      <rect x="145" y="175" width="40" height="75" rx="6" fill={purple} />
      <circle cx="178" cy="215" r="2.5" fill={orange} />
      {/* windows */}
      <rect x="95" y="150" width="40" height="30" rx="4" fill={purpleSoft} stroke={purpleMid} />
      <rect x="195" y="150" width="40" height="30" rx="4" fill={purpleSoft} stroke={purpleMid} />
      {/* sign */}
      <rect x="120" y="108" width="80" height="16" rx="4" fill="white" />
      <text x="160" y="120" textAnchor="middle" fontSize="10" fontWeight="700" fill={ink} fontFamily="Inter, sans-serif">
        FreBob
      </text>
      {/* heart */}
      <path
        d="M245 70 c-6 -8 -18 -2 -18 8 c0 8 10 14 18 22 c8 -8 18 -14 18 -22 c0 -10 -12 -16 -18 -8 z"
        fill={orange}
      />
    </Frame>
  );
}
