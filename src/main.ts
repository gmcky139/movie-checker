import { runHomePage } from "./pages/home";
import { runMovieDetailPage } from "./pages/movie-detail";
import { runTheaterDetailPage } from "./pages/theater-detail";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";

async function start(): Promise<void> {
  switch (document.body.dataset.page) {
    case "movie":
      await runMovieDetailPage();
      break;
    case "theater":
      await runTheaterDetailPage();
      break;
    default:
      await runHomePage();
  }
}

void start();
