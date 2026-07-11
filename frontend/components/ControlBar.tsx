"use client";

interface Props {
  muted: boolean;
  videoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
  copyState: "idle" | "copied";
  isHost?: boolean;
  onMuteAll?: () => void;
  muteAllBusy?: boolean;
}

export default function ControlBar({
  muted,
  videoOff,
  onToggleMute,
  onToggleVideo,
  onCopyLink,
  onLeave,
  copyState,
  isHost,
  onMuteAll,
  muteAllBusy,
}: Props) {
  return (
    <div className="bg-gray-900 border-t border-gray-800 py-3 px-3 sm:px-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <button
        onClick={onToggleMute}
        className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
          muted ? "bg-red-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
        }`}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
      <button
        onClick={onToggleVideo}
        className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
          videoOff ? "bg-red-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
        }`}
      >
        {videoOff ? "Start Video" : "Stop Video"}
      </button>
      <button
        onClick={onCopyLink}
        className="px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base bg-gray-700 text-white hover:bg-gray-600"
      >
        {copyState === "copied" ? "Copied!" : "Copy link"}
      </button>
      {isHost && onMuteAll && (
        <button
          onClick={onMuteAll}
          disabled={muteAllBusy}
          className="px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          title="Mute all participants (host)"
        >
          {muteAllBusy ? "Muting…" : "Mute all"}
        </button>
      )}
      <button
        onClick={onLeave}
        className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm sm:text-base bg-red-600 text-white hover:bg-red-700"
      >
        Leave
      </button>
    </div>
  );
}
