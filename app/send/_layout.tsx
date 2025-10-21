import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function SendLayout() {
  return (
    <View style={{ flex: 1, paddingBottom: 20, backgroundColor: '#4F7D96' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="address" />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="authorize" />
        <Stack.Screen name="active-transaction" />
      </Stack>
    </View>
  );
}

