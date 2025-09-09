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
			"Change Password",
			"Change Email",
		],
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
			// "Authentication",
			// "Biometric Login",
			// "Two-Factor Authentication",
			// "Device Management",
			"Change Transaction PIN",
		],
	},
	// {
	// 	title: "Billing",
	// 	items: ["Manage Subscriptions", "Payment Methods", "Invoices"],
	// },
	{
		title: "Privacy",
		items: [
			// "Data Sharing", "Location Services", "Ad Preferences",
			"Privacy Policy",
			"Terms of Service",
			// "User Agreement",
		],
	},
];

export const availableThemes = [
	// "light",
	"dark",
];

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
}

// Disco providers configuration
export const DISCO_PROVIDERS: DiscosProvider[] = [
	{
		id: 1,
		name: "IKEDC",
		image: "https://asset.brandfetch.io/idOw3g-pG6/idHFnOXwNA.png",
		code: "ikedc",
		discoCode: "ikeja_electric",
	},
	{
		id: 2,
		name: "Eko Electricity",
		image:
			"https://cdn.brandfetch.io/idzLCSOXXk/w/600/h/600/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "EKO",
		discoCode: "2",
	},
	{
		id: 3,
		name: "Kano Electricity",
		image:
			"https://cdn.brandfetch.io/idcsdEcy1X/w/1070/h/1053/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "KANO",
		discoCode: "3",
	},
	{
		id: 4,
		name: "Port Harcourt Electricity",
		image: "https://phed.com.ng/assets/image001.png",
		code: "PH",
		discoCode: "4",
	},
	{
		id: 5,
		name: "Jos Electricity",
		image: "https://asset.brandfetch.io/idjO0Tab3U/id4n6HL2V1.jpeg",
		code: "JOS",
		discoCode: "5",
	},
	{
		id: 6,
		name: "Ibadan Electricity",
		image: "https://www.ibedc.com/assets/img/logo.png",
		code: "IBADAN",
		discoCode: "6",
	},
	{
		id: 7,
		name: "Kaduna Electric",
		image:
			"https://cdn.brandfetch.io/idOe0sCI5j/w/600/h/523/theme/dark/logo.png?c=1bxideym1bCk82mxFsjUw",
		code: "KADUNA",
		discoCode: "7",
	},
	{
		id: 8,
		name: "Abuja Electricity",
		image:
			"https://cdn.brandfetch.io/idansu164B/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "ABUJA",
		discoCode: "8",
	},
	{
		id: 9,
		name: "Enugu",
		image:
			"https://cdn.brandfetch.io/id7rRpOe2k/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "ENUGU",
		discoCode: "9",
	},
	{
		id: 10,
		name: "YEDC",
		image: "https://www.yedc.com.ng/assets/images/logo.png",
		code: "YEDC",
		discoCode: "10",
	},
	{
		id: 11,
		name: "BEDC",
		image:
			"https://cdn.brandfetch.io/iduapK6_IF/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
		code: "bedc",
		discoCode: "benin_electric",
	},
];

interface ActionItem {
	title: string;
	icon: IconName;
	color: string;
	route: string;
}

export const actions = [
	{
		title: "Buy Data",
		icon: ICONS.DATA,
		color: "#22C55E",
		route: "../buy" as const,
	},
	{
		title: "Buy Airtime",
		icon: ICONS.AIRTIME,
		color: "#2563EB",
		route: "../airtimeprovider" as const,
	},
	{
		title: "Electricity",
		icon: ICONS.ELECTRICITY,
		color: "#EAB308",
		route: "../electricity" as const,
	},
	{
		title: "Cable TV",
		icon: ICONS.CABLE,
		color: "#3B82F6",
		route: "../cableTv" as const,
	},
	{
		title: "Customer Care",
		icon: ICONS.SUPPORT,
		color: "#3B82F6",
		route: "../Customer" as const,
	},
	// {
	// 	title: "Referral",
	// 	icon: ICONS.REFERRAL,
	// 	color: "#F59E0B",
	// 	route: "../referral" as const,
	// },
] satisfies Array<{
	title: string;
	icon: string;
	color: string;
	route: `/${string}` | `../${string}`;
}>;

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
import { IconName, ICONS } from "./homeindex";

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

