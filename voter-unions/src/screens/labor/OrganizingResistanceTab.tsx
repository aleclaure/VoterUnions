import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

/**
 * TODO: SECURITY - When implementing user-generated content:
 * 1. Import sanitization functions: stripHtml, sanitizeUrl from '../lib/inputSanitization'
 * 2. Sanitize ALL user text inputs before database insert (title, description, etc.)
 * 3. Sanitize ALL URLs before database insert (sourceLink, evidenceUrl, etc.)
 * 4. Reference CorporateInfluenceTab.tsx for complete sanitization pattern
 * 5. Apply sanitization at BOTH component-level AND hook-level (defense in depth)
 */

export default function OrganizingResistanceTab() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Organizing & Resistance</Text>
          <Text style={styles.headerSubtitle}>Union drives, strikes, and grassroots organizing</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🏗️ Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>Strike maps, local campaigns, and union support</Text>
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
