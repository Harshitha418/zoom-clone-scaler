"use client";

interface Props {
  onNew: () => void;
  onJoin: () => void;
  onSchedule: () => void;
}

interface Action {
  label: string;
  desc: string;
  bg: string;
  fg: string;
  onClick: () => void;
  icon: string;
}

export default function ActionButtons({ onNew, onJoin, onSchedule }: Props) {
  const actions: Action[] = [
    {
      label: "New Meeting",
      desc: "Start an instant meeting",
      bg: "bg-zoom",
      fg: "text-white",
      onClick: onNew,
      icon: "＋",
    },
    {
      label: "Join Meeting",
      desc: "Enter a meeting ID or link",
      bg: "bg-white",
      fg: "text-gray-800",
      onClick: onJoin,
      icon: "→",
    },
    {
      label: "Schedule",
      desc: "Plan a meeting for later",
      bg: "bg-white",
      fg: "text-gray-800",
      onClick: onSchedule,
      icon: "📅",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className={`card ${a.bg} ${a.fg} p-5 text-left hover:shadow-md transition`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-lg ${
              a.bg === "bg-zoom" ? "bg-white/20 text-white" : "bg-zoom-light text-zoom"
            }`}
          >
            {a.icon}
          </div>
          <div className="font-semibold">{a.label}</div>
          <div className={`text-sm ${a.bg === "bg-zoom" ? "text-white/80" : "text-gray-500"}`}>
            {a.desc}
          </div>
        </button>
      ))}
    </div>
  );
}
