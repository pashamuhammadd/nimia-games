// Data-driven configuration schema for Step 4 ("Configure Project").
//
// Every service in the catalog (see ../data/catalog.ts) describes its own
// configuration UI purely as a list of ConfigField objects — there is no
// per-service UI code anywhere. ConfigurationBuilder.tsx renders whatever
// fields a service provides by switching on `type` (3 cases, fixed forever),
// never on the service itself. Adding a brand new service — or changing an
// existing one's options/pricing — never touches component code, only the
// data file for that service's category.

/** What selecting an option (or turning a toggle on) does to the estimate. */
export interface ConfigEffect {
  /** Flat dollar amount added to the running subtotal. Negative = discount. */
  priceDelta?: number;
  /** Days added to the running delivery estimate. Negative = faster. */
  deliveryDeltaDays?: number;
  /**
   * Multiplies the running delivery-day total, applied after every field's
   * deltas have been summed. Used for "rush"/express options that shrink
   * the whole timeline proportionally rather than by a fixed day count
   * (e.g. 0.6 = "40% faster") — see data/fields.ts#expressDeliveryToggle.
   */
  deliveryMultiplier?: number;
}

export interface ConfigSelectOption {
  id: string;
  label: string;
  description?: string;
  effect?: ConfigEffect;
}

interface ConfigFieldBase {
  id: string;
  label: string;
  helpText?: string;
}

/** Single-choice, rendered as a row of option chips/cards. */
export interface ConfigSelectField extends ConfigFieldBase {
  type: "select";
  options: ConfigSelectOption[];
  /** Falls back to options[0] if omitted. */
  defaultOptionId?: string;
}

/** On/off switch, rendered as a toggle row. */
export interface ConfigToggleField extends ConfigFieldBase {
  type: "toggle";
  effect?: ConfigEffect;
  defaultOn?: boolean;
}

/** Any number of choices, rendered as a grid of checkable cards. */
export interface ConfigMultiSelectField extends ConfigFieldBase {
  type: "multi-select";
  options: ConfigSelectOption[];
  defaultSelectedIds?: string[];
}

export type ConfigField = ConfigSelectField | ConfigToggleField | ConfigMultiSelectField;
