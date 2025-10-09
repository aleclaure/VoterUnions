import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PoliticiansTab } from './powertracker/PoliticiansTab';
import { BillsTab } from './powertracker/BillsTab';
import { DataTab } from './powertracker/DataTab';
import { ActionTab } from './powertracker/ActionTab';

const TopTab = createMaterialTopTabNavigator();

export const PowerTrackerScreen = () => {
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
          name="Politicians"
          component={PoliticiansTab}
          options={{ tabBarLabel: 'Politicians' }}
        />
        <TopTab.Screen
          name="Bills"
          component={BillsTab}
          options={{ tabBarLabel: 'Bills' }}
        />
        <TopTab.Screen
          name="Data"
          component={DataTab}
          options={{ tabBarLabel: 'Data' }}
        />
        <TopTab.Screen
          name="Action"
          component={ActionTab}
          options={{ tabBarLabel: 'Action' }}
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
