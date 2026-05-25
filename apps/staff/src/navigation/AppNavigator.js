import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen           from '../screens/LoginScreen';
import ScannerScreen         from '../screens/ScannerScreen';
import SearchScreen          from '../screens/SearchScreen';
import MemberScreen          from '../screens/MemberScreen';
import TransactionsScreen    from '../screens/TransactionsScreen';
import AnalyticsScreen       from '../screens/AnalyticsScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  const { staff } = useAuth();
  const isManager = staff?.role === 'manager';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: { borderTopWidth: 0, elevation: 16 },
        tabBarIcon: ({ color }) => {
          const icons = { Scan: '📷', Search: '🔍', Transactions: '📊', Insights: '📈', Business: '🏪' };
          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
        tabBarLabel: ({ color }) => {
          const labels = { Scan: 'Scan', Search: 'Search', Transactions: 'Log', Insights: 'Insights', Business: 'Business' };
          return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{labels[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Scan"         component={ScannerScreen} />
      <Tab.Screen name="Search"       component={SearchScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights"     component={AnalyticsScreen} />
      {isManager && (
        <Tab.Screen name="Business" component={BusinessProfileScreen} />
      )}
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"   component={MainTabs} />
      <Stack.Screen name="Member" component={MemberScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={MainStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
