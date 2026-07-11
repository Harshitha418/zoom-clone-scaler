"use client";

interface Props {
  name: string;
  muted: boolean;
  videoOff: boolean;
  isSelf?: boolean;
  isHost?: boolean;
  /** Show host-only controls (mute/remove) on this tile. */
  showHostControls?: boolean;
  serverMuted?: boolean;
  onToggleMute?: () => void;
  onRemove?: () => void;
  actionBusy?: boolean;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ParticipantTile({
  name,
  muted,
  videoOff,
  isSelf,
  isHost,
  showHostControls,
  serverMuted,
  onToggleMute,
  onRemove,
  actionBusy,
}: Props) {
  const mutedIndicator = muted || serverMuted;
  return (
    <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center group">
      {videoOff ? (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zoom flex items-center justify-center text-white text-xl sm:text-2xl font-semibold">
          {initials(name) || "?"}
        </div>
      ) : (
        // "Video on" mock: a subtle gradient stands in for the video feed.
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zoom/80 flex items-center justify-center text-white text-xl sm:text-2xl font-semibold">
            {initials(name) || "?"}
          </div>
        </div>
      )}

      {isHost && (
        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
          Host
        </span>
      )}

      {/* Host controls overlay — visible on hover on desktop, always visible on touch */}
      {showHostControls && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              disabled={actionBusy}
              className="text-[11px] font-medium bg-black/60 hover:bg-black/80 text-white rounded px-2 py-1 disabled:opacity-50"
              title={serverMuted ? "Unmute participant" : "Mute participant"}
            >
              {serverMuted ? "Unmute" : "Mute"}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              disabled={actionBusy}
              className="text-[11px] font-medium bg-red-600/90 hover:bg-red-700 text-white rounded px-2 py-1 disabled:opacity-50"
              title="Remove participant"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs gap-2">
        <span className="bg-black/50 px-2 py-1 rounded truncate">
          {name}
          {isSelf ? " (You)" : ""}
        </span>
        {mutedIndicator && (
          <span className="bg-red-600/90 px-2 py-1 rounded shrink-0">
            {serverMuted && !muted ? "Muted by host" : "Muted"}
          </span>
        )}
      </div>
    </div>
  );
}
