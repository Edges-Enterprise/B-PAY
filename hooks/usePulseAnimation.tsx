// hooks/usePulseAnimation.js
import { useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

export default function usePulseAnimation(scaleTo = 1.05, duration = 1000) {
	const scale = useSharedValue(1);
	scale.value = withRepeat(
		withSequence(
			withTiming(scaleTo, { duration }),
			withTiming(1, { duration })
		),
		-1,
		true
	);
	return scale;
}
