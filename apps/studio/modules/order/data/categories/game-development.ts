import {
  Gamepad2,
  Smartphone,
  Globe,
  Monitor,
  Boxes,
  Server,
  BarChart3,
  Gauge,
  Rocket,
} from "lucide-react";
import type { CategoryDefinition } from "../../types";
import { selectField, toggleField, expressDeliveryToggle } from "../fields";

// Repriced 10 Agst 2026 per "ATURAN PRICING NIMIA STUDIO 2026" brief
// (principle #2: Game Development does NOT use the 3x-production-cost
// rule — prices reflect scope, complexity, value, and market positioning).
// Delivery-day estimates are UNCHANGED from the previous pricing pass
// except for Game MVP (a brand new service with no prior baseline — its
// 14-day estimate is a placeholder, flagged in the repricing summary) and
// Prototype's Advanced Complexity option (the brief gave a $750-900 range;
// $800 total / +$300 delta was chosen as a representative point within
// that range, also flagged).
//
// "Game MVP" (id: game-mvp) is a NEW service added per the brief — distinct
// from "Prototype": Prototype = proof-of-concept/testing an idea, MVP = a
// more complete playable product with core gameplay. Its dbServiceId
// (…000021) is the next id in the existing catalog's uuid sequence; a
// matching row must be inserted into Supabase via
// packages/db/migrations/0031_game_mvp_service_seed.sql before a real
// order.service_id can reference it (see that migration for details).
export const GAME_DEVELOPMENT_CATEGORY: CategoryDefinition = {
  id: "game-development",
  name: "Game Development",
  tagline: "From first prototype to a shipped, polished build.",
  icon: Gamepad2,
  services: [
    {
      id: "prototype",
      dbServiceId: "00000000-0000-4000-8000-000000000019",
      categoryId: "game-development",
      name: "Prototype",
      tagline: "A playable proof-of-concept to test your core idea.",
      icon: Boxes,
      pricingModel: "startingFrom",
      startingPrice: 500,
      baseDeliveryDays: 10,
      configFields: [
        selectField({
          id: "platform",
          label: "Platform",
          options: [
            { id: "mobile", label: "Mobile" },
            { id: "pc", label: "PC" },
            { id: "web", label: "Web", effect: { priceDelta: 0 } },
          ],
          defaultOptionId: "mobile",
        }),
        selectField({
          id: "complexity",
          label: "Core Mechanic Complexity",
          options: [
            { id: "simple", label: "Simple" },
            // Brief gives a $750-900 total range for Advanced; +$300
            // (=> $800 total) was chosen as a representative single point —
            // larger scope should go through Custom Order/Negotiation.
            { id: "advanced", label: "Advanced", effect: { priceDelta: 300, deliveryDeltaDays: 5 } },
          ],
          defaultOptionId: "simple",
        }),
        toggleField({ id: "playableBuild", label: "Downloadable Playable Build", defaultOn: true }),
        toggleField({
          id: "sourceCode",
          label: "Source Code",
          helpText: "Included in standard scope.",
          defaultOn: true,
        }),
        expressDeliveryToggle(100),
      ],
    },
    {
      id: "game-mvp",
      dbServiceId: "00000000-0000-4000-8000-000000000021",
      categoryId: "game-development",
      name: "Game MVP",
      tagline: "A playable minimum viable game built to validate your core gameplay, mechanics, and concept.",
      icon: Rocket,
      pricingModel: "startingFrom",
      startingPrice: 900,
      // New service, no prior baseline to carry a delivery estimate from —
      // placeholder pending studio confirmation.
      baseDeliveryDays: 14,
      configFields: [
        selectField({
          id: "scope",
          label: "MVP Scope",
          options: [
            { id: "basic", label: "Basic" },
            { id: "standard", label: "Standard", effect: { priceDelta: 300 } },
            {
              id: "advanced",
              label: "Advanced",
              description: "Scope beyond this should use Custom Order / Negotiation.",
              effect: { priceDelta: 600 },
            },
          ],
          defaultOptionId: "basic",
        }),
      ],
    },
    {
      id: "mobile-game",
      dbServiceId: "00000000-0000-4000-8000-00000000001a",
      categoryId: "game-development",
      name: "Mobile Game",
      tagline: "A complete game built for iOS and Android.",
      icon: Smartphone,
      pricingModel: "startingFrom",
      startingPrice: 1200,
      baseDeliveryDays: 30,
      configFields: [
        selectField({
          id: "platform",
          label: "Platform",
          options: [
            { id: "ios", label: "iOS" },
            { id: "android", label: "Android" },
            { id: "both", label: "iOS + Android", effect: { priceDelta: 300, deliveryDeltaDays: 5 } },
          ],
          defaultOptionId: "both",
        }),
        selectField({
          id: "monetization",
          label: "Monetization",
          options: [
            { id: "none", label: "None" },
            { id: "ads", label: "Ads Integration", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
            { id: "iap", label: "In-App Purchases", effect: { priceDelta: 200, deliveryDeltaDays: 4 } },
          ],
          defaultOptionId: "none",
        }),
        toggleField({
          id: "multiplayer",
          label: "Multiplayer",
          effect: { priceDelta: 500, deliveryDeltaDays: 10 },
        }),
        toggleField({
          id: "backendIntegration",
          label: "Backend Integration",
          helpText: "Cloud save, leaderboards, and player accounts.",
          effect: { priceDelta: 300, deliveryDeltaDays: 7 },
        }),
        toggleField({
          id: "expressDelivery",
          label: "Express Delivery",
          helpText: "Rush production, subject to technical feasibility for your scope.",
          effect: { priceDelta: 150, deliveryMultiplier: 0.6 },
        }),
      ],
    },
    {
      id: "html5-game",
      dbServiceId: "00000000-0000-4000-8000-00000000001b",
      categoryId: "game-development",
      name: "HTML5 Game",
      tagline: "A lightweight browser game, playable anywhere.",
      icon: Globe,
      pricingModel: "startingFrom",
      startingPrice: 600,
      baseDeliveryDays: 21,
      configFields: [
        selectField({
          id: "genreComplexity",
          label: "Genre Complexity",
          options: [
            { id: "casual", label: "Casual / Puzzle" },
            { id: "arcade", label: "Arcade / Action", effect: { priceDelta: 150, deliveryDeltaDays: 4 } },
            { id: "strategy", label: "Strategy / RPG", effect: { priceDelta: 350, deliveryDeltaDays: 8 } },
          ],
          defaultOptionId: "casual",
        }),
        toggleField({ id: "leaderboard", label: "Online Leaderboard", effect: { priceDelta: 100, deliveryDeltaDays: 2 } }),
        toggleField({ id: "adsIntegration", label: "Ads Integration", effect: { priceDelta: 75 } }),
        toggleField({ id: "sourceCode", label: "Source Code", effect: { priceDelta: 100 } }),
        expressDeliveryToggle(100),
      ],
    },
    {
      id: "pc-game",
      dbServiceId: "00000000-0000-4000-8000-00000000001c",
      categoryId: "game-development",
      name: "PC Game",
      tagline: "A full-scale desktop title built for Windows/macOS.",
      icon: Monitor,
      pricingModel: "startingFrom",
      startingPrice: 2000,
      baseDeliveryDays: 45,
      configFields: [
        selectField({
          id: "genreComplexity",
          label: "Genre Complexity",
          options: [
            { id: "moderate", label: "Moderate" },
            {
              id: "high",
              label: "High (Open World / RPG)",
              description: "Full commercial-scope open world games should use Custom Order.",
              effect: { priceDelta: 1000, deliveryDeltaDays: 20 },
            },
          ],
          defaultOptionId: "moderate",
        }),
        toggleField({
          id: "multiplayer",
          label: "Multiplayer",
          effect: { priceDelta: 800, deliveryDeltaDays: 14 },
        }),
        toggleField({ id: "controllerSupport", label: "Controller Support", effect: { priceDelta: 150, deliveryDeltaDays: 3 } }),
        toggleField({
          id: "steamIntegration",
          label: "Steam Integration",
          helpText: "Achievements, cloud saves, and Steamworks SDK.",
          effect: { priceDelta: 250, deliveryDeltaDays: 4 },
        }),
        toggleField({ id: "sourceCode", label: "Source Code", effect: { priceDelta: 200 } }),
      ],
    },
    {
      id: "web3-game",
      dbServiceId: "00000000-0000-4000-8000-00000000001d",
      categoryId: "game-development",
      name: "Web3 Game",
      tagline: "A game with on-chain assets and wallet-based ownership.",
      icon: Boxes,
      pricingModel: "startingFrom",
      startingPrice: 1500,
      baseDeliveryDays: 35,
      configFields: [
        toggleField({ id: "walletIntegration", label: "Wallet Integration", defaultOn: true }),
        toggleField({
          id: "smartContract",
          label: "Smart Contract Integration",
          effect: { priceDelta: 500, deliveryDeltaDays: 10 },
        }),
        toggleField({
          id: "nftAssets",
          label: "NFT Asset Integration",
          effect: { priceDelta: 300, deliveryDeltaDays: 7 },
        }),
        toggleField({
          id: "multiplayer",
          label: "Multiplayer",
          effect: { priceDelta: 600, deliveryDeltaDays: 12 },
        }),
        toggleField({
          id: "tokenIntegration",
          label: "Token Integration",
          effect: { priceDelta: 300 },
        }),
        toggleField({
          id: "advancedWalletSystem",
          label: "Advanced Wallet System",
          effect: { priceDelta: 300 },
        }),
      ],
    },
    {
      id: "backend",
      dbServiceId: "00000000-0000-4000-8000-00000000001e",
      categoryId: "game-development",
      name: "Backend",
      tagline: "Server infrastructure to power your game's live features.",
      icon: Server,
      pricingModel: "startingFrom",
      startingPrice: 600,
      baseDeliveryDays: 21,
      configFields: [
        toggleField({ id: "databaseDesign", label: "Database Design", defaultOn: true }),
        toggleField({ id: "authentication", label: "Authentication", effect: { priceDelta: 100, deliveryDeltaDays: 2 } }),
        selectField({
          id: "apiScale",
          label: "API Endpoints",
          options: [
            { id: "small", label: "Up to 10 Endpoints" },
            { id: "medium", label: "Up to 25 Endpoints", effect: { priceDelta: 250, deliveryDeltaDays: 4 } },
            { id: "large", label: "25+ Endpoints", effect: { priceDelta: 500, deliveryDeltaDays: 9 } },
          ],
          defaultOptionId: "small",
        }),
        toggleField({
          id: "realtimeSync",
          label: "Real-time / Multiplayer Sync",
          effect: { priceDelta: 400, deliveryDeltaDays: 8 },
        }),
        expressDeliveryToggle(150),
      ],
    },
    {
      id: "liveops",
      dbServiceId: "00000000-0000-4000-8000-00000000001f",
      categoryId: "game-development",
      name: "LiveOps",
      tagline: "Tools to run, monitor, and tune your game after launch.",
      icon: BarChart3,
      pricingModel: "startingFrom",
      startingPrice: 500,
      baseDeliveryDays: 14,
      configFields: [
        toggleField({ id: "analyticsDashboard", label: "Analytics Dashboard", defaultOn: true }),
        toggleField({ id: "remoteConfig", label: "Remote Config", effect: { priceDelta: 125, deliveryDeltaDays: 2 } }),
        toggleField({ id: "pushNotifications", label: "Push Notifications", effect: { priceDelta: 100, deliveryDeltaDays: 2 } }),
        toggleField({ id: "abTesting", label: "A/B Testing", effect: { priceDelta: 175, deliveryDeltaDays: 3 } }),
        toggleField({ id: "advancedAnalytics", label: "Advanced Analytics", effect: { priceDelta: 150 } }),
      ],
    },
    {
      id: "game-optimization",
      dbServiceId: "00000000-0000-4000-8000-000000000020",
      categoryId: "game-development",
      name: "Game Optimization",
      tagline: "Performance tuning for a smoother, faster-loading game.",
      icon: Gauge,
      pricingModel: "startingFrom",
      startingPrice: 300,
      baseDeliveryDays: 7,
      configFields: [
        selectField({
          id: "platformTarget",
          label: "Platform Target",
          options: [
            { id: "mobile", label: "Mobile" },
            { id: "pc", label: "PC" },
            { id: "console", label: "Console Optimization", effect: { priceDelta: 200, deliveryDeltaDays: 3 } },
          ],
          defaultOptionId: "mobile",
        }),
        toggleField({ id: "profilingReport", label: "Detailed Profiling Report", defaultOn: true }),
        toggleField({ id: "advancedProfiling", label: "Advanced Profiling", effect: { priceDelta: 150 } }),
        toggleField({ id: "memoryOptimization", label: "Memory Optimization", effect: { priceDelta: 100, deliveryDeltaDays: 2 } }),
        expressDeliveryToggle(75),
      ],
    },
  ],
};
