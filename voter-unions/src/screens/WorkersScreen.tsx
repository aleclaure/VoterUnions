import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WorkerProposalsTab from './workers/WorkerProposalsTab';
import OrganizeVoteTab from './workers/OrganizeVoteTab';
import ActiveStrikesTab from './workers/ActiveStrikesTab';
import OutcomesSolidarityTab from './workers/OutcomesSolidarityTab';

const Tab = createMaterialTopTabNavigator();

export default function WorkersScreen() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          tabBarIndicatorStyle: { backgroundColor: '#2563eb', height: 3 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'none' },
          tabBarStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
        }}
      >
        <Tab.Screen 
          name="WorkerProposals" 
          component={WorkerProposalsTab}
          options={{ tabBarLabel: '📋 Worker Proposals' }}
        />
        <Tab.Screen 
          name="OrganizeVote" 
          component={OrganizeVoteTab}
          options={{ tabBarLabel: '✊ Organize & Vote' }}
        />
        <Tab.Screen 
          name="ActiveStrikes" 
          component={ActiveStrikesTab}
          options={{ tabBarLabel: '🪧 Active Strikes' }}
        />
        <Tab.Screen 
          name="OutcomesSolidarity" 
          component={OutcomesSolidarityTab}
          options={{ tabBarLabel: '🏆 Outcomes & Solidarity' }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
