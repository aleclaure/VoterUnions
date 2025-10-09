import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrioritiesTab } from './peoplesagenda/PrioritiesTab';
import { PlatformTab } from './peoplesagenda/PlatformTab';
import { WinsTab } from './peoplesagenda/WinsTab';
import { OutreachTab } from './peoplesagenda/OutreachTab';

const TopTab = createMaterialTopTabNavigator();

export const PeoplesAgendaScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <TopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
            paddingTop: insets.top,
            height: 48 + insets.top,
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#2563eb',
            height: 3,
          },
          tabBarScrollEnabled: false,
          swipeEnabled: true,
        }}
      >
        <TopTab.Screen
          name="Priorities"
          component={PrioritiesTab}
          options={{ tabBarLabel: 'Priorities' }}
        />
        <TopTab.Screen
          name="Platform"
          component={PlatformTab}
          options={{ tabBarLabel: 'Platform' }}
        />
        <TopTab.Screen
          name="Wins"
          component={WinsTab}
          options={{ tabBarLabel: 'Wins' }}
        />
        <TopTab.Screen
          name="Outreach"
          component={OutreachTab}
          options={{ tabBarLabel: 'Outreach' }}
        />
      </TopTab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
