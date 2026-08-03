import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDateRange } from "../src/domain/date";
import type { AppData, Movie, Screening, Theater } from "../src/domain/types";

const movies: Movie[] = [
  {
    id: "hoshi-no-kouro",
    title: "星の航路",
    originalTitle: "Voyage of Stars",
    synopsis: "故郷を離れた若い航海士が、星図にない光を追って宇宙の海を旅する物語。",
    durationMinutes: 118,
    releaseDate: "2026-04-18",
    genres: ["SF", "ドラマ"],
    posterPath: "images/posters/hoshi-no-kouro.svg",
  },
  {
    id: "ameagari-no-tegami",
    title: "雨上がりの手紙",
    synopsis: "古い郵便局で見つかった一通の手紙が、町の人々の止まっていた時間を動かす。",
    durationMinutes: 104,
    releaseDate: "2026-05-09",
    genres: ["ドラマ", "ヒューマン"],
    posterPath: "images/posters/ameagari-no-tegami.svg",
  },
  {
    id: "midori-no-tokeitou",
    title: "緑の時計塔",
    originalTitle: "The Verdant Clock",
    synopsis: "時間が逆さに流れる時計塔を舞台に、姉弟が町の秘密を解き明かす冒険譚。",
    durationMinutes: 126,
    releaseDate: "2026-03-21",
    genres: ["ファンタジー", "アドベンチャー"],
    posterPath: "images/posters/midori-no-tokeitou.svg",
  },
  {
    id: "sora-wo-amu",
    title: "空を編む",
    synopsis: "海辺の工房で凧を作る職人と、空を撮り続ける写真家の静かな交流を描く。",
    durationMinutes: 97,
    releaseDate: "2026-06-06",
    genres: ["恋愛", "ドラマ"],
    posterPath: "images/posters/sora-wo-amu.svg",
  },
  {
    id: "yoru-no-toshokan",
    title: "夜の図書館",
    originalTitle: "Library After Dark",
    synopsis: "閉館後に本の登場人物が歩き出す図書館で、新人司書が失われた結末を探す。",
    durationMinutes: 111,
    releaseDate: "2026-02-14",
    genres: ["ミステリー", "ファンタジー"],
    posterPath: "images/posters/yoru-no-toshokan.svg",
  },
  {
    id: "natsu-no-kiroku",
    title: "夏の記録",
    synopsis: "高校最後の夏、映像部の四人が町の小さな祭りを記録する青春群像劇。",
    durationMinutes: 102,
    releaseDate: "2026-07-11",
    genres: ["青春", "ドラマ"],
    posterPath: "images/posters/natsu-no-kiroku.svg",
  },
  {
    id: "shiroi-hamon",
    title: "白い波紋",
    originalTitle: "White Ripples",
    synopsis: "雪深い湖畔の村で起きた失踪事件を、帰郷した記者が追うサスペンス。",
    durationMinutes: 129,
    releaseDate: "2026-01-24",
    genres: ["サスペンス", "ミステリー"],
    posterPath: "images/posters/shiroi-hamon.svg",
  },
  {
    id: "robot-to-asa",
    title: "ロボットと朝",
    synopsis: "一日の記憶しか持てないロボットとパン職人が、毎朝新しい友情を始める。",
    durationMinutes: 93,
    releaseDate: "2026-05-30",
    genres: ["アニメーション", "コメディ"],
    posterPath: "images/posters/robot-to-asa.svg",
  },
  {
    id: "kaze-no-restaurant",
    title: "風のレストラン",
    synopsis: "旅する料理人が一夜だけ開くレストランで、客たちの思い出の味を再現する。",
    durationMinutes: 108,
    releaseDate: "2026-06-20",
    genres: ["ドラマ", "グルメ"],
    posterPath: "images/posters/kaze-no-restaurant.svg",
  },
  {
    id: "ao-no-kakera",
    title: "青のかけら",
    originalTitle: "Fragments in Blue",
    synopsis: "幻の青い鉱石を探す研究者と山岳ガイドが、自然と向き合うロードムービー。",
    durationMinutes: 115,
    releaseDate: "2026-04-04",
    genres: ["アドベンチャー", "ドラマ"],
    posterPath: "images/posters/ao-no-kakera.svg",
  },
];

const theaters: Theater[] = [
  {
    id: "theater-shibuya",
    name: "シネマ渋谷セントラル",
    area: "渋谷",
    description: "駅から徒歩5分。幅広いジャンルを上映するデモ映画館です。",
    officialUrl: "https://example.com/?theater=shibuya&type=official",
    ticketUrl: "https://example.com/?theater=shibuya&type=ticket",
  },
  {
    id: "theater-shinjuku",
    name: "新宿ムーンライトシネマ",
    area: "新宿",
    description: "ゆったりした座席と夜の上映が特徴のデモ映画館です。",
    officialUrl: "https://example.com/?theater=shinjuku&type=official",
    ticketUrl: "https://example.com/?theater=shinjuku&type=ticket",
  },
  {
    id: "theater-kichijoji",
    name: "吉祥寺フォレストシアター",
    area: "吉祥寺",
    description: "商店街の先にある、地域密着型のデモ映画館です。",
    officialUrl: "https://example.com/?theater=kichijoji&type=official",
    ticketUrl: "https://example.com/?theater=kichijoji&type=ticket",
  },
  {
    id: "theater-odaiba",
    name: "お台場ベイシネマ",
    area: "お台場",
    description: "海辺の景色と大きなスクリーンを楽しめるデモ映画館です。",
    officialUrl: "https://example.com/?theater=odaiba&type=official",
    ticketUrl: "https://example.com/?theater=odaiba&type=ticket",
  },
];

function addMinutes(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function compactDate(date: string): string {
  return date.replaceAll("-", "");
}

function createTicketUrl(
  theater: Theater,
  movieId: string,
  date: string,
  startTime: string,
): string {
  const url = new URL(theater.ticketUrl);
  url.searchParams.set("movie", movieId);
  url.searchParams.set("date", date);
  url.searchParams.set("time", startTime);
  return url.toString();
}

export function createSampleData(now: Date = new Date()): AppData {
  const dates = createDateRange(now);
  const screenings: Screening[] = [];

  for (const [dateIndex, date] of dates.entries()) {
    for (const [theaterIndex, theater] of theaters.entries()) {
      for (let slot = 0; slot < 4; slot += 1) {
        const movie = movies[(theaterIndex * 2 + dateIndex + slot) % movies.length];
        if (!movie) continue;

        const minuteOffset = theaterIndex * 5 + (dateIndex % 2) * 5;
        const startTimes = [
          `09:${String(minuteOffset).padStart(2, "0")}`,
          `13:${String(minuteOffset + slot * 2).padStart(2, "0")}`,
          `17:${String(minuteOffset + slot * 3).padStart(2, "0")}`,
        ];

        for (const startTime of startTimes) {
          screenings.push({
            id: `screening-${compactDate(date)}-${theater.id}-${movie.id}-${startTime.replace(":", "")}`,
            movieId: movie.id,
            theaterId: theater.id,
            date,
            startTime,
            endTime: addMinutes(startTime, movie.durationMinutes + 15),
            ticketUrl: createTicketUrl(theater, movie.id, date, startTime),
          });
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    timezone: "Asia/Tokyo",
    sourceMode: "sample",
    dates,
    movies,
    theaters,
    screenings,
  };
}

async function main(): Promise<void> {
  const outputPath = resolve(process.cwd(), "src/data/generated.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(createSampleData(), null, 2)}\n`, "utf8");
  console.log(`Generated sample data: ${outputPath}`);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
