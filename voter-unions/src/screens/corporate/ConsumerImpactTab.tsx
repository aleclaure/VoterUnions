import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function ConsumerImpactTab() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Consumer Impact</Text>
          <Text style={styles.headerSubtitle}>How corporate practices affect prices and quality of life</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🏗️ Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>Price fixing, monopolies, junk fees, and inflation profiteering</Text>
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
