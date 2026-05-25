import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import AuthScreen         from '../screens/AuthScreen';
import OnboardingScreen  from '../screens/OnboardingScreen';
import HomeScreen        from '../screens/HomeScreen';
import QRScreen          from '../screens/QRScreen';
import DealsScreen       from '../screens/DealsScreen';
import BusinessesScreen  from '../screens/BusinessesScreen';
import HistoryScreen     from '../screens/HistoryScreen';
import EditProfileScreen      from '../screens/EditProfileScreen';
import BusinessDetailScreen  from '../screens/BusinessDetailScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function Tabs() {
  const { postOnboardingTab, clearPostOnboardingTab } = useAuth();
  const initialTab = postOnboardingTab || 'Home';

  // Clear the flag after the navigator mounts so back-navigation works normally
  React.useEffect(() => {
    if (postOnboardingTab) clearPostOnboardingTab();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: { borderTopWidth: 0, elevation: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16 },
        tabBarLabel: ({ color }) => {
          const labels = { Home: 'Home', QR: 'My QR', Deals: 'Deals', History: 'History' };
          return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{labels[route.name]}</Text>;
        },
        tabBarIcon: ({ color }) => {
          const icons = { Home: '🏠', QR: '📱', Deals: '🏷️', History: '📜' };
          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="QR"      component={QRScreen} />
      <Tab.Screen name="Deals"   component={DealsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

function GuestSignInButton() {
  const { exitGuest } = useAuth();
  return (
    <TouchableOpacity onPress={exitGuest} style={{ marginRight: 16 }}>
      <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 15 }}>Sign In</Text>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  const { token, isGuest, loading, showOnboarding } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            {showOnboarding && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Main"           component={Tabs} />
            <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
            <Stack.Screen name="Businesses"     component={BusinessesScreen} />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} options={{ headerShown: false }} />
          </>
        ) : isGuest ? (
          <>
            <Stack.Screen
              name="Guest"
              component={BusinessesScreen}
              options={{
                headerShown: true,
                title: 'Partner Businesses',
                headerRight: () => <GuestSignInButton />,
                headerStyle: { backgroundColor: '#F5F7F5' },
                headerTitleStyle: { color: '#1B4332', fontWeight: '800' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
