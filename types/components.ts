// types/components.ts
import { SharedValue } from "react-native-reanimated";

export interface RotatingTextProps {
	current: {
		icon: string;
		text: string;
	};
	textIndex: number;
	texts: RotatingTextItem[];
	interval?: number;
}
  
  export interface ButtonsProps {
		handleNavigation: (
			route: "/sign-in" | "/sign-up",
			actionType: "signup" | "signin",
		) => void;
		buttonScale: SharedValue<number>;
	}
  
export interface RotatingTextItem {
  text: string;
  icon: string;
}

