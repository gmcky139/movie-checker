import { createDateTabs } from "../components/date-tabs";
import { append, element } from "../components/dom";
import { createEmptyState } from "../components/empty-state";
import { createExternalLink } from "../components/external-link";
import { createPoster } from "../components/poster";
import { createMain, getAppRoot, renderFatalError, renderPage } from "../components/page-shell";
import { createScreeningList } from "../components/screening-list";
import { SampleDataProvider } from "../data/sample-data-provider";
import { formatLongDate, formatMinutes, getTokyoDate } from "../domain/date";
import { scheduleLinkNotice } from "../domain/presentation";
import { getScreeningsForMovieAtTheater, getTheatersForMovie } from "../domain/selectors";
import { homeUrl, movieUrl, readId, readSearchState, theaterUrl } from "../domain/urls";

export async function runMovieDetailPage(): Promise<void> {
  const root = getAppRoot();
  try {
    const data = await new SampleDataProvider().load();
    const state = readSearchState(window.location.search, data.dates);
    const movieId = readId(window.location.search);
    if (state.usedFallback) {
      window.history.replaceState(null, "", movieUrl(movieId, state.date));
    }

    const main = createMain();
    const back = element("a", {
      className: "back-link",
      text: "← 映画一覧へ戻る",
      attributes: { href: homeUrl({ date: state.date }) },
    });
    main.append(back);

    const movie = data.movies.find((item) => item.id === movieId);
    if (!movie) {
      main.append(
        createEmptyState(
          "指定された映画が見つかりません",
          "URLをご確認いただくか、映画一覧から作品を選び直してください。",
          { label: "トップページへ", href: homeUrl({ date: state.date }) },
          "h1",
        ),
      );
      renderPage(root, data, state.date, main);
      return;
    }
    document.title = `${movie.title} | Movie Schedule Viewer`;

    const details = element("article", { className: "detail-hero" });
    const posterFrame = element("div", { className: "detail-hero__poster" });
    posterFrame.append(createPoster(movie, data.dataMode, true));
    const body = element("div", { className: "detail-hero__body" });
    append(
      body,
      element("p", { className: "eyebrow", text: "MOVIE DETAIL" }),
      element("h1", { text: movie.title }),
    );
    if (movie.originalTitle) {
      body.append(element("p", { className: "original-title", text: movie.originalTitle }));
    }
    if (movie.synopsis) {
      body.append(element("p", { className: "synopsis", text: movie.synopsis }));
    }
    const metadata = element("dl", { className: "metadata" });
    const metadataRows: Array<[string, string]> = [];
    if (movie.durationMinutes) {
      metadataRows.push(["上映時間", formatMinutes(movie.durationMinutes)]);
    }
    if (movie.releaseDate) metadataRows.push(["公開日", formatLongDate(movie.releaseDate)]);
    if (movie.genres.length > 0) metadataRows.push(["ジャンル", movie.genres.join("・")]);
    for (const [term, value] of metadataRows) {
      append(metadata, element("dt", { text: term }), element("dd", { text: value }));
    }
    if (metadataRows.length > 0) body.append(metadata);
    if (movie.officialUrl) {
      const links = element("div", { className: "external-links" });
      links.append(createExternalLink("作品詳細", movie.officialUrl, data.dataMode === "sample"));
      body.append(links);
    }
    append(details, posterFrame, body);
    main.append(details);

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
        makeUrl: (date) => movieUrl(movie.id, date),
      }),
    );

    const section = element("section", { className: "section-block" });
    const heading = element("div", { className: "section-heading" });
    const headingGroup = element("div");
    append(
      headingGroup,
      element("p", { className: "eyebrow", text: "SCREENINGS" }),
      element("h2", { text: "上映映画館と時刻" }),
      element("p", {
        className: "section-heading__description",
        text: formatLongDate(state.date),
      }),
    );
    heading.append(headingGroup);
    section.append(heading);

    const now = new Date();
    const theaters = getTheatersForMovie(data, movie.id, state.date).sort((left, right) => {
      const leftTime =
        getScreeningsForMovieAtTheater(data, movie.id, left.id, state.date)[0]?.startTime ?? "";
      const rightTime =
        getScreeningsForMovieAtTheater(data, movie.id, right.id, state.date)[0]?.startTime ?? "";
      return leftTime.localeCompare(rightTime);
    });
    if (theaters.length === 0) {
      section.append(
        createEmptyState(
          "この日の上映情報はありません",
          "別の日付を選択して上映スケジュールをご確認ください。",
        ),
      );
    } else {
      const list = element("div", { className: "schedule-groups" });
      for (const theater of theaters) {
        const group = element("article", { className: "schedule-group" });
        const groupHeader = element("div", { className: "schedule-group__header" });
        const identity = element("div");
        append(
          identity,
          element("p", { className: "eyebrow", text: theater.area }),
          element("h3", { text: theater.name }),
        );
        const detailLink = element("a", {
          className: "text-link",
          text: "映画館詳細 →",
          attributes: { href: theaterUrl(theater.id, state.date) },
        });
        append(groupHeader, identity, detailLink);
        const screenings = getScreeningsForMovieAtTheater(data, movie.id, theater.id, state.date);
        append(
          group,
          groupHeader,
          createScreeningList(screenings, now, data.dataMode, theater.ticketUrl),
        );
        group.append(
          element("p", {
            className: "schedule-note",
            text: scheduleLinkNotice(data.dataMode),
          }),
        );
        list.append(group);
      }
      section.append(list);
    }
    main.append(section);
    renderPage(root, data, state.date, main);
  } catch (error: unknown) {
    console.error("Failed to render movie detail page", error);
    renderFatalError(root);
  }
}
