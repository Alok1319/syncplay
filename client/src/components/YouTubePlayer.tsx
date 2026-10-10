import { useEffect, useRef, useState } from "react";

interface YouTubePlayerProps {
  videoId: string;
  canControl: boolean;
  playbackState: "PLAYING" | "PAUSED";
  currentTime: number;
  updatedAt: number;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

declare namespace YT {
  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    mute(): void;
    unMute(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: string): void;
    cueVideoById(videoId: string): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    destroy(): void;
  }

  interface PlayerEvent {
    target: Player;
    data: number;
  }

  class Player {
    constructor(
      element: string | HTMLElement,
      options: {
        videoId?: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (event: PlayerEvent) => void;
          onStateChange?: (event: PlayerEvent) => void;
        };
      }
    );
  }

  const PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

export default function YouTubePlayer({
  videoId,
  canControl,
  playbackState,
  currentTime,
  updatedAt,
  onPlay,
  onPause,
  onSeek,
}: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const suppressEventsRef = useRef(false);
  const lastVideoIdRef = useRef(videoId);
  const lastTimeRef = useRef(0);
  const applyingRemoteRef = useRef(false);

  const latestPropsRef = useRef({
    canControl,
    onPlay,
    onPause,
    onSeek,
  });

  useEffect(() => {
    latestPropsRef.current = {
      canControl,
      onPlay,
      onPause,
      onSeek,
    };
  }, [canControl, onPlay, onPause, onSeek]);

  useEffect(() => {
    let cancelled = false;

    const createPlayer = () => {
      if (
        cancelled ||
        !window.YT?.Player ||
        playerRef.current
      ) {
        return;
      }

      const player = new window.YT.Player(
        "youtube-player",
        {
          videoId: videoId || undefined,
          playerVars: {
            autoplay: 0,
            controls: canControl ? 1 : 0,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                event.target.destroy();
                return;
              }

              playerRef.current = event.target;
              readyRef.current = true;
              lastVideoIdRef.current = videoId;
              setReady(true);
            },
            onStateChange: (event) => {
              const playerState = event.data;
              const time = event.target.getCurrentTime();

              lastTimeRef.current = time;

              if (
                suppressEventsRef.current ||
                applyingRemoteRef.current ||
                !latestPropsRef.current.canControl
              ) {
                return;
              }

              if (
                playerState ===
                window.YT.PlayerState.PLAYING
              ) {
                latestPropsRef.current.onPlay(time);
              } else if (
                playerState ===
                window.YT.PlayerState.PAUSED
              ) {
                latestPropsRef.current.onPause(time);
              }
            },
          },
        }
      );

      playerRef.current = player;
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const previousCallback =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        createPlayer();
      };

      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      readyRef.current = false;
      window.onYouTubeIframeAPIReady = undefined;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Load a changed video without automatically starting playback.
  useEffect(() => {
    const player = playerRef.current;

    if (!ready || !player || !videoId) {
      return;
    }

    if (lastVideoIdRef.current === videoId) {
      return;
    }

    suppressEventsRef.current = true;
    applyingRemoteRef.current = true;

    player.cueVideoById(videoId);
    lastVideoIdRef.current = videoId;
    lastTimeRef.current = 0;

    window.setTimeout(() => {
      suppressEventsRef.current = false;
      applyingRemoteRef.current = false;
    }, 1200);
  }, [ready, videoId]);

  // Apply server-authoritative play, pause and seek updates.
  useEffect(() => {
    const player = playerRef.current;

    if (!ready || !player) {
      return;
    }

    applyingRemoteRef.current = true;
    suppressEventsRef.current = true;

    const playerTime = player.getCurrentTime();
    const desiredTime = Math.max(0, currentTime || 0);

    // Pause immediately before seeking so a remote pause is not delayed.
    if (playbackState === "PAUSED") {
      player.pauseVideo();
    }

    if (Math.abs(playerTime - desiredTime) > 1.5) {
      player.seekTo(desiredTime, true);
      lastTimeRef.current = desiredTime;
    }

    if (playbackState === "PLAYING") {
      if (!latestPropsRef.current.canControl) {
        player.mute();
      }

      if (
        player.getPlayerState() !==
        window.YT.PlayerState.PLAYING
      ) {
        player.playVideo();
      }
    }

    const timeout = window.setTimeout(() => {
      suppressEventsRef.current = false;
      applyingRemoteRef.current = false;
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    ready,
    videoId,
    playbackState,
    currentTime,
    updatedAt,
  ]);

  // Report significant seeks made locally by the Host or Moderator.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;

      if (
        !readyRef.current ||
        !player ||
        !latestPropsRef.current.canControl ||
        suppressEventsRef.current ||
        applyingRemoteRef.current ||
        player.getPlayerState() !==
          window.YT.PlayerState.PLAYING
      ) {
        return;
      }

      const time = player.getCurrentTime();
      const difference = Math.abs(
        time - lastTimeRef.current
      );

      if (difference > 2.5) {
        lastTimeRef.current = time;
        latestPropsRef.current.onSeek(time);
      } else {
        lastTimeRef.current = time;
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#000",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <div
        id="youtube-player"
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: canControl ? "auto" : "none",
        }}
      />
    </div>
  );
}




