export type TmdbOverride = number | null;

export type TmdbMatchRule = {
  query: string;
  acceptedTitles?: readonly string[];
  releaseYear?: number;
};

// These are broadcasts rather than TMDB movie releases. Keep the exclusions explicit and reviewable.
export const TMDB_OVERRIDES: Readonly<Record<string, TmdbOverride>> = Object.freeze({
  "【0803】2026 長岡まつり大花火大会": null,
  "2026長岡まつり大花火大会 ライブ中継(8/3(月))": null,
  "NMIXX 1ST WORLD TOUR IN JAPAN LIVE VIEWING": null,
  // Confirmed animated 2016 release. Avoid the same Japanese title used by the 2026 remake.
  モアナと伝説の海: 277834,
});

const TMDB_DECORATION_PATTERNS: readonly RegExp[] = [
  /^月イチ35mmフィルム上映\s*/u,
  /\s*絶叫上映\s*$/u,
  /\s*(?:4K(?:リマスター)?(?:版)?|再上映)\s*$/iu,
  /\s*[（(]午前十時の映画祭\d+[）)]\s*$/u,
  /\s*[<＜]ファミリーシアター[>＞]\s*$/u,
  /\s*[[【(（][^\]】)）]*(?:SCREENX|字幕|吹替|グリーティング付|おこさまシネマ|舞台挨拶)[^\]】)）]*[\]】)）]\s*/giu,
  /\s*(?:舞台挨拶(?:全国同時生中継|中継|付き)?|トークイベント上映)\s*$/u,
];

function stripOuterTitleQuotes(value: string): string {
  const match = /^(?:『([^』]+)』|「([^」]+)」)$/u.exec(value.trim());
  return match?.[1] ?? match?.[2] ?? value.trim();
}

export function tmdbSearchTitle(title: string): string {
  let query = title.normalize("NFKC").trim();
  for (const pattern of TMDB_DECORATION_PATTERNS) query = query.replace(pattern, " ").trim();
  query = stripOuterTitleQuotes(query).replace(/\s+/gu, " ").trim();
  return query || title;
}

// Only controlled title variants are queried. Candidate titles must still pass exact normalized matching.
export const TMDB_MATCH_RULES: Readonly<Record<string, TmdbMatchRule>> = Object.freeze({
  "A.I(午前十時の映画祭16)": {
    query: "A.I.",
    acceptedTitles: ["A.I. Artificial Intelligence"],
    releaseYear: 2001,
  },
  "『だぁれかさんとアソぼ?』絶叫上映": {
    query: "だぁれかさんとアソぼ?",
    acceptedTitles: ["だぁれかさんとアソぼ?"],
    releaseYear: 2026,
  },
  "【トイ・ストーリーシアター/吹替】 トイ・ストーリー5": {
    query: "トイ・ストーリー5",
    acceptedTitles: ["Toy Story 5"],
    releaseYear: 2026,
  },
  "<マジLOVEライブ上映>うたの☆プリンスさまっ♪ マジLOVEスターリッシュツアーズ<発声OK> 再上映": {
    query: "劇場版 うたの☆プリンスさまっ♪ マジLOVEスターリッシュツアーズ",
    releaseYear: 2022,
  },
  "『キングダム 魂の決戦』特大ヒット御礼舞台挨拶全国同時生中継": {
    query: "キングダム 魂の決戦",
  },
  "キングダム 魂の決戦[舞台挨拶中継]": {
    query: "キングダム 魂の決戦",
  },
  "舞台挨拶中継付き)キングダム 魂の決戦": {
    query: "キングダム 魂の決戦",
  },
  "『ゼンブ・オブ・トーキョー』日向坂46四期生11名バースデー記念特別再上映": {
    query: "ゼンブ・オブ・トーキョー",
    releaseYear: 2024,
  },
  "スパイダーマン...[SCREENX・吹替][グリーティング付]": {
    query: "スパイダーマン: ブランド・ニュー・デイ",
    acceptedTitles: ["Spider-Man: Brand New Day"],
    releaseYear: 2026,
  },
  "スパイダーマン ブランド・ニュー・デイ": {
    query: "スパイダーマン：ブランド・ニュー・デイ",
    acceptedTitles: ["Spider-Man: Brand New Day"],
    releaseYear: 2026,
  },
  "スパイダーマン: ブランド・ニュー・デイ": {
    query: "スパイダーマン：ブランド・ニュー・デイ",
    acceptedTitles: ["Spider-Man: Brand New Day"],
    releaseYear: 2026,
  },
  "パウ・パトロール ザ・ダイノ・ムービー <ファミリーシアター>": {
    query: "パウ・パトロール ザ・ダイノ・ムービー",
    releaseYear: 2026,
  },
  "パウ・パトロール...[吹替[パウっと!ファミリーシアター": {
    query: "パウ・パトロール ザ・ダイノ・ムービー",
    acceptedTitles: ["パウ・パトロール ザ・ダイノ・ムービー"],
    releaseYear: 2026,
  },
  "パプリカ 4Kリマスター版": {
    query: "パプリカ",
    releaseYear: 2006,
  },
  "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション": {
    query: "クレヨンしんちゃん 奇々怪々",
    acceptedTitles: ["クレヨンしんちゃん 奇々怪々!オラの妖怪バケ~ション"],
    releaseYear: 2026,
  },
  "映画館デビュー×パウっと!ファミリーシアター)吹替 パウ・パトロール ザ・ダイノ・ムービー": {
    query: "パウ・パトロール ザ・ダイノ・ムービー",
    acceptedTitles: ["パウ・パトロール ザ・ダイノ・ムービー"],
    releaseYear: 2026,
  },
  "怪談(午前十時の映画祭16)": {
    query: "怪談",
    releaseYear: 1965,
  },
  "月イチ35mmフィルム上映 『魔性の夏 四谷怪談より』": {
    query: "魔性の夏 四谷怪談より",
    releaseYear: 1981,
  },
});
