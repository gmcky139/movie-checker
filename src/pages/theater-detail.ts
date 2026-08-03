import { createDateTabs } from "../components/date-tabs";
import { append, element } from "../components/dom";
import { createEmptyState } from "../components/empty-state";
import { createExternalLink } from "../components/external-link";
import { createMain, getAppRoot, renderFatalError, renderPage } from "../components/page-shell";
import { createPoster } from "../components/poster";
import { createScreeningList } from "../components/screening-list";
import { SampleDataProvider } from "../data/sample-data-provider";
import { formatLongDate, formatMinutes, getTokyoDate } from "../domain/date";
import { getMoviesForTheater, getScreeningsForMovieAtTheater } from "../domain/selectors";
import { homeUrl, movieUrl, readId, readSearchState, theaterUrl } from "../domain/urls";

export async function runTheaterDetailPage(): Promise<void> {
  const root = getAppRoot();
  try {
    const data = await new SampleDataProvider().load();
    const state = readSearchState(window.location.search, data.dates);
    const theaterId = readId(window.location.search);
    if (state.usedFallback) {
      window.history.replaceState(null, "", theaterUrl(theaterId, state.date));
    }

    const main = createMain();
    main.append(
      element("a", {
        className: "back-link",
        text: "← 映画館一覧へ戻る",
        attributes: { href: homeUrl({ date: state.date }) },
      }),
    );

    const theater = data.theaters.find((item) => item.id === theaterId);
    if (!theater) {
      main.append(
        createEmptyState(
          "指定された映画館が見つかりません",
          "URLをご確認いただくか、映画館一覧から選び直してください。",
          { label: "トップページへ", href: homeUrl({ date: state.date }) },
          "h1",
        ),
      );
      renderPage(root, data, state.date, main);
      return;
    }
    document.title = `${theater.name} | Movie Schedule Viewer`;

    const hero = element("section", { className: "theater-hero" });
    const titleGroup = element("div");
    append(
      titleGroup,
      element("p", { className: "eyebrow", text: theater.area }),
      element("h1", { text: theater.name }),
      element("p", { className: "theater-hero__description", text: theater.description }),
    );
    const links = element("div", { className: "external-links" });
    append(
      links,
      createExternalLink("公式サイト", theater.officialUrl, data.dataMode === "sample"),
      createExternalLink("チケット予約", theater.ticketUrl, data.dataMode === "sample"),
    );
    append(hero, titleGroup, links);
    main.append(hero);

    if (!state.date || data.dates.length === 0) {
      main.append(createEmptyState("上映データがありません", "現在表示できる上映日がありません。"));
      renderPage(root, data, state.date, main);
      return;
    }

    main.append(
      createDateTabs({
        dates: data.dates,
        selectedDate: state.date,
        today: getTokyoDate(),
        makeUrl: (date) => theaterUrl(theater.id, date),
      }),
    );

    const section = element("section", { className: "section-block" });
    const sectionHeader = element("div", { className: "section-heading" });
    const headingGroup = element("div");
    append(
      headingGroup,
      element("p", { className: "eyebrow", text: "NOW SHOWING" }),
      element("h2", { text: "上映作品と時刻" }),
      element("p", {
        className: "section-heading__description",
        text: formatLongDate(state.date),
      }),
    );
    sectionHeader.append(headingGroup);
    section.append(sectionHeader);

    const movies = getMoviesForTheater(data, theater.id, state.date).sort((left, right) => {
      const leftTime =
        getScreeningsForMovieAtTheater(data, left.id, theater.id, state.date)[0]?.startTime ?? "";
      const rightTime =
        getScreeningsForMovieAtTheater(data, right.id, theater.id, state.date)[0]?.startTime ?? "";
      return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title, "ja");
    });
    if (movies.length === 0) {
      section.append(
        createEmptyState(
          "この日の上映情報はありません",
          "別の日付を選択して上映スケジュールをご確認ください。",
        ),
      );
    } else {
      const list = element("div", { className: "theater-schedule" });
      const now = new Date();
      for (const movie of movies) {
        const row = element("article", { className: "theater-schedule__item" });
        const posterLink = element("a", {
          className: "theater-schedule__poster",
          attributes: {
            href: movieUrl(movie.id, state.date),
            "aria-label": `${movie.title}の詳細を見る`,
          },
        });
        posterLink.append(createPoster(movie));
        const content = element("div", { className: "theater-schedule__content" });
        const titleLink = element("a", {
          className: "title-link",
          text: movie.title,
          attributes: { href: movieUrl(movie.id, state.date) },
        });
        const meta = element("p", {
          className: "movie-card__meta",
          text: [
            movie.durationMinutes ? formatMinutes(movie.durationMinutes) : undefined,
            movie.genres.length > 0 ? movie.genres.join("・") : undefined,
          ]
            .filter((value): value is string => value !== undefined)
            .join(" / "),
        });
        const screenings = getScreeningsForMovieAtTheater(data, movie.id, theater.id, state.date);
        append(content, titleLink, meta, createScreeningList(screenings, now, theater.ticketUrl));
        content.append(
          element("p", {
            className: "schedule-note",
            text: "時刻はデモ用予約リンクです。",
          }),
        );
        append(row, posterLink, content);
        list.append(row);
      }
      section.append(list);
    }
    main.append(section);
    renderPage(root, data, state.date, main);
  } catch (error: unknown) {
    console.error("Failed to render theater detail page", error);
    renderFatalError(root);
  }
}
