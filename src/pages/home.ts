import { createDateTabs } from "../components/date-tabs";
import { append, element } from "../components/dom";
import { createEmptyState } from "../components/empty-state";
import { createMovieCard } from "../components/movie-card";
import { createMain, getAppRoot, renderFatalError, renderPage } from "../components/page-shell";
import { createTheaterCard } from "../components/theater-card";
import { SampleDataProvider } from "../data/sample-data-provider";
import { formatLongDate, getTokyoDate } from "../domain/date";
import { getMoviesForDate, searchMovies, sortMoviesForSchedule } from "../domain/selectors";
import { homeUrl, readSearchState } from "../domain/urls";

export async function runHomePage(): Promise<void> {
  const root = getAppRoot();
  try {
    const data = await new SampleDataProvider().load();
    const state = readSearchState(window.location.search, data.dates);
    if (state.usedFallback) {
      window.history.replaceState(null, "", homeUrl({ date: state.date, query: state.query }));
    }

    const now = new Date();
    const main = createMain();
    const intro = element("section", { className: "hero" });
    const eyebrow = element("p", { className: "eyebrow", text: "4 DAYS / DEMO SCHEDULE" });
    const heading = element("h1", {
      text: "観たい映画と、行ける映画館をひとつの場所で。",
    });
    const description = element("p", {
      className: "hero__lead",
      text: "今日から4日分の上映予定を、映画と映画館の両方から探せます。",
    });
    const demoBadge = element("p", {
      className: "demo-notice",
      text: "デモデータ — 実際の上映・予約情報ではありません",
    });
    append(intro, eyebrow, heading, description, demoBadge);

    if (data.dates.length === 0 || !state.date) {
      append(
        main,
        intro,
        createEmptyState(
          "上映データがありません",
          "現在表示できる日付がありません。データ更新後にもう一度お試しください。",
        ),
      );
      renderPage(root, data, state.date, main, state.query);
      return;
    }

    description.textContent = `${formatLongDate(state.date)}の上映予定を、映画と映画館の両方から探せます。`;
    append(
      main,
      createDateTabs({
        dates: data.dates,
        selectedDate: state.date,
        today: getTokyoDate(now),
        makeUrl: (date) => homeUrl({ date, query: state.query }),
      }),
      intro,
    );

    const scheduleHeader = element("div", { className: "section-heading" });
    const scheduleHeadingGroup = element("div");
    append(
      scheduleHeadingGroup,
      element("p", { className: "eyebrow", text: "MOVIES" }),
      element("h2", { text: "上映中の映画" }),
      element("p", {
        className: "section-heading__description",
        text: `${formatLongDate(state.date)}のスケジュール`,
      }),
    );

    const moviesForDate = getMoviesForDate(data, state.date);
    const filteredMovies = searchMovies(moviesForDate, state.query);
    const sortedMovies = sortMoviesForSchedule(data, filteredMovies, state.date, now);
    const resultCount = element("p", {
      className: "result-count",
      text: state.query
        ? `「${state.query}」の検索結果 ${sortedMovies.length}件`
        : `${sortedMovies.length}作品`,
      attributes: { "aria-live": "polite" },
    });
    append(scheduleHeader, scheduleHeadingGroup, resultCount);
    main.append(scheduleHeader);

    if (sortedMovies.length === 0) {
      main.append(
        createEmptyState(
          state.query ? "該当する映画はありません" : "この日の上映情報はありません",
          state.query
            ? "検索語を変えるか、別の日付を選択してください。"
            : "別の日付を選択してください。",
          state.query ? { label: "検索をクリア", href: homeUrl({ date: state.date }) } : undefined,
        ),
      );
    } else {
      const grid = element("div", { className: "movie-grid" });
      sortedMovies.forEach((movie, index) => {
        grid.append(createMovieCard(data, movie, state.date, now, index < 4));
      });
      main.append(grid);
    }

    const theaterSection = element("section", { className: "section-block" });
    const theaterHeading = element("div", { className: "section-heading" });
    const theaterHeadingGroup = element("div");
    append(
      theaterHeadingGroup,
      element("p", { className: "eyebrow", text: "THEATERS" }),
      element("h2", { text: "映画館から探す" }),
      element("p", {
        className: "section-heading__description",
        text: "エリアや映画館を起点に上映作品を確認できます。",
      }),
    );
    theaterHeading.append(theaterHeadingGroup);
    theaterSection.append(theaterHeading);
    if (data.theaters.length === 0) {
      theaterSection.append(
        createEmptyState("映画館データがありません", "映画館情報を表示できません。"),
      );
    } else {
      const list = element("div", { className: "theater-grid" });
      for (const theater of data.theaters) {
        list.append(createTheaterCard(data, theater, state.date));
      }
      theaterSection.append(list);
    }
    main.append(theaterSection);
    renderPage(root, data, state.date, main, state.query);
  } catch (error: unknown) {
    console.error("Failed to render home page", error);
    renderFatalError(root);
  }
}
