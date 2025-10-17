import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function SolidarityVictoriesTab() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Solidarity & Victories</Text>
          <Text style={styles.headerSubtitle}>Celebrate worker successes and cross-movement collaboration</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🏗️ Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>Contract wins, wage increases, and solidarity stories</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  placeholder: { padding: 48, alignItems: 'center' },
  placeholderText: { fontSize: 24, color: '#6b7280' },
  placeholderSubtext: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
});
