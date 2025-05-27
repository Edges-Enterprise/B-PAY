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
		items: ["Edit Profile", "Change Password", "Change Email"],
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
	{ title: "Share the App" },
	{
		title: "Privacy",
		items: [
			// "Data Sharing", "Location Services", "Ad Preferences",
			"Terms of Service",
			"User Agreement",
			"Privacy Policy",
		],
	},
];

export const availableThemes = ["light", "dark"];

export const NETWORK_IMAGES: { [key: string]: string } = {
	"9MOBILE": "https://example.com/9mobile.png",
	AIRTEL: "https://example.com/airtel.png",
	GLO: "https://example.com/glo.png",
	MTN: "https://example.com/mtn.png",
};

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
