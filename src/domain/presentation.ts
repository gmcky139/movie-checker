import type { DataMode, Movie } from "./types";

export const TMDB_ATTRIBUTION_NOTICE =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";
export const TMDB_ATTRIBUTION_URL = "https://www.themoviedb.org/";
export const TMDB_LOGO_PATH = "images/tmdb-logo.svg";

export function homeScheduleLabel(mode: DataMode): string {
  return mode === "real" ? "4 DAYS / OFFICIAL SCHEDULE" : "4 DAYS / DEMO SCHEDULE";
}

export function posterAlt(
  title: string,
  mode: DataMode,
  status?: Movie["posterMatchStatus"],
): string {
  if (mode === "real" && status === "matched") return `${title}のポスター（TMDB）`;
  return mode === "real" ? `${title}のポスター画像なし` : `${title}のデモポスター`;
}

export function usesLocalPosterFallback(movie: Movie, mode: DataMode): boolean {
  return (
    mode === "real" && (movie.posterSource !== "tmdb" || movie.posterMatchStatus !== "matched")
  );
}

export function reservationLinkAriaLabel(label: string, mode: DataMode): string {
  return mode === "real"
    ? `${label}の公式予約ページを外部サイトで開く`
    : `${label}のデモ予約ページを外部サイトで開く`;
}

export function scheduleLinkNotice(mode: DataMode): string {
  return mode === "real"
    ? "リンクのある上映時刻は公式予約サイトを外部タブで開きます。購入前に公式サイトで最新情報をご確認ください。"
    : "時刻を選ぶとデモ用予約リンクが外部タブで開きます。";
}
