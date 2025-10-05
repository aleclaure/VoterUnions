import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthScreen } from '../screens/AuthScreen';
import { UnionsScreen } from '../screens/UnionsScreen';
import { DebatesScreen } from '../screens/DebatesScreen';
import { VoteScreen } from '../screens/VoteScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { useAuth } from '../hooks/useAuth';
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
        name="Unions"
        component={UnionsScreen}
        options={{
          tabBarLabel: 'Unions',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏛️</Text>,
        }}
      />
      <Tab.Screen
        name="Debates"
        component={DebatesScreen}
        options={{
          tabBarLabel: 'Debates',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Vote"
        component={VoteScreen}
        options={{
          tabBarLabel: 'Vote',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗳️</Text>,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
