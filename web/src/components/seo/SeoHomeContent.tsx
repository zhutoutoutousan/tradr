import Link from "next/link";
import { siteUrl } from "@/lib/seo/site";

/** Crawler-friendly copy on the home route (client game UI mounts above). */
export default function SeoHomeContent() {
  const base = siteUrl();

  return (
    <div className="sr-only">
      <h1>Tradr — free browser trading game vs algorithmic bots</h1>
      <p>
        Tradr is a real-time paper trading game in your browser. Trade a live candlestick chart for three-minute
        rounds while RSI, EMA, and Darvas-style algorithmic bots trade the same market. Beat the machines on the
        leaderboard. Simulation only—not financial advice.
      </p>
      <nav aria-label="Site sections">
        <ul>
          <li>
            <Link href="/">Play solo or multiplayer</Link>
          </li>
          <li>
            <Link href="/multiplayer">Multiplayer rooms with open room list</Link>
          </li>
          <li>
            <Link href="/community">Community gallery — watch replays or play alongside</Link>
          </li>
        </ul>
      </nav>
      <h2>Frequently asked questions</h2>
      <dl>
        <dt>Is Tradr free?</dt>
        <dd>Yes. Play in the browser with no download. Optional Pro registration saves progress.</dd>
        <dt>Multiplayer?</dt>
        <dd>Create or join rooms; the lobby shows open rooms with traders already waiting.</dd>
        <dt>Play alongside?</dt>
        <dd>
          In the gallery, replay someone&apos;s run or trade live while their recorded trades replay as a Peer trader
          bot.
        </dd>
        <dt>Markets?</dt>
        <dd>Synthetic feeds plus historical forex, gold, stocks, and crypto daily data.</dd>
      </dl>
      <p>
        Official site: <a href={base}>{base}</a>
      </p>
    </div>
  );
}