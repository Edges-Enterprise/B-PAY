import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Optional: smooth fade transition
        presentation: 'transparentModal', // 👈 important change here
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="(auth)/signup" 
      />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signin" />
    </Stack>
  );
}
