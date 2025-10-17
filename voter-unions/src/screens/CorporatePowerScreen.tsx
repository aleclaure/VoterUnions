import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CorporateInfluenceTab from './corporate/CorporateInfluenceTab';
import ConsumerImpactTab from './corporate/ConsumerImpactTab';
import WorkerImpactTab from './corporate/WorkerImpactTab';
import CorporateAccountabilityTab from './corporate/CorporateAccountabilityTab';

const Tab = createMaterialTopTabNavigator();

export default function CorporatePowerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          tabBarIndicatorStyle: { backgroundColor: '#2563eb', height: 3 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', textTransform: 'none', textAlign: 'center' },
          tabBarStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
        }}
      >
        <Tab.Screen 
          name="CorporateInfluence" 
          component={CorporateInfluenceTab}
          options={{ tabBarLabel: 'Corporate\nInfluence' }}
        />
        <Tab.Screen 
          name="ConsumerImpact" 
          component={ConsumerImpactTab}
          options={{ tabBarLabel: 'Consumer\nImpact' }}
        />
        <Tab.Screen 
          name="WorkerImpact" 
          component={WorkerImpactTab}
          options={{ tabBarLabel: 'Worker\nImpact' }}
        />
        <Tab.Screen 
          name="CorporateAccountability" 
          component={CorporateAccountabilityTab}
          options={{ tabBarLabel: 'Corporate\nAccountability' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
