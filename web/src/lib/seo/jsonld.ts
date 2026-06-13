import { DEFAULT_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo/site";

export function organizationJsonLd() {
  const url = siteUrl();
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url,
    logo: `${url}/apple-icon`,
    description: DEFAULT_DESCRIPTION,
  };
}

export function webApplicationJsonLd() {
  const url = siteUrl();
  return {
    "@type": "WebApplication",
    name: SITE_NAME,
    url,
    applicationCategory: "GameApplication",
    operatingSystem: "Web browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: DEFAULT_DESCRIPTION,
    featureList: [
      "3-minute solo trading races vs algorithmic bots",
      "Multiplayer rooms with open room browser",
      "Community gallery of anonymous trading runs",
      "Play alongside recorded sessions as a replay bot",
      "Historical markets: forex, gold, stocks, crypto",
    ],
    browserRequirements: "Requires JavaScript. Works on desktop and mobile browsers.",
  };
}

export function faqJsonLd() {
  return {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Tradr?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tradr is a free browser trading game where you trade on a live candlestick chart in 3-minute rounds against algorithmic bots. It is a simulation for practice and competition, not real-money trading or financial advice.",
        },
      },
      {
        "@type": "Question",
        name: "Is Tradr free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Tradr is free to play in the browser with no download required. An optional Pro registration exists for saved progress.",
        },
      },
      {
        "@type": "Question",
        name: "Does Tradr have multiplayer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Create or join multiplayer rooms on the same seeded market. The lobby lists open rooms that already have traders waiting.",
        },
      },
      {
        "@type": "Question",
        name: "What is Play alongside in the Tradr gallery?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "In the community gallery you can watch replays or Play alongside: enter the same market and trade live while the original player's recorded trades replay as a Peer trader bot alongside regular algorithmic bots.",
        },
      },
      {
        "@type": "Question",
        name: "What markets can I trade in Tradr?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Solo and multiplayer support synthetic random markets and real historical daily data for instruments such as EUR/USD, gold, major US stocks, and Bitcoin.",
        },
      },
    ],
  };
}

export function siteJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), webApplicationJsonLd(), faqJsonLd()],
  };
}