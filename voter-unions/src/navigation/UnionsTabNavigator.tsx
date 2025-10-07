import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AllPostsScreen } from '../screens/AllPostsScreen';
import { MyUnionsScreen } from '../screens/MyUnionsScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';

const Tab = createMaterialTopTabNavigator();

export const UnionsTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarIndicatorStyle: {
          backgroundColor: '#2563eb',
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        },
      }}
    >
      <Tab.Screen
        name="AllPosts"
        component={AllPostsScreen}
        options={{ tabBarLabel: 'All Posts' }}
      />
      <Tab.Screen
        name="MyUnions"
        component={MyUnionsScreen}
        options={{ tabBarLabel: 'My Unions' }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
    </Tab.Navigator>
  );
};
