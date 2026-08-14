import {
  Sparkles,
  Users,
  Gamepad2,
  Film,
  BookOpen,
  Wand2,
  AppWindow,
  Zap,
  MessageCircle,
} from "lucide-react";
import type { CategoryDefinition } from "../../types";
import {
  selectField,
  toggleField,
  countField,
  expressDeliveryToggle,
  sourceFileToggle,
  voiceOverToggle,
} from "../fields";

// Repriced 10 Agst 2026 per "ATURAN PRICING NIMIA STUDIO 2026" brief.
// Animation + GIF/Sticker pricing here targets ~3x internal production cost
// (per the brief's principle #1) — the numbers below are the studio's
// final retail/individual-order prices, not the raw cost basis. Bundles are
// intentionally NOT part of this pass (see FEATURED_PACKAGES in
// app/services/data.ts, which will get its own package pass later).
//
// Delivery-day estimates (baseDeliveryDays / deliveryDeltaDays) are
// UNCHANGED from the previous pricing pass except where a service's tier
// structure itself changed shape (Game Animation and Logo Animation moved
// to a 3-tier "packages" model, replacing what used to be independent
// duration/style selects) — those specific numbers are carried over from
// the closest equivalent old option and flagged in the repricing summary,
// since the 2026 brief only specified prices, not delivery timelines.
const charactersField = (pricePerExtra: number) =>
  countField({
    id: "characters",
    label: "Characters",
    min: 1,
    max: 4,
    unitLabel: "Character",
    included: 1,
    pricePerExtraUnit: pricePerExtra,
    deliveryDaysPerExtraUnit: 1,
  });

const backgroundField = (priceDelta = 40) =>
  selectField({
    id: "background",
    label: "Background",
    options: [
      { id: "standard", label: "Standard" },
      { id: "complex", label: "Complex Background", effect: { priceDelta, deliveryDeltaDays: 1 } },
    ],
    defaultOptionId: "standard",
  });

