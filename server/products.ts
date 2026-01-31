/**
 * Stripe Products and Pricing Configuration
 * 
 * This file defines all subscription plans, their Stripe price IDs, and feature limits.
 * Update the Stripe price IDs after creating products in the Stripe Dashboard.
 */

export type SubscriptionTier = "free" | "starter" | "professional" | "business" | "enterprise";

export interface PlanLimits {
  maxProjects: number; // -1 for unlimited
  maxStoragePerProjectGB: number;
  maxTeamMembers: number; // -1 for unlimited
  features: {
    unlimitedUploads: boolean;
    gpsTagging: boolean;
    basicReports: boolean;
    advancedMapControls: boolean;
    markerClustering: boolean;
    allExportFormats: boolean;
    whiteLabeling: boolean;
    clientSharing: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    customReports: boolean;
    roleBasedAccess: boolean;
    dedicatedSupport: boolean;
    customIntegrations: boolean;
    sso: boolean;
    onPremise: boolean;
  };
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  description: string;
  monthlyPriceId: string | null; // Stripe Price ID for monthly billing
  annualPriceId: string | null; // Stripe Price ID for annual billing
  monthlyPrice: number; // Price in dollars
  annualPrice: number; // Price in dollars
  limits: PlanLimits;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxStoragePerProjectGB: 1,
    maxTeamMembers: 1,
    features: {
      unlimitedUploads: false,
      gpsTagging: true,
      basicReports: false,
      advancedMapControls: false,
      markerClustering: false,
      allExportFormats: false,
      whiteLabeling: false,
      clientSharing: false,
      prioritySupport: false,
      apiAccess: false,
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  starter: {
    maxProjects: 5,
    maxStoragePerProjectGB: 10,
    maxTeamMembers: 1,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: false,
      markerClustering: false,
      allExportFormats: false,
      whiteLabeling: false,
      clientSharing: false,
      prioritySupport: false,
      apiAccess: false,
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  professional: {
    maxProjects: -1, // unlimited
    maxStoragePerProjectGB: 50,
    maxTeamMembers: 5,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: false,
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  business: {
    maxProjects: -1, // unlimited
    maxStoragePerProjectGB: 200,
    maxTeamMembers: -1, // unlimited
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      roleBasedAccess: true,
      dedicatedSupport: true,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  enterprise: {
    maxProjects: -1, // unlimited
    maxStoragePerProjectGB: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      roleBasedAccess: true,
      dedicatedSupport: true,
      customIntegrations: true,
      sso: true,
      onPremise: true,
    },
  },
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Try out Mapit with basic features",
    monthlyPriceId: null,
    annualPriceId: null,
    monthlyPrice: 0,
    annualPrice: 0,
    limits: PLAN_LIMITS.free,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individual drone pilots and freelancers",
    // TODO: Replace with actual Stripe Price IDs after creating products in Stripe Dashboard
    monthlyPriceId: "price_starter_monthly",
    annualPriceId: "price_starter_annual",
    monthlyPrice: 49,
    annualPrice: 490,
    limits: PLAN_LIMITS.starter,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For professional drone service providers",
    // TODO: Replace with actual Stripe Price IDs after creating products in Stripe Dashboard
    monthlyPriceId: "price_professional_monthly",
    annualPriceId: "price_professional_annual",
    monthlyPrice: 149,
    annualPrice: 1490,
    limits: PLAN_LIMITS.professional,
  },
  {
    id: "business",
    name: "Business",
    description: "For growing companies and teams",
    // TODO: Replace with actual Stripe Price IDs after creating products in Stripe Dashboard
    monthlyPriceId: "price_business_monthly",
    annualPriceId: "price_business_annual",
    monthlyPrice: 349,
    annualPrice: 3490,
    limits: PLAN_LIMITS.business,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPriceId: null, // Enterprise is custom pricing
    annualPriceId: null,
    monthlyPrice: 0,
    annualPrice: 0,
    limits: PLAN_LIMITS.enterprise,
  },
];

/**
 * Get plan limits for a specific subscription tier
 */
export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
  return PLAN_LIMITS[tier];
}

/**
 * Get subscription plan by tier
 */
export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === tier);
}

/**
 * Check if user has reached project limit
 */
export function hasReachedProjectLimit(currentCount: number, tier: SubscriptionTier): boolean {
  const limits = getPlanLimits(tier);
  if (limits.maxProjects === -1) return false; // unlimited
  return currentCount >= limits.maxProjects;
}

/**
 * Check if user has reached team member limit
 */
export function hasReachedTeamLimit(currentCount: number, tier: SubscriptionTier): boolean {
  const limits = getPlanLimits(tier);
  if (limits.maxTeamMembers === -1) return false; // unlimited
  return currentCount >= limits.maxTeamMembers;
}

/**
 * Check if user has feature access
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: keyof PlanLimits['features']): boolean {
  const limits = getPlanLimits(tier);
  return limits.features[feature];
}
