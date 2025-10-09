import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ProposalsTab from './consumer/ProposalsTab';
import VoteLaunchTab from './consumer/VoteLaunchTab';
import ActiveBoycottsTab from './consumer/ActiveBoycottsTab';
import ImpactWinsTab from './consumer/ImpactWinsTab';

const Tab = createMaterialTopTabNavigator();

export default function ConsumerScreen() {
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
          name="Proposals" 
          component={ProposalsTab}
          options={{ tabBarLabel: '🛍️ Proposals' }}
        />
        <Tab.Screen 
          name="VoteLaunch" 
          component={VoteLaunchTab}
          options={{ tabBarLabel: '🗳️ Vote & Launch' }}
        />
        <Tab.Screen 
          name="ActiveBoycotts" 
          component={ActiveBoycottsTab}
          options={{ tabBarLabel: '🚫 Active' }}
        />
        <Tab.Screen 
          name="ImpactWins" 
          component={ImpactWinsTab}
          options={{ tabBarLabel: '🏆 Impact' }}
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
