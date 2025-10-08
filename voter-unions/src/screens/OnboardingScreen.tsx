import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export const OnboardingScreen = () => {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const validateUsername = (username: string): { valid: boolean; error?: string } => {
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
      return { valid: false, error: 'Username must be 20 characters or less' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    return { valid: true };
  };

  const handleCompleteOnboarding = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found');
      return;
    }

    const validation = validateUsername(displayName);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    setLoading(true);

    try {
      // Check if username is already taken (case-insensitive)
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username_normalized', displayName.toLowerCase())
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose another.');
        setLoading(false);
        return;
      }

      // Create or update profile with display name and bio
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          display_name: displayName,
          username_normalized: displayName.toLowerCase(),
          bio: bio.trim() || null,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        throw upsertError;
      }

      // Success - the app will automatically navigate to main screens
      // because the profile now has a display_name
    } catch (error: any) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Voter Unions!</Text>
        <Text style={styles.subtitle}>Let's set up your profile</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Choose a Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., civic_voter_2024"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell others about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.hint}>{bio.length}/200 characters</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCompleteOnboarding}
            disabled={loading || !displayName}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#64748b',
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