// utils/legalTexts.js

export const privacyPolicy = `
Edges Network
Last Updated: July 10, 2025

At Edges Network, developed by Edges Enterprise, your privacy and data protection are of utmost importance to us. This Privacy Policy explains the types of data we collect, how we use it, and your rights regarding your information.
By using our app, you acknowledge and consent to the practices described herein.

1. Consent
By accessing or using the Edges Network mobile application, you agree to this Privacy Policy. If you do not agree with our policies or practices, please do not use the application.

2. Who We Are
Edges Network is a mobile data reselling platform operated by Edges Enterprise, a technology company based in Nigeria. We provide secure, affordable, and fast mobile data services to users across Nigeria.
• 📧 Contact Email: edgesenterprise@outlook.com

3. Information We Collect
We collect personal and technical information to ensure secure transactions and improve your user experience.
a. Personal Information
• UserName
• Phone Number
• Email Address
b. Account and Transaction Information
• Data plan selections and purchase history
• Payment confirmation and status (via Paystack)
• Wallet or top-up activity (if applicable)
c. Device and Usage Information
• Device model and operating system
• Timestamps and frequency of app usage
• Crash logs and app performance data
• General, non-identifiable usage analytics
d. Support and Communication
• When you contact us, we collect message content and any file attachments to resolve your issue effectively.

4. How We Use Your Information
Your information is used to:
• Operate and maintain the Edges Network app
• Process and verify mobile data purchases via Paystack
• Improve app performance and user experience
• Prevent fraud and ensure platform security
• Communicate with you about purchases, updates, or service changes
• Provide responsive customer support

5. Payments and Financial Security
All payments are processed securely through Paystack, a PCI-DSS-compliant payment provider.
Edges Network does not store any card or bank details.

6. Log Files and Technical Data
We may automatically collect technical log data such as:
• IP Address
• Device Type
• Operating System Version
• Time and Date of Usage
This helps with diagnostics, performance monitoring, and improving service reliability.

7. Cookies and Local Storage
While we do not use traditional web cookies, the app may utilize local storage or similar technologies to:
• Remember login sessions
• Save preferences for a smoother user experience

8. Third-Party Services
We collaborate with trusted third-party providers, including:
• Paystack (payment processing)
• API providers (data delivery)
• Analytics providers (for future performance optimization)
Each provider operates under its own privacy policy, and we encourage users to review those separately.

9. Data Protection Rights
We respect your privacy rights under GDPR and other global standards. You have the right to:
• Access: Request a copy of your personal data
• Rectification: Correct inaccurate or incomplete data
• Erasure: Request deletion of your data
• Restriction: Request we limit how we use your data
• Objection: Object to processing under certain conditions
• Portability: Request transfer of your data to another platform
📩 To exercise these rights, contact: edgesenterprise@outlook.com
We respond within 30 days of verified requests.

10. Children’s Privacy
Our services are not intended for children under the age of 13.
We do not knowingly collect personal data from children. If we learn that such data was collected, we will delete it immediately.

11. Updates to This Privacy Policy
We may revise this Privacy Policy periodically to reflect:
• Changes in the app
• Legal or regulatory updates
• Enhancements in data protection practices
You will be notified of major changes via the app or official communication channels.

12. Contact Us
For any privacy-related concerns or questions:
Edges Enterprise
📧 Email: edgesenterprise@outlook.com

© 2025 Edges Network — All Rights Reserved
Developed by Edges Enterprise
`;

