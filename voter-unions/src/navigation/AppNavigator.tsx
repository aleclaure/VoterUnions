import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PowerTrackerScreen } from '../screens/PowerTrackerScreen';
import { VoteScreen } from '../screens/VoteScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { UnionDetailScreen } from '../screens/UnionDetailScreen';
import { CreateUnionScreen } from '../screens/CreateUnionScreen';
import { DebateDetailScreen } from '../screens/DebateDetailScreen';
import { CreateDebateScreen } from '../screens/CreateDebateScreen';
import { CandidateDetailScreen } from '../screens/CandidateDetailScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { UnionsTabNavigator } from './UnionsTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Text } from 'react-native';

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
        name="VoteTab"
        component={VoteScreen}
        options={{
          tabBarLabel: 'Vote',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗳️</Text>,
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
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
  const { user, isLoading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: profileLoading } = useProfile();

  if (authLoading || (user && profileLoading)) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
