import { Globe, LayoutTemplate, LayoutDashboard, Settings2, Boxes } from "lucide-react";
import type { CategoryDefinition, ConfigField, ConfigSelectOption, ConfigEffect } from "../../types";
import { countField, toggleField, expressDeliveryToggle } from "../fields";

// Repriced 10 Agst 2026 per "ATURAN PRICING NIMIA STUDIO 2026" brief
// (principle #2: Website Development does NOT use the 3x-production-cost
// rule — prices reflect scope, complexity, value, and market positioning).
// Delivery-day estimates are UNCHANGED from the previous pricing pass — the
// 2026 brief only specified prices. SaaS's Extra Page add-on wasn't listed
// in the 2026 brief; kept at its previous price rather than removed — see
// the repricing summary.
const ADDON_DEFINITIONS: Record<string, { label: string; helpText?: string; effect: ConfigEffect }> = {
  cms: { label: "CMS", helpText: "Manage content without touching code.", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
  dashboard: { label: "Dashboard", helpText: "An internal/admin data dashboard.", effect: { priceDelta: 150, deliveryDeltaDays: 3 } },
  blog: { label: "Blog", effect: { priceDelta: 75, deliveryDeltaDays: 1 } },
  paymentGateway: { label: "Payment Gateway", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
  aiIntegration: { label: "AI Integration", helpText: "AI-assisted features, only where they genuinely help UX.", effect: { priceDelta: 175, deliveryDeltaDays: 2 } },
  multiLanguage: { label: "Multi Language", effect: { priceDelta: 75, deliveryDeltaDays: 1 } },
  roleBasedAccess: { label: "Role-Based Access", effect: { priceDelta: 125, deliveryDeltaDays: 2 } },
  apiIntegration: { label: "Third-Party API Integration", effect: { priceDelta: 150, deliveryDeltaDays: 2 } },
  dataVisualization: { label: "Data Visualization", effect: { priceDelta: 100, deliveryDeltaDays: 2 } },
  auditLog: { label: "Audit Log", effect: { priceDelta: 75, deliveryDeltaDays: 1 } },
  teamManagement: { label: "Team & Role Management", effect: { priceDelta: 200, deliveryDeltaDays: 2 } },
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

const extraPagesField = (pricePerPage = 50) =>
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
      startingPrice: 450,
      baseDeliveryDays: 5,
      configFields: [
        extraPagesField(50),
        addonsField(["multiLanguage", "paymentGateway", "aiIntegration"]),
        expressDeliveryToggle(50),
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
      startingPrice: 700,
      baseDeliveryDays: 7,
      configFields: [
        extraPagesField(50),
        addonsField(["cms", "blog", "multiLanguage", "paymentGateway", "aiIntegration"]),
        expressDeliveryToggle(75),
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
      startingPrice: 1200,
      baseDeliveryDays: 10,
      configFields: [
        extraPagesField(50),
        addonsField(["dataVisualization", "roleBasedAccess", "apiIntegration"]),
        expressDeliveryToggle(100),
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
      startingPrice: 1000,
      baseDeliveryDays: 9,
      configFields: [
        extraPagesField(50),
        addonsField(["roleBasedAccess", "auditLog", "apiIntegration"]),
        expressDeliveryToggle(100),
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
      startingPrice: 2500,
      baseDeliveryDays: 21,
      configFields: [
        // Not listed in the 2026 pricing brief for SaaS — kept at the
        // previous price rather than removed.
        extraPagesField(40),
        addonsField(["paymentGateway", "multiLanguage", "aiIntegration", "teamManagement", "apiIntegration"]),
        toggleField({
          id: "onboardingFlow",
          label: "Guided Onboarding Flow",
          effect: { priceDelta: 100, deliveryDeltaDays: 2 },
        }),
        expressDeliveryToggle(200),
      ],
    },
  ],
};
