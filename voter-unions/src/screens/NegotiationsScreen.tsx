import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProposalsTab } from './negotiations/ProposalsTab';
import { VotingHallTab } from './negotiations/VotingHallTab';
import { RatifiedTermsTab } from './negotiations/RatifiedTermsTab';
import { ActivatedDemandsTab } from './negotiations/ActivatedDemandsTab';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

const Tab = createMaterialTopTabNavigator();

export const NegotiationsScreen = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <EmailVerificationBanner />
      <View style={styles.header}>
        <Text style={styles.title}>People's Terms</Text>
        <Text style={styles.subtitle}>We set the terms — not the billionaires.</Text>
      </View>

      <Tab.Navigator
        initialRouteName="Proposals"
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#64748b',
          tabBarIndicatorStyle: {
            backgroundColor: '#2563eb',
            height: 3,
          },
          tabBarStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarItemStyle: {
            width: width / 4,
          },
        }}
      >
        <Tab.Screen 
          name="Proposals" 
          component={ProposalsTab}
          options={{
            tabBarLabel: 'Proposals',
          }}
        />
        <Tab.Screen 
          name="Voting" 
          component={VotingHallTab}
          options={{
            tabBarLabel: 'Voting Hall',
          }}
        />
        <Tab.Screen 
          name="Ratified" 
          component={RatifiedTermsTab}
          options={{
            tabBarLabel: 'Ratified',
          }}
        />
        <Tab.Screen 
          name="Activated" 
          component={ActivatedDemandsTab}
          options={{
            tabBarLabel: 'Activated',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

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
