# Voter Unions - Civic Engagement Platform

## Overview
A cross-platform mobile app built with Expo and Supabase that enables communities to organize into voter unions for political engagement, policy debates, and collective action.

## Purpose
Transform online discussion into real-world political action by helping working-class voters organize collectively through:
- Structured policy debates
- Coordinated vote pledging
- Campaign progress tracking
- Democratic decision-making

## Current State (2025-10-05)
- **Status**: MVP Complete and Running
- **Expo Server**: Active on port 5000
- **Expo Go Compatible**: All dependencies Expo-supported
- **Database**: Schema created with RLS policies
- **Authentication**: Email OTP with SecureStore
- **Ready for**: Expo Go testing

## Recent Changes (2025-10-05)
- Complete project setup with Expo SDK 52 and TypeScript strict mode
- Implemented email OTP authentication via Supabase Auth
- Created complete navigation: bottom tabs + stack navigator
- Built all core screens: Unions, Debates, Vote, Progress, detail screens
- Implemented mutations for creating unions, debates, arguments, pledges
- Configured React Query with offline-first caching
- Set up Supabase client with SecureStore token management
- Created comprehensive database schema with RLS policies
- All screens functional and ready for testing

## Project Architecture

### Tech Stack
- **Frontend**: Expo SDK 52 (React Native), TypeScript (strict mode)
- **Navigation**: React Navigation (bottom-tabs + native-stack)
- **State Management**: React Query (TanStack) + Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Security**: expo-secure-store for token storage, RLS policies
- **Offline Support**: React Query with offline-first network mode

### Directory Structure
```
voter-unions/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   │   ├── AuthScreen.tsx
│   │   ├── UnionsScreen.tsx
│   │   ├── UnionDetailScreen.tsx
│   │   ├── CreateUnionScreen.tsx
│   │   ├── DebatesScreen.tsx
│   │   ├── DebateDetailScreen.tsx
│   │   ├── CreateDebateScreen.tsx
│   │   ├── VoteScreen.tsx
│   │   ├── CandidateDetailScreen.tsx
│   │   └── ProgressScreen.tsx
│   ├── navigation/     # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/       # API clients and services
│   │   ├── supabase.ts
│   │   └── queryClient.ts
│   ├── hooks/          # Custom React hooks
│   │   └── useAuth.ts
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── stores/         # Zustand stores
│   │   └── authStore.ts
│   └── utils/          # Utility functions
├── assets/             # Images, fonts, icons
├── app.config.ts       # Expo configuration
├── supabase-schema.sql # Database schema with RLS
└── SETUP.md           # Setup instructions
```

### Implemented Features

#### 1. Authentication
- Email OTP login/signup
- Secure token storage with expo-secure-store
- Auto token refresh
- Session management with Zustand

#### 2. Union Pages
- Browse public unions
- View union details
- Create new unions (with automatic owner membership)
- Join public unions
- Member count tracking
- Role-based access (owner, admin, moderator, member, guest)

#### 3. Debates
- Browse debates by union
- Filter by issue area
- Create debates (requires union membership)
- Add arguments with stance selection (pro/con/neutral)
- Argument display with reaction counts
- Real-time argument count updates

#### 4. Voting & Pledging
- Browse candidates and policies
- Pledge support or opposition
- Union-scoped pledges
- Multi-union support (user selects which union to pledge with)

#### 5. Progress Tracking
- View campaign milestones
- Track completion percentages
- Monitor deadlines
- Union-scoped progress

### Database Schema
- **Tables**: profiles, unions, union_members, debates, arguments, reactions, candidates, policies, pledges, milestones
- **Primary Keys**: UUID v4 for all tables
- **Soft Deletes**: deleted_at column (no hard deletes)
- **RLS Policies**: Row-level security enabled on all tables
- **Automatic Counts**: Triggers for member_count, argument_count, reaction_count
- **Performance**: Composite indexes on query paths

### Security Features
- Secure token storage (SecureStore, not AsyncStorage)
- Row Level Security (RLS) policies
- User-scoped queries
- No exposed secrets in code
- Environment variable management

## User Preferences
- Expo Go compatibility enforced (no custom native modules)
- TypeScript strict mode enabled
- Offline-first architecture
- Real-time updates for collaborative features

## Setup Instructions

### 1. Database Setup
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase-schema.sql`
3. Execute to create all tables, indexes, and RLS policies

### 2. Running the App
The Expo server is configured and running on port 5000.

**To test in Expo Go:**
1. Install Expo Go on your mobile device
2. Scan the QR code shown in the console
3. App loads directly in Expo Go

### 3. Environment Variables
Already configured:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Next Steps (Post-MVP)
- Add OAuth providers (Google, Apple Sign-In)
- Implement real-time debate subscriptions
- Add push notifications via expo-notifications
- Implement image uploads for union profiles
- Add collaborative document drafting
- Build admin moderation tools
- Create EAS production builds
- Deploy with OTA updates

## Development Notes
- All dependencies are Expo-compatible
- No native modules requiring prebuild
- TypeScript strict mode enforced
- React Query handles offline caching
- Supabase RLS enforces data security