export const ANIMATION_CATEGORY: CategoryDefinition = {
  id: "animation",
  name: "Animation",
  tagline: "Bring characters, brands, and stories to life in motion.",
  icon: Film,
  services: [
    {
      id: "gif-sticker",
      dbServiceId: "00000000-0000-4000-8000-000000000001",
      categoryId: "animation",
      name: "GIF / Sticker",
      tagline: "Loopable animated GIFs and sticker packs.",
      icon: Sparkles,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "5 GIF", price: 125, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "10 GIF",
          price: 225,
          deliveryDays: 4,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "20 GIF", price: 400, deliveryDays: 6 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "flat", label: "Flat" },
            { id: "detailed", label: "Detailed Style", effect: { priceDelta: 25 } },
          ],
          defaultOptionId: "flat",
        }),
        selectField({
          id: "backgroundType",
          label: "Background",
          options: [
            { id: "transparent", label: "Transparent" },
            { id: "custom", label: "Custom Background", effect: { priceDelta: 20 } },
          ],
          defaultOptionId: "transparent",
        }),
        sourceFileToggle(15),
        expressDeliveryToggle(25),
      ],
    },
    {
      id: "character-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000002",
      categoryId: "animation",
      name: "Character Animation",
      tagline: "Expressive rigged character performance for any scene.",
      icon: Users,
      pricingModel: "startingFrom",
      startingPrice: 75,
      baseDeliveryDays: 3,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "10", label: "10 sec" },
            { id: "20", label: "20 sec", effect: { priceDelta: 75, deliveryDeltaDays: 1 } },
            { id: "30", label: "30 sec", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "10",
        }),
        charactersField(35),
        backgroundField(40),
        voiceOverToggle(35, 1),
        toggleField({ id: "soundDesign", label: "Sound Design", effect: { priceDelta: 20 } }),
        expressDeliveryToggle(30),
        sourceFileToggle(20),
      ],
    },
    {
      id: "game-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000003",
      categoryId: "animation",
      name: "Game Animation",
      tagline: "Idle, walk, attack, and combo cycles ready to import.",
      icon: Gamepad2,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "1 Character, Basic Movement", price: 150, deliveryDays: 4 },
        { id: "standard", name: "Standard", quantityLabel: "Movement + Attack (Combat)", price: 225, deliveryDays: 4 },
        {
          id: "pro",
          name: "Pro",
          quantityLabel: "Idle + Walk + Run + Attack + Hurt/Death (Full Set)",
          price: 325,
          deliveryDays: 6,
        },
      ],
      configFields: [
        charactersField(60),
        selectField({
          id: "exportFormat",
          label: "Export Format",
          options: [
            { id: "sprite-sheet", label: "Sprite Sheet" },
            { id: "skeletal", label: "Skeletal Rig", effect: { priceDelta: 40 } },
          ],
          defaultOptionId: "sprite-sheet",
        }),
        toggleField({
          id: "complexAnimation",
          label: "Complex Animation",
          helpText: "Extra complexity beyond the selected package's standard scope.",
          effect: { priceDelta: 75 },
        }),
        sourceFileToggle(20),
        expressDeliveryToggle(30),
      ],
    },
    {
      id: "trailer",
      dbServiceId: "00000000-0000-4000-8000-000000000004",
      categoryId: "animation",
      name: "Trailer",
      tagline: "Cinematic trailers for games, apps, and launches.",
      icon: Film,
      pricingModel: "startingFrom",
      startingPrice: 300,
      baseDeliveryDays: 7,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "30", label: "15–30 sec" },
            { id: "60", label: "60 sec", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
            { id: "90", label: "90 sec", effect: { priceDelta: 400, deliveryDeltaDays: 4 } },
          ],
          defaultOptionId: "30",
        }),
        voiceOverToggle(40, 1),
        toggleField({
          id: "musicLicensing",
          label: "Licensed Music Track",
          helpText: "Cleared background music track for public release.",
          effect: { priceDelta: 35 },
        }),
        toggleField({
          id: "subtitles",
          label: "Subtitles",
          effect: { priceDelta: 20 },
        }),
        toggleField({
          id: "complexCinematicScene",
          label: "Complex Cinematic Scene",
          effect: { priceDelta: 100 },
        }),
        expressDeliveryToggle(75),
      ],
    },
    {
      id: "story-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000005",
      categoryId: "animation",
      name: "Story Animation",
      tagline: "Narrative short-form animation with multiple scenes.",
      icon: BookOpen,
      pricingModel: "startingFrom",
      startingPrice: 200,
      baseDeliveryDays: 6,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "15", label: "Up to 15 sec" },
            { id: "30", label: "30 sec", effect: { priceDelta: 125, deliveryDeltaDays: 2 } },
            // 60 sec is a new bucket beyond the previous 30-sec ceiling — its
            // +5 day estimate extrapolates the old +10sec:+1day pace rather
            // than being carried from an existing option; flagged in the
            // repricing summary.
            { id: "60", label: "60 sec", effect: { priceDelta: 350, deliveryDeltaDays: 5 } },
          ],
          defaultOptionId: "15",
        }),
        charactersField(50),
        backgroundField(50),
        voiceOverToggle(40, 1),
        sourceFileToggle(20),
      ],
    },
    {
      id: "motion-graphic",
      dbServiceId: "00000000-0000-4000-8000-000000000006",
      categoryId: "animation",
      name: "Motion Graphic",
      tagline: "Kinetic type and graphic motion for ads and intros.",
      icon: Wand2,
      pricingModel: "startingFrom",
      startingPrice: 100,
      baseDeliveryDays: 4,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "10", label: "Up to 10 sec" },
            { id: "20", label: "20 sec", effect: { priceDelta: 75, deliveryDeltaDays: 1 } },
            { id: "30", label: "30 sec", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "10",
        }),
        selectField({
          id: "styleIntensity",
          label: "Style",
          options: [
            { id: "minimal", label: "Minimal" },
            { id: "bold", label: "Advanced Style", effect: { priceDelta: 40 } },
          ],
          defaultOptionId: "minimal",
        }),
        voiceOverToggle(30, 1),
        sourceFileToggle(20),
        expressDeliveryToggle(30),
      ],
    },
    {
      id: "ui-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000007",
      categoryId: "animation",
      name: "UI Animation",
      tagline: "Micro-interactions and screen transitions for apps.",
      icon: AppWindow,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "Basic Interaction, 1 Screen", price: 100, deliveryDays: 3 },
        { id: "standard", name: "Standard", quantityLabel: "3 Screens", price: 175, deliveryDays: 5 },
        { id: "pro", name: "Pro", quantityLabel: "5 Screens", price: 275, deliveryDays: 7 },
      ],
      configFields: [
        countField({
          id: "additionalScreens",
          label: "Additional Screens",
          helpText: "Extra screens beyond the selected package.",
          min: 0,
          max: 5,
          unitLabel: "Screen",
          included: 0,
          pricePerExtraUnit: 40,
          defaultCount: 0,
        }),
        toggleField({
          id: "advancedInteraction",
          label: "Advanced Interaction",
          effect: { priceDelta: 50, deliveryDeltaDays: 1 },
        }),
        sourceFileToggle(20),
        expressDeliveryToggle(30),
      ],
    },
    {
      id: "logo-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000008",
      categoryId: "animation",
      name: "Logo Animation",
      tagline: "A signature motion reveal for your brand mark.",
      icon: Zap,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "Basic Reveal", price: 75, deliveryDays: 2 },
        { id: "standard", name: "Standard", quantityLabel: "Advanced Reveal", price: 110, deliveryDays: 3 },
        { id: "pro", name: "Pro", quantityLabel: "Premium / 3D Style", price: 150, deliveryDays: 4 },
      ],
      configFields: [
        toggleField({ id: "soundDesign", label: "Sound Design", effect: { priceDelta: 20 } }),
        sourceFileToggle(15),
        expressDeliveryToggle(20),
      ],
    },
    {
      id: "explainer-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000009",
      categoryId: "animation",
      name: "Explainer Animation",
      tagline: "Clear, friendly animation that explains your product.",
      icon: MessageCircle,
      pricingModel: "startingFrom",
      startingPrice: 250,
      baseDeliveryDays: 6,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "15", label: "15 sec" },
            { id: "30", label: "30 sec", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
            // 60 sec is a new bucket beyond the previous 30-sec ceiling —
            // same +5 day extrapolation note as Story Animation above.
            { id: "60", label: "60 sec", effect: { priceDelta: 450, deliveryDeltaDays: 5 } },
          ],
          defaultOptionId: "15",
        }),
        toggleField({
          id: "scriptWriting",
          label: "Script Writing",
          helpText: "Our team writes the narration script for you.",
          effect: { priceDelta: 50, deliveryDeltaDays: 1 },
        }),
        voiceOverToggle(40, 1),
        charactersField(40),
        toggleField({
          id: "complexScene",
          label: "Complex Scene",
          effect: { priceDelta: 50 },
        }),
        sourceFileToggle(20),
        // Note: the 2026 pricing brief's Explainer Animation section does not
        // list an Express Delivery price (unlike every other Animation
        // service) — kept at its previous $25 default rather than removed,
        // pending confirmation from the studio.
        expressDeliveryToggle(25),
      ],
    },
  ],
};
