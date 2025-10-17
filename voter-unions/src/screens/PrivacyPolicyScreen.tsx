import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export const PrivacyPolicyScreen: React.FC = () => {
  const handleEmailPress = () => {
    Linking.openURL('mailto:privacy@voterunions.org');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ BEFORE PRODUCTION LAUNCH</Text>
        <Text style={styles.warningText}>
          This privacy policy is GDPR-ready but requires the following real information before public
          release:{'\n'}
          • Legal entity postal address{'\n'}
          • EU representative details (if applicable){'\n'}
          • Data Protection Officer (if required){'\n'}
        </Text>
      </View>

      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.lastUpdated}>Last Updated: October 17, 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Data Controller Information</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Data Controller:{'\n'}</Text>
          Voter Unions, Inc.{'\n'}
          [Address to be determined]{'\n'}
          United States{'\n'}
          {'\n'}
          <Text style={styles.bold}>Contact:{'\n'}</Text>
          Email:{' '}
          <Text style={styles.link} onPress={handleEmailPress}>
            privacy@voterunions.org
          </Text>
          {'\n'}
          {'\n'}
          <Text style={styles.bold}>EU Representative:{'\n'}</Text>
          [To be appointed if processing targets EU residents - Article 27 GDPR]{'\n'}
          {'\n'}
          <Text style={styles.bold}>Data Protection Officer:{'\n'}</Text>
          [To be appointed if required]{'\n'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Introduction</Text>
        <Text style={styles.paragraph}>
          Voter Unions ("we," "our," or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when you use
          our mobile application, in compliance with the General Data Protection Regulation (GDPR) and
          other applicable privacy laws.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>2.1 Information You Provide</Text>
        <Text style={styles.paragraph}>
          • Account Information: Email address, display name, username, bio, and profile picture{'\n'}
          • User-Generated Content: Posts, comments, debates, arguments, policy proposals, union
          descriptions, and other content you create{'\n'}
          • Voting Data: Your votes on proposals, debates, and policies{'\n'}
          • Pledges and Actions: Political pledges, boycott participation, and strike coordination
        </Text>

        <Text style={styles.subsectionTitle}>2.2 Automatically Collected Information</Text>
        <Text style={styles.paragraph}>
          • Device Information: Device identifiers for vote tracking and security{'\n'}
          • Usage Data: App interactions, features used, and session duration{'\n'}
          • Authentication Data: Login attempts, session timestamps, and verification status
        </Text>

        <Text style={styles.subsectionTitle}>2.3 Information We Do NOT Collect</Text>
        <Text style={styles.paragraph}>
          • Location data{'\n'}
          • Contacts or phone numbers{'\n'}
          • Third-party social media profiles{'\n'}
          • Biometric data{'\n'}
          • Financial information
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. How We Use Your Information and Lawful Bases</Text>
        <Text style={styles.paragraph}>
          We process your personal data based on the following lawful grounds under Article 6 GDPR:
        </Text>

        <Text style={styles.subsectionTitle}>4.1 Contract Performance (Article 6(1)(b))</Text>
        <Text style={styles.paragraph}>
          Processing necessary to provide the service you signed up for:{'\n'}
          • Create and maintain your account{'\n'}
          • Enable posting, commenting, and participation{'\n'}
          • Process votes and democratic actions{'\n'}
          • Deliver in-app features and functionality
        </Text>

        <Text style={styles.subsectionTitle}>4.2 Legitimate Interests (Article 6(1)(f))</Text>
        <Text style={styles.paragraph}>
          Processing necessary for our legitimate interests or those of third parties:{'\n'}
          • Prevent fraud and duplicate voting (legitimate interest: platform integrity){'\n'}
          • Improve app functionality and user experience (legitimate interest: service quality){'\n'}
          • Enforce community guidelines (legitimate interest: user safety){'\n'}
          • Maintain security and prevent abuse (legitimate interest: security)
        </Text>

        <Text style={styles.subsectionTitle}>4.3 Consent (Article 6(1)(a))</Text>
        <Text style={styles.paragraph}>
          Processing based on your explicit consent:{'\n'}
          • Send optional notifications and updates{'\n'}
          • Display public profile information you choose to share
        </Text>

        <Text style={styles.subsectionTitle}>4.4 Legal Obligation (Article 6(1)(c))</Text>
        <Text style={styles.paragraph}>
          Processing required to comply with legal obligations:{'\n'}
          • Respond to lawful requests from authorities{'\n'}
          • Maintain records for tax and regulatory purposes{'\n'}
          • Comply with court orders and legal processes
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Data Sharing and Disclosure</Text>
        
        <Text style={styles.subsectionTitle}>4.1 Public Information</Text>
        <Text style={styles.paragraph}>
          The following information is publicly visible within the app:{'\n'}
          • Display name and username{'\n'}
          • Profile bio and picture{'\n'}
          • Posts, comments, and debates{'\n'}
          • Union memberships (if union is public){'\n'}
          • Vote counts (aggregated, not individual votes)
        </Text>

        <Text style={styles.subsectionTitle}>4.2 Private Information</Text>
        <Text style={styles.paragraph}>
          The following information is kept private:{'\n'}
          • Email address{'\n'}
          • Individual vote choices{'\n'}
          • Device identifiers{'\n'}
          • Private union content
        </Text>

        <Text style={styles.subsectionTitle}>4.3 Third-Party Service Providers</Text>
        <Text style={styles.paragraph}>
          We use Supabase (hosted in the United States) for:{'\n'}
          • Authentication and user management{'\n'}
          • Database hosting{'\n'}
          • File storage{'\n'}
          {'\n'}
          Supabase processes data according to their privacy policy and industry-standard security
          practices.
        </Text>

        <Text style={styles.subsectionTitle}>4.4 Legal Requirements</Text>
        <Text style={styles.paragraph}>
          We may disclose your information if required by law, court order, or to protect our rights,
          property, or safety.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Your Rights (GDPR & Privacy Laws)</Text>
        <Text style={styles.paragraph}>
          You have the following rights regarding your personal data:
        </Text>

        <Text style={styles.subsectionTitle}>5.1 Right to Access</Text>
        <Text style={styles.paragraph}>
          You can request a copy of all personal data we hold about you. Use the "Export My Data"
          feature in your profile settings.
        </Text>

        <Text style={styles.subsectionTitle}>5.2 Right to Rectification</Text>
        <Text style={styles.paragraph}>
          You can update your profile information, display name, bio, and email address at any time
          through your profile settings.
        </Text>

        <Text style={styles.subsectionTitle}>5.3 Right to Erasure ("Right to be Forgotten")</Text>
        <Text style={styles.paragraph}>
          You can request permanent deletion of your account and all associated data. This action is
          irreversible. Use the "Delete Account" feature in your profile settings.
        </Text>

        <Text style={styles.subsectionTitle}>5.4 Right to Data Portability</Text>
        <Text style={styles.paragraph}>
          You can download your data in JSON format using the "Export My Data" feature.
        </Text>

        <Text style={styles.subsectionTitle}>5.5 Right to Restrict Processing</Text>
        <Text style={styles.paragraph}>
          You can request that we limit how we use your data by contacting us at{' '}
          <Text style={styles.link} onPress={handleEmailPress}>
            privacy@voterunions.org
          </Text>
        </Text>

        <Text style={styles.subsectionTitle}>5.6 Right to Object</Text>
        <Text style={styles.paragraph}>
          You can object to certain data processing activities. Contact us to exercise this right.
        </Text>

        <Text style={styles.subsectionTitle}>5.7 Right to Withdraw Consent</Text>
        <Text style={styles.paragraph}>
          You can withdraw consent for email communications or delete your account at any time.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          • Active Accounts: Data is retained while your account is active{'\n'}
          • Soft Deletes: Some content may be soft-deleted (hidden but recoverable for 30 days){'\n'}
          • Hard Deletes: Account deletion permanently removes all personal data within 30 days{'\n'}
          • Legal Holds: We may retain data longer if required by law or legal process
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures:{'\n'}
          • Encryption in transit (HTTPS/TLS){'\n'}
          • Encryption at rest for sensitive data{'\n'}
          • Secure token storage using hardware-backed encryption{'\n'}
          • Row-level security policies on database{'\n'}
          • XSS protection and input sanitization{'\n'}
          • Rate limiting to prevent abuse{'\n'}
          • Email verification for critical actions{'\n'}
          • Regular security audits and dependency scanning
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for users under 16 years of age. We do not knowingly collect
          personal information from children under 16. If we discover we have collected data from a
          child under 16, we will delete it immediately.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
        
        <Text style={styles.subsectionTitle}>10.1 Transfer to United States</Text>
        <Text style={styles.paragraph}>
          Your data is transferred to and processed in the United States, where our service provider
          (Supabase) operates servers. The United States may not provide the same level of data
          protection as the European Economic Area (EEA).
        </Text>

        <Text style={styles.subsectionTitle}>10.2 Transfer Safeguards (Article 46 GDPR)</Text>
        <Text style={styles.paragraph}>
          We ensure adequate safeguards for international transfers through:{'\n'}
          {'\n'}
          <Text style={styles.bold}>Standard Contractual Clauses (SCCs):{'\n'}</Text>
          Our service provider Supabase uses EU Standard Contractual Clauses approved by the European
          Commission (Commission Implementing Decision (EU) 2021/914) to ensure adequate protection
          for data transferred outside the EEA.{'\n'}
          {'\n'}
          <Text style={styles.bold}>Additional Security Measures:{'\n'}</Text>
          • Encryption in transit and at rest{'\n'}
          • Strict access controls{'\n'}
          • Regular security audits{'\n'}
          • Compliance with SOC 2 Type II standards{'\n'}
          {'\n'}
          You can request a copy of the applicable safeguards by contacting us at{' '}
          <Text style={styles.link} onPress={handleEmailPress}>
            privacy@voterunions.org
          </Text>
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>11. Cookies and Tracking</Text>
        <Text style={styles.paragraph}>
          We use minimal tracking:{'\n'}
          • Session tokens for authentication (stored securely on device){'\n'}
          • Device identifiers for vote tracking (to prevent duplicate votes){'\n'}
          {'\n'}
          We do NOT use:{'\n'}
          • Third-party analytics{'\n'}
          • Advertising cookies{'\n'}
          • Cross-site tracking
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy periodically. We will notify users of significant changes
          through in-app notifications or email. The "Last Updated" date at the top indicates when
          changes were made. Continued use of the app after changes constitutes acceptance of the
          updated policy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy or want to exercise your rights, contact us
          at:
        </Text>
        <TouchableOpacity onPress={handleEmailPress}>
          <Text style={[styles.paragraph, styles.link]}>privacy@voterunions.org</Text>
        </TouchableOpacity>
        <Text style={styles.paragraph}>
          {'\n'}
          For GDPR-related requests, please include "GDPR Request" in the subject line.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>14. Supervisory Authority</Text>
        <Text style={styles.paragraph}>
          If you are in the European Economic Area (EEA), you have the right to lodge a complaint with
          your local data protection supervisory authority if you believe we have not complied with
          applicable data protection laws.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By using Voter Unions, you acknowledge that you have read and understood this Privacy
          Policy.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#333',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
