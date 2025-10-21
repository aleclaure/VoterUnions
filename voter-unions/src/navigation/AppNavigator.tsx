import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PowerTrackerScreen } from '../screens/PowerTrackerScreen';
import { PeoplesAgendaScreen } from '../screens/PeoplesAgendaScreen';
import { NegotiationsScreen } from '../screens/NegotiationsScreen';
import ConsumerScreen from '../screens/ConsumerScreen';
import WorkersScreen from '../screens/WorkersScreen';
import CorporatePowerScreen from '../screens/CorporatePowerScreen';
import LaborPowerScreen from '../screens/LaborPowerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { UnionDetailScreen } from '../screens/UnionDetailScreen';
import { CreateUnionScreen } from '../screens/CreateUnionScreen';
import { DebateDetailScreen } from '../screens/DebateDetailScreen';
import { CreateDebateScreen } from '../screens/CreateDebateScreen';
import { CandidateDetailScreen } from '../screens/CandidateDetailScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { UnionsTabNavigator } from './UnionsTabNavigator';
import { SessionManager } from '../components/SessionManager';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Text } from 'react-native';
import { CONFIG } from '../config';
import { DeviceRegisterScreen } from '../screens/DeviceRegisterScreen';
import { DeviceLoginScreen } from '../screens/DeviceLoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tab.Screen
        name="UnionsTab"
        component={UnionsTabNavigator}
        options={{
          tabBarLabel: 'Unions',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏛️</Text>,
        }}
      />
      <Tab.Screen
        name="PowerTrackerTab"
        component={PowerTrackerScreen}
        options={{
          tabBarLabel: 'Power',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="AgendaTab"
        component={PeoplesAgendaScreen}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤝</Text>,
        }}
      />
      <Tab.Screen
        name="NegotiationsTab"
        component={NegotiationsScreen}
        options={{
          tabBarLabel: 'Terms',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚖️</Text>,
        }}
      />
      <Tab.Screen
        name="ConsumerTab"
        component={ConsumerScreen}
        options={{
          tabBarLabel: 'Consumer',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="WorkersTab"
        component={WorkersScreen}
        options={{
          tabBarLabel: 'Workers',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚒️</Text>,
        }}
      />
      <Tab.Screen
        name="CorporatePowerTab"
        component={CorporatePowerScreen}
        options={{
          tabBarLabel: 'Corporate',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏢</Text>,
        }}
      />
      <Tab.Screen
        name="LaborPowerTab"
        component={LaborPowerScreen}
        options={{
          tabBarLabel: 'Labor',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✊</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="UnionDetail" component={UnionDetailScreen} />
      <Stack.Screen name="CreateUnion" component={CreateUnionScreen} />
      <Stack.Screen name="DebateDetail" component={DebateDetailScreen} />
      <Stack.Screen name="CreateDebate" component={CreateDebateScreen} />
      <Stack.Screen name="CandidateDetail" component={CandidateDetailScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading: authLoading, hasDeviceKeypair, canAutoLogin } = useAuth();
  const { needsOnboarding, isLoading: profileLoading } = useProfile();

  if (authLoading || (user && profileLoading)) {
    return null;
  }

  // Determine which authentication screen to show
  const getAuthScreen = () => {
    if (CONFIG.USE_DEVICE_AUTH) {
      // Device Token Auth: Show register or login based on keypair existence
      if (hasDeviceKeypair || canAutoLogin()) {
        return <Stack.Screen name="DeviceLogin" component={DeviceLoginScreen} />;
      } else {
        return <Stack.Screen name="DeviceRegister" component={DeviceRegisterScreen} />;
      }
    } else {
      // Traditional Supabase Auth
      return <Stack.Screen name="Auth" component={AuthScreen} />;
    }
  };

  return (
    <NavigationContainer>
      {/* Session manager must be inside NavigationContainer to access navigation */}
      <SessionManager />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          getAuthScreen()
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
