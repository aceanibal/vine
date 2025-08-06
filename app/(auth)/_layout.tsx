import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-wallet" />
      <Stack.Screen name="import-wallet" />
    </Stack>
  );
} 