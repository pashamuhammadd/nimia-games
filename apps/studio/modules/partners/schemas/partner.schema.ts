import { z } from "zod";
import { REFERRAL_CODE_CHARSET, REFERRAL_CODE_LENGTH } from "../utils/generate-referral-code";

const partnerLevelSchema = z.enum(["bronze", "silver", "gold", "platinum"]);

/**
 * Runtime shape of a `Partner` (see ../types/partner.ts). Not wired into
 * anything yet — kept here so that once the repository talks to a real
 * `partners` table, the service layer can `.parse()`/`.safeParse()`
 * incoming rows instead of trusting them blindly, without inventing a new
 * schema at that point.
 */
export const partnerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  referralCode: z
    .string()
    .length(REFERRAL_CODE_LENGTH)
    .regex(new RegExp(`^[${REFERRAL_CODE_CHARSET}]+$`)),
  referralLink: z.string().url(),
  referralCount: z.number().int().min(0),
  paidClientsCount: z.number().int().min(0),
  currentLevel: partnerLevelSchema,
  commissionRate: z.number().min(0).max(1),
  isFoundingPartner: z.boolean(),
  foundingPartnerNumber: z.number().int().min(1).optional(),
  rewardBalance: z.object({
    pendingUsd: z.number().min(0),
    availableUsd: z.number().min(0),
    lifetimeUsd: z.number().min(0),
  }),
  createdAt: z.string(),
});

export type PartnerSchemaValues = z.infer<typeof partnerSchema>;
