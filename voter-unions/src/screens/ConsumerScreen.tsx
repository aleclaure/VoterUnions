import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ProposalsTab from './consumer/ProposalsTab';
import VoteLaunchTab from './consumer/VoteLaunchTab';
import ActiveBoycottsTab from './consumer/ActiveBoycottsTab';
import ImpactWinsTab from './consumer/ImpactWinsTab';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

const Tab = createMaterialTopTabNavigator();

export default function ConsumerScreen() {
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
          name="Proposals" 
          component={ProposalsTab}
          options={{ tabBarLabel: 'Proposals' }}
        />
        <Tab.Screen 
          name="VoteLaunch" 
          component={VoteLaunchTab}
          options={{ tabBarLabel: 'Vote &\nLaunch' }}
        />
        <Tab.Screen 
          name="ActiveBoycotts" 
          component={ActiveBoycottsTab}
          options={{ tabBarLabel: 'Active\nBoycotts' }}
        />
        <Tab.Screen 
          name="ImpactWins" 
          component={ImpactWinsTab}
          options={{ tabBarLabel: 'Impact &\nWins' }}
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
