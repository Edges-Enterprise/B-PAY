import { View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useRef } from "react";
import { useRouter, usePathname } from "expo-router";

export default function SwipeWrapper({ children, scrollViewRef, flatListRef }) {
  const router = useRouter();
  const pathname = usePathname();
  const swipeThreshold = 100; // Minimum swipe distance to trigger tab switch
  const gestureX = useRef(0);

  // Define circular tab order
  const tabOrder = ["wallet", "buy", "index", "history", "settings"];

  // Normalize pathname for matching
  const normalizedPathname = pathname.replace(/^\/\(app\)\/\(protected\)\//, "/").replace(/^\/+/, "/");
  // console.log(`Normalized pathname: ${normalizedPathname}`);

  // Get current tab index based on normalized pathname
  const currentTabIndex = tabOrder.findIndex((tab) => {
    const tabPath = tab === "index" ? "/" : `/${tab}`;
    const matches = normalizedPathname === tabPath || normalizedPathname.startsWith(`${tabPath}/`);
    // console.log(`Checking tab: ${tab}, tabPath: ${tabPath}, matches: ${matches}`);
    return matches;
  });

  // console.log(`Current tab index: ${currentTabIndex}, pathname: ${pathname}`);

  const onGestureEvent = ({ nativeEvent }) => {
    gestureX.current = nativeEvent.translationX;
  };

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      const swipeDistance = gestureX.current;

      // console.log(
      //   `Swipe detected: distance=${swipeDistance}, currentTabIndex=${currentTabIndex}, pathname=${pathname}`
      // );

      if (Math.abs(swipeDistance) > swipeThreshold && currentTabIndex !== -1) {
        let nextTabIndex;
        if (swipeDistance < 0) {
          // Swipe left: go to next tab
          nextTabIndex = (currentTabIndex + 1) % tabOrder.length;
        } else {
          // Swipe right: go to previous tab
          nextTabIndex = (currentTabIndex - 1 + tabOrder.length) % tabOrder.length;
        }

        const nextTab = tabOrder[nextTabIndex];
        const targetPath = nextTab === "index" ? "/(app)/(protected)/" : `/(app)/(protected)/${nextTab}`;
        // console.log(
        //   `Navigating from ${tabOrder[currentTabIndex]} to ${nextTab} (index ${nextTabIndex}, path ${targetPath})`
        // );

        router.push(targetPath);
      } else {
        console.log(
          `Swipe ignored: distance=${swipeDistance}, currentTabIndex=${currentTabIndex}`
        );
      }
      gestureX.current = 0; // Reset swipe distance
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-10, 10]} // Trigger after 10px horizontal movement
      failOffsetY={[-15, 15]} // Prevent swipe during vertical scrolling
      simultaneousHandlers={[scrollViewRef, flatListRef].filter(Boolean)}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </PanGestureHandler>
  );
}