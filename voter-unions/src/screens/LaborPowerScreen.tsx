import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CorporateExploitationTab from './labor/CorporateExploitationTab';
import OrganizingResistanceTab from './labor/OrganizingResistanceTab';
import WorkerRightsTab from './labor/WorkerRightsTab';
import SolidarityVictoriesTab from './labor/SolidarityVictoriesTab';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

const Tab = createMaterialTopTabNavigator();

export default function LaborPowerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <EmailVerificationBanner />
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
          name="CorporateExploitation" 
          component={CorporateExploitationTab}
          options={{ tabBarLabel: 'Corporate\nExploitation' }}
        />
        <Tab.Screen 
          name="OrganizingResistance" 
          component={OrganizingResistanceTab}
          options={{ tabBarLabel: 'Organizing &\nResistance' }}
        />
        <Tab.Screen 
          name="WorkerRights" 
          component={WorkerRightsTab}
          options={{ tabBarLabel: 'Worker\nRights' }}
        />
        <Tab.Screen 
          name="SolidarityVictories" 
          component={SolidarityVictoriesTab}
          options={{ tabBarLabel: 'Solidarity &\nVictories' }}
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
