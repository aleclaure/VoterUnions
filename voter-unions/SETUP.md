# Voter Unions - Setup Instructions

## Database Setup

1. Open your Supabase Dashboard at https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy the entire content from `supabase-schema.sql`
4. Paste and run it in the SQL Editor

This will create all necessary tables, indexes, RLS policies, and triggers for the app.

## Running the App

The app is configured to run with Expo Go for development.

### In Expo Go (Mobile Device):
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in the terminal with your device
3. The app will load in Expo Go

### Environment Variables
The following environment variables are already configured:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

## Features

- **Authentication**: Email OTP login with SecureStore for token management
- **Unions**: Create and browse voter unions
- **Debates**: Structured policy debates with pro/con arguments
- **Voting**: Pledge votes for candidates and policies
- **Progress**: Track campaign milestones and completion

## Tech Stack

- Expo SDK (managed workflow)
- TypeScript (strict mode)
- React Navigation (bottom tabs + native stack)
- React Query (TanStack) for data management
- Zustand for local state
- Supabase for backend (auth, database, realtime)
- expo-secure-store for secure token storage
