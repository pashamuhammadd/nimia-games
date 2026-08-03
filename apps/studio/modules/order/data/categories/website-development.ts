import { Globe, LayoutTemplate, LayoutDashboard, Settings2, Boxes } from "lucide-react";
import type { CategoryDefinition, ConfigField, ConfigSelectOption, ConfigEffect } from "../../types";
import { countField, toggleField, expressDeliveryToggle } from "../fields";

// Shared building block across every Website Development service, matching
// the brief's example configuration set (Extra Pages, CMS, Dashboard, Blog,
// Payment Gateway, AI Integration, Multi Language) — each service picks
// whichever subset of ADDON toggles actually applies to it via `include`,
// instead of every service redefining its own copy of these fields.
const ADDON_DEFINITIONS: Record<string, { label: string; helpText?: string; effect: ConfigEffect }> = {
  cms: { label: "CMS", helpText: "Manage content without touching code.", effect: { priceDelta: 90, deliveryDeltaDays: 2 } },
  dashboard: { label: "Dashboard", helpText: "An internal/admin data dashboard.", effect: { priceDelta: 150, deliveryDeltaDays: 3 } },
  blog: { label: "Blog", effect: { priceDelta: 60, deliveryDeltaDays: 1 } },
  paymentGateway: { label: "Payment Gateway", effect: { priceDelta: 120, deliveryDeltaDays: 2 } },
  aiIntegration: { label: "AI Integration", helpText: "AI-assisted features, only where they genuinely help UX.", effect: { priceDelta: 140, deliveryDeltaDays: 2 } },
  multiLanguage: { label: "Multi Language", effect: { priceDelta: 70, deliveryDeltaDays: 1 } },
  roleBasedAccess: { label: "Role-Based Access", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
  apiIntegration: { label: "Third-Party API Integration", effect: { priceDelta: 110, deliveryDeltaDays: 2 } },
  dataVisualization: { label: "Data Visualization", effect: { priceDelta: 90, deliveryDeltaDays: 2 } },
  auditLog: { label: "Audit Log", effect: { priceDelta: 60, deliveryDeltaDays: 1 } },
  teamManagement: { label: "Team & Role Management", effect: { priceDelta: 130, deliveryDeltaDays: 2 } },
};

function addonsField(include: (keyof typeof ADDON_DEFINITIONS)[]): ConfigField {
  const options: ConfigSelectOption[] = include.map((key) => ({
    id: key,
    label: ADDON_DEFINITIONS[key].label,
    description: ADDON_DEFINITIONS[key].helpText,
    effect: ADDON_DEFINITIONS[key].effect,
  }));
  return {
    type: "multi-select",
    id: "addons",
    label: "Add-ons",
    options,
    defaultSelectedIds: [],
  };
}

const extraPagesField = (pricePerPage = 30) =>
  countField({
    id: "extraPages",
    label: "Extra Pages",
    min: 0,
    max: 5,
    unitLabel: "Extra Page",
    included: 0,
    pricePerExtraUnit: pricePerPage,
    deliveryDaysPerExtraUnit: 1,
    defaultCount: 0,
  });

export const WEBSITE_DEVELOPMENT_CATEGORY: CategoryDefinition = {
  id: "website-development",
  name: "Website Development",
  tagline: "Fast, modern, and responsive websites built to scale.",
  icon: Globe,
  services: [
    {
      id: "landing-page",
      dbServiceId: "00000000-0000-4000-8000-000000000014",
      categoryId: "website-development",
      name: "Landing Page",
      tagline: "A single, high-converting page for a launch or campaign.",
      icon: LayoutTemplate,
      pricingModel: "startingFrom",
      startingPrice: 150,
      baseDeliveryDays: 5,
      configFields: [
        extraPagesField(25),
        addonsField(["multiLanguage", "paymentGateway", "aiIntegration"]),
        expressDeliveryToggle(),
      ],
    },
    {
      id: "company-website",
      dbServiceId: "00000000-0000-4000-8000-000000000015",
      categoryId: "website-development",
      name: "Company Website",
      tagline: "A complete, professional site for your business.",
      icon: Globe,
      pricingModel: "startingFrom",
      startingPrice: 250,
      baseDeliveryDays: 7,
      configFields: [
        extraPagesField(30),
        addonsField(["cms", "blog", "multiLanguage", "paymentGateway", "aiIntegration"]),
        expressDeliveryToggle(),
      ],
    },
    {
      id: "dashboard",
      dbServiceId: "00000000-0000-4000-8000-000000000016",
      categoryId: "website-development",
      name: "Dashboard",
      tagline: "A data dashboard for monitoring and managing operations.",
      icon: LayoutDashboard,
      pricingModel: "startingFrom",
      startingPrice: 400,
      baseDeliveryDays: 10,
      configFields: [
        extraPagesField(35),
        addonsField(["dataVisualization", "roleBasedAccess", "apiIntegration"]),
        expressDeliveryToggle(60),
      ],
    },
    {
      id: "admin-panel",
      dbServiceId: "00000000-0000-4000-8000-000000000017",
      categoryId: "website-development",
      name: "Admin Panel",
      tagline: "Internal tooling to manage your product's data and users.",
      icon: Settings2,
      pricingModel: "startingFrom",
      startingPrice: 350,
      baseDeliveryDays: 9,
      configFields: [
        extraPagesField(30),
        addonsField(["roleBasedAccess", "auditLog", "apiIntegration"]),
        expressDeliveryToggle(60),
      ],
    },
    {
      id: "saas",
      dbServiceId: "00000000-0000-4000-8000-000000000018",
      categoryId: "website-development",
      name: "SaaS",
      tagline: "A full multi-tenant product, from onboarding to billing.",
      icon: Boxes,
      pricingModel: "startingFrom",
      startingPrice: 800,
      baseDeliveryDays: 21,
      configFields: [
        extraPagesField(40),
        addonsField(["paymentGateway", "multiLanguage", "aiIntegration", "teamManagement", "apiIntegration"]),
        toggleField({
          id: "onboardingFlow",
          label: "Guided Onboarding Flow",
          effect: { priceDelta: 90, deliveryDeltaDays: 2 },
        }),
        expressDeliveryToggle(120),
      ],
    },
  ],
};
