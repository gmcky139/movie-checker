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
});

// Only controlled title variants are queried. Candidate titles must still pass exact normalized matching.
export const TMDB_MATCH_RULES: Readonly<Record<string, TmdbMatchRule>> = Object.freeze({
  "A.I(午前十時の映画祭16)": {
    query: "A.I.",
    acceptedTitles: ["A.I. Artificial Intelligence"],
    releaseYear: 2001,
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
});
