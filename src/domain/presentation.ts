import type { DataMode } from "./types";

export function homeScheduleLabel(mode: DataMode): string {
  return mode === "real" ? "4 DAYS / OFFICIAL SCHEDULE" : "4 DAYS / DEMO SCHEDULE";
}

export function posterAlt(title: string, mode: DataMode): string {
  return mode === "real" ? `${title}のポスター画像なし` : `${title}のデモポスター`;
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
