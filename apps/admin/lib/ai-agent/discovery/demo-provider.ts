import type { Candidate, DiscoveryParams, DiscoverySource } from "../types";

// Demo Mode discovery provider (spec section 21) — the ONLY discovery
// source that is always configured, since it needs no external API or
// credentials at all. Every other provider in this directory is a real,
// structured integration point that is NOT implemented/live in V1 (see
// each file's own comment) — this is what actually powers "Find Clients"
// today, and what the whole pipeline (dedup -> filter -> analyze -> score
// -> qualify -> save) is exercised and tested against.
//
// Every candidate below is fixed, hand-written sample text — never
// dynamically generated, never claimed to be a real person. `isDemo` is
// hardcoded true so nothing downstream can ever mistake this for live
// data; the Leads UI and Find Clients page both surface "Demo discovery
// source active" per the spec whenever a run only used this provider.
//
// Deliberately includes BOTH qualified and unqualified examples (true
// prospects, "possible" prospects, and clear non-prospects) — spec
// section 21's own requirement, so the scoring/qualification engine in
// ../tools can be exercised and demonstrated end-to-end without any real
// API key configured.

const DEMO_CANDIDATES: Candidate[] = [
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-1",
    username: "u/pixelforge_dev",
    prospectName: null,
    title: "Looking for a 2D animator for our indie game trailer",
    text:
      "Hey everyone — we're a 3-person indie team wrapping up our Steam launch and we're looking for a 2D animator " +
      "to create a 30-45 second trailer for our game. We have concept art and a rough storyboard already. Budget is " +
      "around $600-800 and we'd love to have this done within the next 3 weeks, ideally before our launch date. " +
      "DM me or reply here if you're interested and can share a portfolio.",
    sourceUrl: "https://reddit.com/r/gamedev/comments/demo1",
    projectUrl: "https://store.steampowered.com/app/demo-pixelforge",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    contactMethod: "reddit_dm",
    contactUrl: "https://reddit.com/user/pixelforge_dev",
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-2",
    username: "u/chainquest_official",
    prospectName: "ChainQuest",
    title: "Need someone to create animated social media content for our Web3 project",
    text:
      "Our Web3 gaming project ChainQuest is ramping up marketing ahead of our token launch. We're looking for " +
      "an animator who can produce short animated GIFs and sticker packs for Twitter/Discord — ongoing work, not " +
      "just a one-off. Paying in USDC, budget flexible for the right person. Please share examples of GIF/sticker " +
      "work if you reach out.",
    sourceUrl: "https://reddit.com/r/CryptoGaming/comments/demo2",
    projectUrl: "https://chainquest.example.io",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    contactMethod: "discord",
    contactUrl: "https://discord.gg/chainquest-demo",
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-3",
    username: "u/nightfall_studios",
    prospectName: "Nightfall Studios",
    title: "Looking for character animation for our game",
    text:
      "We're building a narrative RPG and need character animation for our main cast — walk cycles, idle, and a " +
      "handful of combat animations. We have character designs ready. Would love to hear from animators who've " +
      "worked on games before. Not sure on exact budget yet, still scoping the work.",
    sourceUrl: "https://reddit.com/r/IndieGaming/comments/demo3",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    contactMethod: "reddit_dm",
    contactUrl: "https://reddit.com/user/nightfall_studios",
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-4",
    username: "u/motionmaven",
    prospectName: null,
    title: "Does anyone know a good animator?",
    text:
      "Random question — does anyone know a good animator for hire? Just curious what the going rate looks like " +
      "these days, not working on anything specific right now, just exploring options for maybe next year.",
    sourceUrl: "https://reddit.com/r/animation/comments/demo4",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    contactMethod: null,
    contactUrl: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-5",
    username: "u/frame_junkie",
    prospectName: null,
    title: "Check out this cool animation I found",
    text:
      "Just stumbled across this awesome animation reel on YouTube, the frame-by-frame work is incredible. Sharing " +
      "for anyone else who's into this stuff, not affiliated with the artist at all.",
    sourceUrl: "https://reddit.com/r/animation/comments/demo5",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    contactMethod: null,
    contactUrl: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-6",
    username: "u/newbie_animator99",
    prospectName: null,
    title: "How do I make an animation in Blender?",
    text:
      "Total beginner here, trying to figure out how to make a simple walk cycle in Blender. Any tutorial " +
      "recommendations? Struggling with the rigging step especially.",
    sourceUrl: "https://reddit.com/r/blender/comments/demo6",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
    contactMethod: null,
    contactUrl: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Job Board",
    externalId: "demo-7",
    username: null,
    prospectName: "Solstice Games",
    title: "Web3 Game Trailer — 2D Animator Needed (Paid)",
    text:
      "Solstice Games is hiring a freelance 2D animator to produce a 60-second launch trailer for our Solana-based " +
      "strategy game. We need frame-by-frame character animation plus motion graphic overlays for UI callouts. " +
      "Budget: $1,200-1,500 USD, paid in USDC or fiat. Deadline: within 4 weeks of contract start. Please apply " +
      "with a portfolio link and rate.",
    sourceUrl: "https://jobboard.example.com/listings/demo7",
    projectUrl: "https://solsticegames.example.io",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    contactMethod: "email",
    contactUrl: "mailto:hiring@solsticegames.example.io",
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Web Search",
    externalId: "demo-8",
    username: null,
    prospectName: "Lumen Labs",
    title: "Lumen Labs launches beta — animated explainer wanted",
    text:
      "Lumen Labs just opened up beta signups for their new productivity app and posted on their blog that they're " +
      "\"exploring options for a short explainer animation to walk new users through onboarding, probably in the " +
      "next couple of months once the beta feedback settles.\" No direct contact info listed on the post itself.",
    sourceUrl: "https://lumenlabs.example.com/blog/beta-launch",
    projectUrl: "https://lumenlabs.example.com",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    contactMethod: null,
    contactUrl: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-9",
    username: "u/memecoin_dao",
    prospectName: null,
    title: "our meme coin needs a mascot animation",
    text:
      "lol our community keeps asking for an animated version of our mascot for memes and stickers, anyone here " +
      "do that kind of thing? not a huge budget but we can pay something, mostly just want it to look sick on " +
      "twitter",
    sourceUrl: "https://reddit.com/r/CryptoCurrency/comments/demo9",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    contactMethod: "reddit_dm",
    contactUrl: "https://reddit.com/user/memecoin_dao",
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    platform: "Reddit",
    externalId: "demo-10",
    username: "u/uxpassion",
    prospectName: null,
    title: "our onboarding flow feels flat, thoughts?",
    text:
      "Sharing our app's onboarding flow for feedback — feels a bit flat right now, might be missing some " +
      "micro-interactions or transitions between screens. Open to any UX critique, not looking to hire anyone at " +
      "this point, just want opinions.",
    sourceUrl: "https://reddit.com/r/UXDesign/comments/demo10",
    projectUrl: null,
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 90).toISOString(),
    contactMethod: null,
    contactUrl: null,
    isDemo: true,
  },
];

export class DemoDiscoveryProvider implements DiscoverySource {
  id = "demo";
  label = "Demo Discovery Provider";
  description =
    "Fixed, hand-written sample prospects (mixed qualified/unqualified) used to exercise the qualification " +
    "pipeline end-to-end without any external API configured. Always available.";

  isConfigured(): boolean {
    return true;
  }

  async discover(_params: DiscoveryParams): Promise<Candidate[]> {
    // No network call, nothing to await for real — the await is kept so
    // this still matches the DiscoverySource contract other providers
    // use for a real fetch, and so callers can't accidentally rely on
    // discover() being synchronous. Always returns the full fixed sample
    // set regardless of the requested limit — it's small and mixed
    // (qualified/possible/rejected) on purpose, see this file's own
    // header comment, so trimming it further would just hide examples.
    await Promise.resolve();
    return [...DEMO_CANDIDATES];
  }
}
