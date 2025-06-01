export const fullWelcomeText = "Welcome";
export const rotatingTexts = [
	{
		text: "Buy Data, Cable and Internet Subscription 💰💰",
		icon: "access-point-network",
	},
	{
		text: "Seamlessly and Instantly 💨💨💨",
		icon: "flash",
	},
	{
		text: "Get Free 15GB 🎉🎉🎉",
		icon: "gift",
	},
];

export const sections = [
	{
		title: "Account",
		items: [
			// "Edit Profile",
			"Change Password", "Change Email"],
	},
	{
		title: "Preferences",
		items: [
			"Notifications",
			// "Sound",
			"Themes",
			"Fonts",
		],
	},
	{
		title: "Security",
		items: [
			"Authentication",
			"Biometric Login",
			"Two-Factor Authentication",
			"Device Management",
			"Change PIN",
		],
	},
	{
		title: "Billing",
		items: ["Manage Subscriptions", "Payment Methods", "Invoices"],
	},
	{
		title: "Privacy",
		items: [
			// "Data Sharing", "Location Services", "Ad Preferences",
			"Privacy Policy",
			"Terms of Service",
			"User Agreement",
		],
	},
];

export const availableThemes = [
	// "light",
	"dark"];

export const NETWORK_IMAGES: { [key: string]: string } = {
	"9MOBILE": require("../assets/icons/sp-9mobile.jpeg"),
	AIRTEL: require("../assets/icons/sp-airtel-logo.jpeg"),
	GLO: require("../assets/icons/sp-glo_logo.png"),
	MTN: require("../assets/icons/sp-mtn-logo.jpeg"),
};

export const DEFAULT_PROVIDER_IMAGE = require("../assets/images/icon.png");



interface DiscosProvider {
	id: number;
	name: string;
	image: any;
	code: string;
	discoCode: string;
	apiDiscount: number;
}

// Disco providers configuration
export const DISCO_PROVIDERS: DiscosProvider[] = [
	{
		id: 1,
		name: "IKEDC",
		image: "https://asset.brandfetch.io/idOw3g-pG6/idHFnOXwNA.png",
		code: "ikedc",
		discoCode: "ikeja_electric",
		apiDiscount: 97,
	},
	{
		id: 2,
		name: "AEDC",
		image:
			"https://cdn.brandfetch.io/idansu164B/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "aedc",
		discoCode: "abuja_electric",
		apiDiscount: 96,
	},
	{
		id: 3,
		name: "EKEDC",
		image:
			"https://cdn.brandfetch.io/idzLCSOXXk/w/600/h/600/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "ekedc",
		discoCode: "eko_electric",
		apiDiscount: 97,
	},
	{
		id: 4,
		name: "KEDCO",
		image:
			"https://cdn.brandfetch.io/idcsdEcy1X/w/1070/h/1053/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "kedc",
		discoCode: "kano_electric",
		apiDiscount: 96,
	},
	{
		id: 5,
		name: "PHEDC",
		image: "https://phed.com.ng/assets/image001.png",
		code: "phedc",
		discoCode: "portharcourt_electric",
		apiDiscount: 96,
	},
	{
		id: 6,
		name: "LEDC",
		image:
			"https://cdn.brandfetch.io/idzLCSOXXk/w/600/h/600/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "ledc",
		discoCode: "lagos_electric",
		apiDiscount: 96,
	},
	{
		id: 7,
		name: "KAEDC",
		image:
			"https://cdn.brandfetch.io/idOe0sCI5j/w/600/h/523/theme/dark/logo.png?c=1bxideym1bCk82mxFsjUw",
		code: "kaedc",
		discoCode: "kaduna_electric",
		apiDiscount: 96,
	},
	{
		id: 8,
		name: "EEDC",
		image:
			"https://cdn.brandfetch.io/id7rRpOe2k/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "eedc",
		discoCode: "enugu_electric",
		apiDiscount: 96,
	},
	{
		id: 9,
		name: "IBEDC",
		image: "https://www.ibedc.com/assets/img/logo.png",
		code: "ibedc",
		discoCode: "ibadan_electric",
		apiDiscount: 96,
	},
	{
		id: 10,
		name: "JEDC",
		image: "https://asset.brandfetch.io/idjO0Tab3U/id4n6HL2V1.jpeg",
		code: "jedc",
		discoCode: "jos_electric",
		apiDiscount: 96,
	},
	{
		id: 11,
		name: "BEDC",
		image:
			"https://cdn.brandfetch.io/iduapK6_IF/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "bedc",
		discoCode: "benin_electric",
		apiDiscount: 96,
	},
	{
		id: 12,
		name: "YEDC",
		image: "https://www.yedc.com.ng/assets/images/logo.png",
		code: "yedc",
		discoCode: "yola_electric",
		apiDiscount: 96,
	},
];
  

