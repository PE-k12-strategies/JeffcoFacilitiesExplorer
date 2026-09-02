import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function BuildingSystemIcon({ name }: { name: string }) {
  switch (name) {
    case "Roofing":
      return (
        <Svg>
          <path d="M4 16 L16 6 L28 16" />
          <path d="M8 16 V26 H24 V16" />
          <path d="M16 6 V10" />
        </Svg>
      );
    case "HVAC":
      return (
        <Svg>
          <circle cx="16" cy="16" r="2.3" />
          <path d="M13.4 6 Q16 4.2 18.6 6 Q19.4 12.2 16 14 Q12.6 12.2 13.4 6 Z" />
          <path
            d="M13.4 6 Q16 4.2 18.6 6 Q19.4 12.2 16 14 Q12.6 12.2 13.4 6 Z"
            transform="rotate(90 16 16)"
          />
          <path
            d="M13.4 6 Q16 4.2 18.6 6 Q19.4 12.2 16 14 Q12.6 12.2 13.4 6 Z"
            transform="rotate(180 16 16)"
          />
          <path
            d="M13.4 6 Q16 4.2 18.6 6 Q19.4 12.2 16 14 Q12.6 12.2 13.4 6 Z"
            transform="rotate(270 16 16)"
          />
        </Svg>
      );
    case "Electrical":
      return (
        <Svg>
          <path d="M18 4 L10 18 H16 L14 28 L22 14 H16 Z" />
        </Svg>
      );
    case "Plumbing":
      return (
        <Svg>
          <path d="M8 11 H20" />
          <path d="M11 11 V8 H17 V11" />
          <path d="M20 11 C24 11 26 14 26 17 H22" />
          <path d="M22 17 V21" />
          <path d="M20.5 21 H23.5" />
          <path d="M21.2 22.5 C21.2 24.2 22 25.5 22 25.5" />
          <path d="M22.8 22.5 C22.8 24.2 22 25.5 22 25.5" />
        </Svg>
      );
    case "Exterior":
      return (
        <Svg>
          <path d="M6 26 V12 L16 6 L26 12 V26 Z" />
          <rect x="13" y="18" width="6" height="8" />
          <rect x="9" y="14" width="4" height="4" />
          <rect x="19" y="14" width="4" height="4" />
        </Svg>
      );
    case "Interior":
      return (
        <Svg>
          <rect x="6" y="6" width="20" height="20" />
          <path d="M16 6 V26" />
          <path d="M16 16 H26" />
          <path d="M11 26 V20 H16" />
        </Svg>
      );
    case "Structure":
      return (
        <Svg>
          <path d="M7 26 V8 H12 V26" />
          <path d="M20 26 V8 H25 V26" />
          <path d="M7 12 H25" />
          <path d="M7 20 H25" />
        </Svg>
      );
    case "Site":
      return (
        <Svg>
          <path d="M4 24 H28" />
          <path d="M8 24 L12 14 L16 24" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M20 24 V18" />
          <path d="M17 18 H23 L20 13 Z" />
        </Svg>
      );
    case "Safety and Security":
      return (
        <Svg>
          <path d="M16 4 L26 8 V16 C26 22.5 21.5 26.4 16 28 C10.5 26.4 6 22.5 6 16 V8 Z" />
          <path d="M13 16.5 A3 3 0 1 1 19 16.5 V18.5 H13 Z" />
          <path d="M16 18.5 V21" />
        </Svg>
      );
    case "Fire and Life Safety":
      return (
        <Svg>
          <path d="M16 5 C16 5 10 12 10 18 A6 6 0 0 0 22 18 C22 12 16 5 16 5 Z" />
          <path d="M16 22 V26" />
          <path d="M13 26 H19" />
        </Svg>
      );
    case "Stairs and Elevators":
      return (
        <Svg>
          <path d="M5 26 H11 V21 H16 V16 H21 V11 H27 V6" />
        </Svg>
      );
    case "Educational Technology":
      return (
        <Svg>
          <rect x="5" y="7" width="22" height="14" rx="1.5" />
          <path d="M12 25 H20" />
          <path d="M16 21 V25" />
        </Svg>
      );
    case "Specialties":
      return (
        <Svg>
          <path d="M11 5 V13 L7 26 H25 L21 13 V5" />
          <path d="M11 5 H21" />
          <path d="M9.2 19 H22.8" />
        </Svg>
      );
    case "Camera":
      return (
        <Svg>
          <rect x="4" y="10" width="18" height="13" rx="2" />
          <circle cx="13" cy="16.5" r="3.4" />
          <path d="M22 14 L28 11 V22 L22 19 Z" />
        </Svg>
      );
    case "Door Phone":
      return (
        <Svg>
          <rect x="10" y="4" width="12" height="24" rx="2" />
          <circle cx="16" cy="11" r="2.4" />
          <path d="M13 17 H19" />
          <path d="M13 20 H19" />
          <path d="M13 23 H17" />
        </Svg>
      );
    case "POE Switch":
      return (
        <Svg>
          <rect x="4" y="9" width="24" height="14" rx="2" />
          <rect x="7" y="13" width="3.2" height="6" rx="0.6" />
          <rect x="11.6" y="13" width="3.2" height="6" rx="0.6" />
          <rect x="16.2" y="13" width="3.2" height="6" rx="0.6" />
          <rect x="20.8" y="13" width="3.2" height="6" rx="0.6" />
        </Svg>
      );
    default:
      return (
        <Svg>
          <path d="M12 20 L8 16 L12 12" />
          <path d="M8 16 H18 C21 16 23 14 23 11 V9" />
          <circle cx="23" cy="7.5" r="2.2" />
        </Svg>
      );
  }
}
