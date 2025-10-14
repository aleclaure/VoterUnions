import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WorkerProposalsTab from './workers/WorkerProposalsTab';
import OrganizeVoteTab from './workers/OrganizeVoteTab';
import ActiveStrikesTab from './workers/ActiveStrikesTab';
import OutcomesSolidarityTab from './workers/OutcomesSolidarityTab';

const Tab = createMaterialTopTabNavigator();

export default function WorkersScreen() {
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
          tabBarItemStyle: { width: 'auto' },
        }}
      >
        <Tab.Screen 
          name="WorkerProposals" 
          component={WorkerProposalsTab}
          options={{ tabBarLabel: 'Worker\nProposals' }}
        />
        <Tab.Screen 
          name="OrganizeVote" 
          component={OrganizeVoteTab}
          options={{ tabBarLabel: 'Organize\n& Vote' }}
        />
        <Tab.Screen 
          name="ActiveStrikes" 
          component={ActiveStrikesTab}
          options={{ tabBarLabel: 'Active\nStrikes' }}
        />
        <Tab.Screen 
          name="OutcomesSolidarity" 
          component={OutcomesSolidarityTab}
          options={{ tabBarLabel: 'Outcomes\n& Solidarity' }}
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