export const termsAndConditions = `
Edges Network
Effective Date: July 10, 2025

Welcome to Edges Network, a mobile data reselling platform operated by Edges Enterprise.
These Terms and Conditions govern your access to and use of our mobile application and services.
By accessing or using the platform, you agree to be bound by these Terms.
If you do not agree, do not use our services.

1. About Us
Edges Network is developed and operated by Edges Enterprise, a Nigerian-based technology company offering secure, affordable, and fast mobile data services nationwide.

• 📧 Email: edgesenterprise@outlook.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

2. Acceptance of Terms
By using our platform, you confirm that:
• You are at least 18 years old or have consent from a parent/guardian.
• You have read, understood, and agree to comply with these Terms and our [Privacy Policy].
• You will not use the platform for any unlawful, fraudulent, or unauthorized activities.

3. Description of Services
Edges Network provides users with a seamless way to purchase mobile data bundles via our app.
• Services are currently accessible through a downloadable APK (Google Drive) and will be available on the Google Play Store.
• All payments are processed securely via Paystack.
• A 10% processing fee applies to every deposit to cover operational and transaction costs.

4. Account Registration and Use
By registering an account, you agree to:
• Provide accurate and up-to-date personal information (e.g., username, name, phone number, email).
• Keep your login credentials secure and confidential.
• Accept full responsibility for all activities conducted under your account.

5. Payments and Deposits
• A 10% fee is automatically deducted from deposits.
• We do not store your card or bank details.
• All completed transactions are final and non-refundable.
• Payments are made securely through Paystack.

6. Delivery of Services
• Data bundles are delivered instantly or within a short processing window.
• Delays may occur due to external factors (e.g., network outages).
• Once data is marked as delivered, no refunds, reversals, or compensations will be issued.

7. Prohibited Activities
You agree not to:
• Use the platform for any illegal or unauthorized purpose.
• Resell or redistribute services without written approval.
• Impersonate Edges Network, its team, or other users.
• Upload malicious software or disrupt platform functionality.
• Misrepresent the service or inflate pricing to mislead others.

8. Data Privacy and Security
• We collect only essential data for service delivery (e.g., contact and transaction information).
• All payment data is handled by Paystack, a PCI-DSS-compliant provider.
• Technical and usage data may be collected to improve platform performance.

9. Third-Party Services
We may integrate with third-party providers including:
• Paystack – for secure payment processing
• Telecom APIs – for data delivery
• Analytics tools (future use) – for app monitoring
Each third-party operates under its own terms and privacy policies. We are not liable for their service disruptions but will assist in resolving major issues.

10. Suspension and Termination
We reserve the right to suspend or terminate your account at any time without notice or explanation.
This may result in:
• Loss of wallet balance and access to services.
• Deletion of your account and associated data.
• Withholding of any pending service delivery.
You waive any right to dispute such actions. Continued use of the platform implies full acceptance of this clause.

11. User Liability
You are financially and legally liable for any damage, fraud, or misuse tied to your account. This includes:
• Reputational or financial damage caused to Edges Network or its users.
• Misleading or overpricing our services to other users.
• Operating a resale business without written approval from Edges Enterprise.

12. No Guarantees or Refunds
• All services are provided “as-is” and “as-available”.
• We do not guarantee uninterrupted service or exact delivery times.
• Once a transaction is completed and service is delivered, no refunds or replacements will be issued.

13. Indemnification
You agree to indemnify and hold harmless Edges Enterprise, its affiliates, subsidiaries, sub-subsidiaries and employees against any claims, damages, losses, or legal expenses arising from:
• Your use or misuse of the platform
• Your violation of these Terms
• Your infringement of third-party rights

14. Children’s Privacy
Our platform is not intended for children under 13. We do not knowingly collect data from minors. If such data is identified, it will be permanently deleted.

15. Changes to Terms
We may update these Terms periodically. All updates will be posted in the app or sent via official channels. Continued use of the platform indicates your acceptance of the latest version.

16. Governing Law
These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled under the jurisdiction of Nigerian courts.

17. Contact Us
For support or inquiries:
• 📧 Email: edgesenterprise@outlook.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

© 2025 Edges Network — All Rights Reserved
Developed by Edges Enterprise
`;
