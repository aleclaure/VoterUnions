import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ProposalsTab from './consumer/ProposalsTab';
import VoteLaunchTab from './consumer/VoteLaunchTab';
import ActiveBoycottsTab from './consumer/ActiveBoycottsTab';
import ImpactWinsTab from './consumer/ImpactWinsTab';

const Tab = createMaterialTopTabNavigator();

export default function ConsumerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Consumer Union</Text>
        <Text style={styles.subtitle}>Every purchase is a political act.</Text>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});
