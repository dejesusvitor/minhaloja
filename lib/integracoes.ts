export type ProviderId = "instagram" | "whatsapp";

export const PROVIDERS: Record<ProviderId, { label: string; scopes: string[] }> = {
  instagram: {
    label: "Instagram",
    scopes: ["instagram_basic", "instagram_manage_messages", "pages_show_list", "pages_manage_metadata"],
  },
  whatsapp: {
    label: "WhatsApp Business",
    scopes: ["whatsapp_business_management", "whatsapp_business_messaging", "business_management"],
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value === "instagram" || value === "whatsapp";
}

export function metaCredenciaisConfiguradas() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}
