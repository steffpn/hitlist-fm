import { cn } from "@/lib/cn";

function toSpotifyEmbed(url: string): string {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  // spotify:playlist:ID → open.spotify.com/embed/playlist/ID
  if (url.startsWith("spotify:")) {
    const [, kind, id] = url.split(":");
    return `https://open.spotify.com/embed/${kind}/${id}`;
  }
  return url.replace("open.spotify.com/", "open.spotify.com/embed/").split("?")[0];
}

export function SpotifyEmbed({
  url,
  height = 380,
  title = "Spotify player",
  className,
}: {
  url: string;
  height?: number;
  title?: string;
  className?: string;
}) {
  const src = toSpotifyEmbed(url);
  return (
    <iframe
      src={src}
      title={title}
      width="100%"
      height={height}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className={cn("w-full rounded-xl border border-white/[0.08]", className)}
      style={{ border: 0 }}
    />
  );
}

export function YouTubeEmbed({
  id,
  title = "YouTube video",
  className,
}: {
  id: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-black", className)}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}
