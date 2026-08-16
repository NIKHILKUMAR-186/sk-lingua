import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { Play, Loader2, VideoOff, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * InlineIntroVideo
 *
 * Plays a mentor's intro video INSIDE Lingua — never redirects to YouTube,
 * Vimeo, an external tab, or a separate page.
 *
 * Behaviour:
 *  - Missing/invalid `src` → renders nothing (no broken video container).
 *  - Unsupported URL format → "Intro video unavailable" fallback.
 *  - YouTube / Vimeo → progressive-embedded player (lazy-mounted after a user
 *    tap to respect autoplay restrictions & cut network cost until needed).
 *  - Direct media files (mp4/webm/ogg/mov) → native <video> with play/pause,
 *    mute/unmute and fullscreen (where supported).
 *
 * All error paths return static, localized copy. A failure here can NEVER
 * crash React or block the rest of the mentor profile.
 */

interface InlineIntroVideoProps {
  src?: string | null;
  title?: string;
  className?: string;
}

type EmbedKind = "youtube" | "vimeo" | "video-file" | "unsupported";

function analyzeUrl(src: string): { kind: EmbedKind; url: string } | null {
  const trimmed = (src || "").trim();
  if (!trimmed) return null;

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (ytMatch) {
    return {
      kind: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { kind: "vimeo", url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return { kind: "video-file", url: trimmed };
  }

  return { kind: "unsupported", url: trimmed };
}

export function InlineIntroVideo({ src, title = "Intro video", className }: InlineIntroVideoProps) {
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const analysis = useMemo(() => analyzeUrl(src ?? ""), [src]);

  const startVideo = useCallback(() => {
    setPlaying(true);
    setLoadState("loading");
    const el = videoRef.current;
    if (el) {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay blocked — native controls remain available for the user.
          // Not an error.
          setLoadState("ready");
        });
      }
    }
  }, []);

  if (!analysis) return null; // No video — show nothing.

  const { kind, url } = analysis;

  function renderUnavailable() {
    return (
      <div
        role="status"
        className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground"
      >
        <VideoOff className="h-5 w-5" />
        Intro video unavailable
      </div>
    );
  }

  if (kind === "unsupported") {
    return renderUnavailable();
  }

  if (kind === "video-file") {
    return (
      <NativeVideo
        url={url}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        videoRef={videoRef}
        loadState={loadState}
        onLoad={setLoadState}
        className={className}
      />
    );
  }

  return (
    <EmbedPreview
      playing={playing}
      onPlay={startVideo}
      url={url}
      title={title}
      loadState={loadState}
      setLoadState={setLoadState}
      className={className}
    />
  );
}

function NativeVideo({
  url,
  muted,
  onToggleMute,
  videoRef,
  loadState,
  onLoad,
  className,
}: {
  url: string;
  muted: boolean;
  onToggleMute: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  loadState: "idle" | "loading" | "ready" | "error";
  onLoad: (state: "idle" | "loading" | "ready" | "error") => void;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-black", className)}>
      <video
        ref={videoRef}
        src={url}
        controls
        muted={muted}
        playsInline
        onPlay={() => onLoad("ready")}
        onError={() => onLoad("error")}
        onLoadedData={() => onLoad("ready")}
        className="aspect-video w-full"
      />
      <div className="flex items-center gap-1 border-t border-white/10 bg-black/70 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggleMute}
          className="rounded p-1 text-white/80 transition hover:bg-white/10"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => videoRef.current?.requestFullscreen?.()}
          className="rounded p-1 text-white/80 transition hover:bg-white/10"
          aria-label="Fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
      {loadState === "error" && (
        <div className="px-3 py-2 text-xs text-red-200">Intro video unavailable</div>
      )}
    </div>
  );
}

function EmbedPreview({
  playing,
  onPlay,
  url,
  title,
  loadState,
  setLoadState,
  className,
}: {
  playing: boolean;
  onPlay: () => void;
  url: string;
  title: string;
  loadState: "idle" | "loading" | "ready" | "error";
  setLoadState: (state: "idle" | "loading" | "ready" | "error") => void;
  className?: string;
}) {
  if (!playing) {
    return (
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${title}`}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-muted"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
          <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
        </span>
        <span className="sr-only">{title}</span>
      </button>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-black", className)}>
      {loadState === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
      <iframe
        src={`${url}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full"
        onLoad={() => setLoadState("ready")}
      />
    </div>
  );
}
