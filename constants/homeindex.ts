export const ICONS = {
	DATA: "cellular-outline",
	AIRTIME: "call-outline",
	ELECTRICITY: "flash-outline",
	CABLE: "tv-outline",
	SUPPORT: "headset-outline",
	REFERRAL: "gift-outline",
	EDUCATION: "school-outline",
} as const;

export type IconName = (typeof ICONS)[keyof typeof ICONS];
