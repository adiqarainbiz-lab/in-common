import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen       from '../screens/LoginScreen';
import ScannerScreen     from '../screens/ScannerScreen';
import MemberScreen      from '../screens/MemberScreen';
import TransactionsScreen from '../screens/TransactionsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="Member"  component={MemberScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { staff, logout } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: { borderTopWidth: 0, elevation: 16 },
        tabBarIcon: ({ color }) => {
          const icons = { Scan: '📷', Transactions: '📊' };
          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
        tabBarLabel: ({ color }) => {
          const labels = { Scan: 'Scan', Transactions: 'Log' };
          return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{labels[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Scan"         component={ScanStack} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
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
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
