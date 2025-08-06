import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="currency-exchange" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: 'Transfer',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="send" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="account-details"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="buy"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
    </Tabs>
  );
} 