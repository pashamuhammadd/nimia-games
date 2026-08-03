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

// All prices/timelines below are placeholder starting points (per the
// brief: "Semua harga untuk sementara hardcode. Nanti akan dipindahkan ke
// database.") — easy to retune later since every number lives here and
// nowhere else.
const durationField = (defaultsSeconds = 10) =>
  selectField({
    id: "duration",
    label: "Duration",
    options: [
      { id: "10", label: "10 sec" },
      { id: "20", label: "20 sec", effect: { priceDelta: 60, deliveryDeltaDays: 1 } },
      { id: "30", label: "30 sec", effect: { priceDelta: 130, deliveryDeltaDays: 2 } },
    ],
    defaultOptionId: String(defaultsSeconds),
  });

const backgroundField = () =>
  selectField({
    id: "background",
    label: "Background",
    options: [
      { id: "standard", label: "Standard" },
      { id: "complex", label: "Complex", effect: { priceDelta: 40, deliveryDeltaDays: 1 } },
    ],
    defaultOptionId: "standard",
  });

const charactersField = (pricePerExtra = 45) =>
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
        { id: "starter", name: "Starter", quantityLabel: "5 GIF", price: 100, deliveryDays: 3 },
        {
          id: "standard",
          name: "Standard",
          quantityLabel: "10 GIF",
          price: 180,
          deliveryDays: 4,
          highlight: true,
        },
        { id: "pro", name: "Pro", quantityLabel: "20 GIF", price: 320, deliveryDays: 6 },
      ],
      configFields: [
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "flat", label: "Flat" },
            { id: "detailed", label: "Detailed", effect: { priceDelta: 25 } },
          ],
          defaultOptionId: "flat",
        }),
        selectField({
          id: "backgroundType",
          label: "Background",
          options: [
            { id: "transparent", label: "Transparent" },
            { id: "custom", label: "Custom", effect: { priceDelta: 15 } },
          ],
          defaultOptionId: "transparent",
        }),
        sourceFileToggle(10),
        expressDeliveryToggle(20),
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
      startingPrice: 100,
      baseDeliveryDays: 3,
      configFields: [
        durationField(10),
        charactersField(45),
        backgroundField(),
        voiceOverToggle(),
        expressDeliveryToggle(),
        sourceFileToggle(),
      ],
    },
    {
      id: "game-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000003",
      categoryId: "animation",
      name: "Game Animation",
      tagline: "Idle, walk, attack, and combo cycles ready to import.",
      icon: Gamepad2,
      pricingModel: "startingFrom",
      startingPrice: 150,
      baseDeliveryDays: 4,
      configFields: [
        selectField({
          id: "motionType",
          label: "Primary Motion Type",
          options: [
            { id: "idle-walk", label: "Idle / Walk" },
            { id: "combat", label: "Combat / Attack", effect: { priceDelta: 40 } },
            { id: "full-set", label: "Full Motion Set", effect: { priceDelta: 90, deliveryDeltaDays: 2 } },
          ],
          defaultOptionId: "idle-walk",
        }),
        selectField({
          id: "exportFormat",
          label: "Export Format",
          options: [
            { id: "sprite-sheet", label: "Sprite Sheet" },
            { id: "skeletal", label: "Skeletal Rig", effect: { priceDelta: 30 } },
          ],
          defaultOptionId: "sprite-sheet",
        }),
        charactersField(50),
        sourceFileToggle(),
        expressDeliveryToggle(),
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
            { id: "30", label: "30 sec" },
            { id: "60", label: "60 sec", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
            { id: "90", label: "90 sec", effect: { priceDelta: 320, deliveryDeltaDays: 4 } },
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
        expressDeliveryToggle(50),
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
        durationField(20),
        charactersField(40),
        backgroundField(),
        voiceOverToggle(35, 1),
        sourceFileToggle(),
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
      startingPrice: 120,
      baseDeliveryDays: 4,
      configFields: [
        durationField(10),
        selectField({
          id: "styleIntensity",
          label: "Style",
          options: [
            { id: "minimal", label: "Minimal" },
            { id: "bold", label: "Bold & Dynamic", effect: { priceDelta: 30 } },
          ],
          defaultOptionId: "minimal",
        }),
        voiceOverToggle(25, 1),
        sourceFileToggle(),
        expressDeliveryToggle(),
      ],
    },
    {
      id: "ui-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000007",
      categoryId: "animation",
      name: "UI Animation",
      tagline: "Micro-interactions and screen transitions for apps.",
      icon: AppWindow,
      pricingModel: "startingFrom",
      startingPrice: 90,
      baseDeliveryDays: 3,
      configFields: [
        countField({
          id: "screens",
          label: "Number of Screens",
          min: 1,
          max: 5,
          unitLabel: "Screen",
          included: 1,
          pricePerExtraUnit: 25,
          deliveryDaysPerExtraUnit: 1,
        }),
        selectField({
          id: "complexity",
          label: "Complexity",
          options: [
            { id: "simple", label: "Simple" },
            { id: "advanced", label: "Advanced", effect: { priceDelta: 35, deliveryDeltaDays: 1 } },
          ],
          defaultOptionId: "simple",
        }),
        sourceFileToggle(),
        expressDeliveryToggle(),
      ],
    },
    {
      id: "logo-animation",
      dbServiceId: "00000000-0000-4000-8000-000000000008",
      categoryId: "animation",
      name: "Logo Animation",
      tagline: "A signature motion reveal for your brand mark.",
      icon: Zap,
      pricingModel: "startingFrom",
      startingPrice: 60,
      baseDeliveryDays: 2,
      configFields: [
        selectField({
          id: "duration",
          label: "Duration",
          options: [
            { id: "5", label: "5 sec" },
            { id: "10", label: "10 sec", effect: { priceDelta: 20 } },
            { id: "15", label: "15 sec", effect: { priceDelta: 40, deliveryDeltaDays: 1 } },
          ],
          defaultOptionId: "5",
        }),
        selectField({
          id: "style",
          label: "Style",
          options: [
            { id: "2d", label: "2D" },
            { id: "3d", label: "3D", effect: { priceDelta: 35, deliveryDeltaDays: 1 } },
          ],
          defaultOptionId: "2d",
        }),
        toggleField({ id: "soundDesign", label: "Sound Design", effect: { priceDelta: 15 } }),
        sourceFileToggle(),
        expressDeliveryToggle(15),
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
        durationField(20),
        toggleField({
          id: "scriptWriting",
          label: "Script Writing",
          helpText: "Our team writes the narration script for you.",
          effect: { priceDelta: 45, deliveryDeltaDays: 1 },
        }),
        voiceOverToggle(35, 1),
        charactersField(35),
        expressDeliveryToggle(),
      ],
    },
  ],
};
