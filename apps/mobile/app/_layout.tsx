import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0E1A' },
        headerTintColor: '#00D4FF',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#0A0E1A' },
      }}
    />
  );
}
