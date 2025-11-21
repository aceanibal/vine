import { Briefcase, UserCircle, Send, Repeat } from 'lucide-react-native';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFFFFF', // celadon
        tabBarInactiveTintColor: '#FFFFFF80', // white/50
        tabBarStyle: {
          height: 60,
          paddingBottom: 4,
          paddingTop: 4,
          backgroundColor: '#225D7C', // lapis-lazuli
          borderTopWidth: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => (
            <Briefcase size={24} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
          tabBarIcon: ({ color }) => (
            <Send size={24} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color }) => (
            <Repeat size={24} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <UserCircle size={24} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          href: null, // This hides the tab from the bottom navigation
        }}
      />

    </Tabs>
  );
} 