export const CONSTANTS = {
	COLORS: {
		primary: "#D7A77F",
		white: "#ffffff",
		gray: "#d1d5db",
		black: "#000000",
		error: "#EF4444",
		transparent: "transparent",
	},
	TIMING: {
		typewriter: 50, // Faster for better UX
		rotatingText: 4000,
		pulseBase: 1000,
		pulseLogo: 1500,
		pulseButton: 2000,
		buttonDelay: 300,
	},
	DIMENSIONS: {
		logoScale: 0.8, // Optimized size
		borderRadius: 14,
		paddingHorizontal: 24,
		paddingVertical: 60,
		marginTop: 50,
		marginBottom: 40,
		iconSize: 22,
		gap: 16,
	},
	ANIMATIONS: {
		pulseIntensity: 0.03,
		logoIntensity: 0.05,
		buttonIntensity: 0.01,
	},
};

// @/constants/app.ts

import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const COLORS = {
	primary: "#D7A77F",
	secondary: "#8B5E3C",
	white: "#ffffff",
	black: "#000000",
	gray: {
		100: "#f3f4f6",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#1f2937",
		900: "#111827",
	},
	error: "#EF4444",
	success: "#10B981",
	warning: "#F59E0B",
	info: "#3B82F6",
	transparent: "transparent",
} as const;

export const DIMENSIONS = {
	screen: {
		width,
		height,
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		xxl: 24,
		xxxl: 32,
	},
	borderRadius: {
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
	},
	iconSizes: {
		sm: 16,
		md: 20,
		lg: 24,
		xl: 32,
	},
	touchTarget: {
		min: 44, // iOS minimum
		recommended: 48, // Android recommended
	},
} as const;

export const TYPOGRAPHY = {
	fontSizes: {
		xs: 12,
		sm: 14,
		base: 16,
		lg: 18,
		xl: 20,
		"2xl": 24,
		"3xl": 28,
		"4xl": 32,
		"5xl": 36,
	},
	fontWeights: {
		light: "300",
		normal: "400",
		medium: "500",
		semibold: "600",
		bold: "700",
		extrabold: "800",
		black: "900",
	},
	lineHeights: {
		tight: 1.2,
		snug: 1.3,
		normal: 1.5,
		relaxed: 1.6,
		loose: 1.8,
	},
} as const;

export const TIMING = {
	animations: {
		fast: 200,
		normal: 300,
		slow: 500,
		slowest: 800,
	},
	intervals: {
		typewriter: 50,
		rotation: 4000,
		pulse: 1000,
	},
	delays: {
		short: 100,
		medium: 300,
		long: 500,
	},
} as const;

export const ROUTES = {
	welcome: "/",
	signUp: "/sign-up",
	signIn: "/sign-in",
	home: "/home",
	profile: "/profile",
	settings: "/settings",
} as const;

export const HAPTICS = {
	light: "light",
	medium: "medium",
	heavy: "heavy",
	selection: "selection",
	impact: {
		light: "impactLight",
		medium: "impactMedium",
		heavy: "impactHeavy",
	},
} as const;

export const ACCESSIBILITY = {
	roles: {
		button: "button",
		header: "header",
		image: "image",
		text: "text",
		alert: "alert",
		link: "link",
	},
	traits: {
		button: "button",
		header: "header",
		image: "image",
		selected: "selected",
		disabled: "disabled",
	},
} as const;

// Responsive breakpoints
export const BREAKPOINTS = {
	sm: 576,
	md: 768,
	lg: 992,
	xl: 1200,
} as const;

// Animation configuration
export const ANIMATIONS = {
	spring: {
		damping: 15,
		stiffness: 150,
		mass: 1,
	},
	timing: {
		duration: 300,
		easing: "ease-in-out",
	},
	bounce: {
		tension: 180,
		friction: 8,
	},
} as const;

// Network timeouts
export const NETWORK = {
	timeout: 10000,
	retries: 3,
	retryDelay: 1000,
} as const;

// Storage keys
export const STORAGE_KEYS = {
	user: "@user",
	token: "@token",
	settings: "@settings",
	onboarding: "@onboarding_complete",
} as const;

// Development flags
export const DEV_FLAGS = {
	showDebugInfo: __DEV__,
	enableAnalytics: !__DEV__,
	showPerformanceMetrics: __DEV__,
} as const;
