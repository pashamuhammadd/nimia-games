import {
  Grid3x3,
  LayoutTemplate,
  Images,
  UserRound,
  Mountain,
  Grid2x2,
  Gem,
  Palette,
  Image as ImageIcon,
  FileImage,
} from "lucide-react";
import type { CategoryDefinition } from "../../types";
import { selectField, toggleField, multiSelectField, sourceFileToggle, expressDeliveryToggle } from "../fields";

// Repriced 10 Agst 2026 per "ATURAN PRICING NIMIA STUDIO 2026" brief
// (principle #3: Digital Assets uses the new baseline prices given in the
// brief directly, not a 3x-cost formula). Delivery-day estimates are
// UNCHANGED from the previous pricing pass — the 2026 brief only specified
// prices, not delivery timelines. Two add-ons the brief didn't mention for
// a given service (UI Kit's and Character Design's Express Delivery) were
// left at their previous price rather than removed — see the repricing
// summary for the full list.
const sourceFileForAssets = (priceDelta = 25) => sourceFileToggle(priceDelta);

export const DIGITAL_ASSETS_CATEGORY: CategoryDefinition = {
  id: "digital-assets",
  name: "Digital Assets",
  tagline: "Ready-to-use art, icons, and UI assets for your project.",
  icon: Grid3x3,
  services: [
    {
      id: "game-icons",
      dbServiceId: "00000000-0000-4000-8000-00000000000a",
      categoryId: "digital-assets",
      name: "Game Icons",
      tagline: "A cohesive icon set for items, skills, or UI.",
      icon: Grid3x3,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "10 Icons", price: 100, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "25 Icons",
          price: 200,
          deliveryDays: 5,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "50 Icons", price: 350, deliveryDays: 7 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "flat", label: "Flat" },
            { id: "3d", label: "3D Render", effect: { priceDelta: 50 } },
            { id: "pixel", label: "Pixel Art" },
          ],
          defaultOptionId: "flat",
        }),
        multiSelectField({
          id: "formats",
          label: "Export Formats",
          options: [
            { id: "png", label: "PNG" },
            { id: "svg", label: "SVG Export", effect: { priceDelta: 20 } },
            { id: "psd-source", label: "PSD / Source File", effect: { priceDelta: 25 } },
          ],
          defaultSelectedIds: ["png"],
        }),
        expressDeliveryToggle(25),
      ],
    },
    {
      id: "ui-kit",
      dbServiceId: "00000000-0000-4000-8000-00000000000b",
      categoryId: "digital-assets",
      name: "UI Kit",
      tagline: "A consistent screen and component library for your app.",
      icon: LayoutTemplate,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "Core Screens", price: 250, deliveryDays: 5 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "Full App",
          price: 450,
          deliveryDays: 8,
          highlight: true,
        },
        {
          id: "pro",
          name: "Pro",
          quantityLabel: "Full App + Design System",
          price: 750,
          deliveryDays: 12,
        },
      ],
      configFields: [
        selectField({
          id: "platform",
          label: "Platform",
          options: [
            { id: "mobile", label: "Mobile" },
            { id: "web", label: "Web" },
            { id: "both", label: "Mobile + Web", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "mobile",
        }),
        toggleField({ id: "darkMode", label: "Dark Mode Variant", effect: { priceDelta: 50, deliveryDeltaDays: 1 } }),
        sourceFileForAssets(25),
        // Not listed in the 2026 pricing brief for UI Kit — kept at the
        // previous price rather than removed.
        expressDeliveryToggle(35),
      ],
    },
    {
      id: "sprite-sheet",
      dbServiceId: "00000000-0000-4000-8000-00000000000c",
      categoryId: "digital-assets",
      name: "Sprite Sheet",
      tagline: "Frame-by-frame sprite sheets ready for any engine.",
      icon: Images,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "1 Character", price: 125, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "3 Characters",
          price: 275,
          deliveryDays: 5,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "6 Characters", price: 500, deliveryDays: 8 },
      ],
      configFields: [
        selectField({
          id: "resolution",
          label: "Resolution",
          options: [
            { id: "sd", label: "Standard (64px)" },
            { id: "hd", label: "HD Resolution (128px)", effect: { priceDelta: 35 } },
          ],
          defaultOptionId: "sd",
        }),
        selectField({
          id: "animationStates",
          label: "Animation States",
          options: [
            { id: "basic", label: "Idle / Walk" },
            {
              id: "extended",
              label: "Additional Animation States (Idle / Walk / Attack / Hurt)",
              effect: { priceDelta: 50, deliveryDeltaDays: 1 },
            },
          ],
          defaultOptionId: "basic",
        }),
        sourceFileForAssets(20),
      ],
    },
    {
      id: "character-design",
      dbServiceId: "00000000-0000-4000-8000-00000000000d",
      categoryId: "digital-assets",
      name: "Character Design",
      tagline: "Original character concept art, front to back.",
      icon: UserRound,
      pricingModel: "startingFrom",
      startingPrice: 175,
      baseDeliveryDays: 5,
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "2d", label: "2D Illustrated" },
            { id: "3d", label: "3D Stylized", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "2d",
        }),
        selectField({
          id: "characterCount",
          label: "Characters",
          options: [
            { id: "1", label: "1 Character" },
            { id: "2", label: "2 Characters", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
            { id: "4", label: "4 Characters", effect: { priceDelta: 425, deliveryDeltaDays: 4 } },
          ],
          defaultOptionId: "1",
        }),
        toggleField({
          id: "turnaroundSheet",
          label: "Turnaround / Concept Sheet",
          helpText: "Front, side, and back reference views.",
          effect: { priceDelta: 50, deliveryDeltaDays: 1 },
        }),
        sourceFileForAssets(25),
        // Not listed in the 2026 pricing brief for Character Design — kept
        // at the previous price rather than removed.
        expressDeliveryToggle(25),
      ],
    },
    {
      id: "environment-assets",
      dbServiceId: "00000000-0000-4000-8000-00000000000e",
      categoryId: "digital-assets",
      name: "Environment Assets",
      tagline: "Backgrounds and scene props for games or animation.",
      icon: Mountain,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "1 Scene", price: 200, deliveryDays: 5 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "3 Scenes",
          price: 500,
          deliveryDays: 8,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "6 Scenes", price: 900, deliveryDays: 12 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "2d", label: "2D" },
            { id: "3d", label: "3D", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "2d",
        }),
        toggleField({
          id: "lightingSetup",
          label: "Complex Lighting",
          effect: { priceDelta: 75, deliveryDeltaDays: 1 },
        }),
        sourceFileForAssets(25),
      ],
    },
    {
      id: "tileset",
      dbServiceId: "00000000-0000-4000-8000-00000000000f",
      categoryId: "digital-assets",
      name: "Tileset",
      tagline: "Seamless tile sets for building your game's world.",
      icon: Grid2x2,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "32 Tiles", price: 125, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "64 Tiles",
          price: 250,
          deliveryDays: 5,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "128 Tiles", price: 450, deliveryDays: 8 },
      ],
      configFields: [
        selectField({
          id: "theme",
          label: "Theme",
          options: [
            { id: "grassland", label: "Grassland" },
            { id: "dungeon", label: "Dungeon" },
            { id: "custom", label: "Custom Theme", effect: { priceDelta: 30 } },
          ],
          defaultOptionId: "grassland",
        }),
        toggleField({ id: "seamlessTiling", label: "Seamless Tiling Verified", defaultOn: true }),
        sourceFileForAssets(25),
      ],
    },
    {
      id: "nft-artwork",
      dbServiceId: "00000000-0000-4000-8000-000000000010",
      categoryId: "digital-assets",
      name: "NFT Artwork",
      tagline: "Layered collectible art, ready for generative traits.",
      icon: Gem,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "10 Artwork", price: 175, deliveryDays: 4 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "50 Artwork",
          price: 600,
          deliveryDays: 8,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "100 Artwork", price: 1000, deliveryDays: 12 },
      ],
      configFields: [
        toggleField({
          id: "traitLayering",
          label: "Trait Layering",
          helpText: "Separated layers for generative combinations.",
          defaultOn: true,
        }),
        toggleField({
          id: "rarityConfig",
          label: "Rarity Configuration",
          effect: { priceDelta: 60, deliveryDeltaDays: 1 },
        }),
        toggleField({
          id: "metadataGeneration",
          label: "Metadata Generation",
          effect: { priceDelta: 50 },
        }),
        sourceFileForAssets(25),
      ],
    },
    {
      id: "illustration",
      dbServiceId: "00000000-0000-4000-8000-000000000011",
      categoryId: "digital-assets",
      name: "Illustration",
      tagline: "Custom illustrations for covers, scenes, or marketing.",
      icon: Palette,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "1 Illustration", price: 80, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "3 Illustrations",
          price: 200,
          deliveryDays: 5,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "6 Illustrations", price: 350, deliveryDays: 8 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "flat", label: "Flat Color" },
            { id: "painted", label: "Painted / Rendered", effect: { priceDelta: 40 } },
          ],
          defaultOptionId: "flat",
        }),
        selectField({
          id: "palette",
          label: "Color Palette",
          options: [
            { id: "vibrant", label: "Vibrant" },
            { id: "muted", label: "Muted" },
            { id: "monochrome", label: "Monochrome" },
          ],
          defaultOptionId: "vibrant",
        }),
        sourceFileForAssets(20),
        expressDeliveryToggle(20),
      ],
    },
    {
      id: "banner",
      dbServiceId: "00000000-0000-4000-8000-000000000012",
      categoryId: "digital-assets",
      name: "Banner",
      tagline: "Web and store banners sized for every placement.",
      icon: ImageIcon,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "3 Sizes", price: 75, deliveryDays: 2 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "6 Sizes",
          price: 135,
          deliveryDays: 3,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "12 Sizes", price: 225, deliveryDays: 5 },
      ],
      configFields: [
        multiSelectField({
          id: "platforms",
          label: "Platforms",
          options: [
            { id: "web", label: "Web" },
            { id: "steam", label: "Steam Store Adaptation", effect: { priceDelta: 20 } },
            { id: "social", label: "Social Media Adaptation", effect: { priceDelta: 20 } },
          ],
          defaultSelectedIds: ["web"],
        }),
        toggleField({
          id: "animatedVersion",
          label: "Animated Version",
          effect: { priceDelta: 50, deliveryDeltaDays: 1 },
        }),
        sourceFileForAssets(20),
      ],
    },
    {
      id: "thumbnail",
      dbServiceId: "00000000-0000-4000-8000-000000000013",
      categoryId: "digital-assets",
      name: "Thumbnail",
      tagline: "Scroll-stopping thumbnails for video and store listings.",
      icon: FileImage,
      pricingModel: "packages",
      packages: [
        { id: "starter", name: "Starter", quantityLabel: "5 Thumbnails", price: 60, deliveryDays: 2 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "10 Thumbnails",
          price: 110,
          deliveryDays: 3,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "20 Thumbnails", price: 190, deliveryDays: 5 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "bold-text", label: "Bold Text + Graphic" },
            { id: "photo-composite", label: "Photo Composite", effect: { priceDelta: 25 } },
          ],
          defaultOptionId: "bold-text",
        }),
        toggleField({
          id: "abVariant",
          label: "A/B Variant Set",
          helpText: "A second alternate version of every thumbnail.",
          effect: { priceDelta: 30 },
        }),
        sourceFileForAssets(20),
        expressDeliveryToggle(15),
      ],
    },
  ],
};
