import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthScreen      from '../screens/AuthScreen';
import HomeScreen      from '../screens/HomeScreen';
import QRScreen        from '../screens/QRScreen';
import BusinessesScreen from '../screens/BusinessesScreen';
import HistoryScreen   from '../screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: { borderTopWidth: 0, elevation: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16 },
        tabBarLabel: ({ color }) => {
          const labels = { Home: 'Home', QR: 'My QR', Businesses: 'Businesses', History: 'History' };
          return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{labels[route.name]}</Text>;
        },
        tabBarIcon: ({ color }) => {
          const icons = { Home: '🏠', QR: '📱', Businesses: '🏪', History: '📜' };
          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="QR"         component={QRScreen} />
      <Tab.Screen name="Businesses" component={BusinessesScreen} />
      <Tab.Screen name="History"    component={HistoryScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={Tabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
