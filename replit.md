# Voter Unions - Civic Engagement Platform

## Overview
A cross-platform mobile app built with Expo and Supabase that enables communities to organize into voter unions for political engagement, policy debates, and collective action.

## Purpose
Transform online discussion into real-world political action by helping working-class voters organize collectively through:
- Structured policy debates
- Coordinated vote pledging
- Campaign progress tracking
- Democratic decision-making

## Current State
- MVP implementation complete with core features
- Expo Go compatible (development mode)
- Ready for EAS Build deployment (iOS/Android)
- Database schema created with RLS policies

## Recent Changes (2025-10-05)
- Initial project setup with Expo SDK and TypeScript
- Implemented authentication with email OTP via Supabase Auth
- Created navigation structure with bottom tabs (Unions, Debates, Vote, Progress)
- Built core screens for all main features
- Set up React Query for data management
- Configured Supabase client with SecureStore for token management
- Created comprehensive database schema with Row Level Security
- Configured Expo workflow for port 5000

## Project Architecture

### Tech Stack
- **Frontend**: Expo (React Native), TypeScript (strict mode)
- **Navigation**: React Navigation (bottom-tabs + native-stack)
- **State Management**: React Query (TanStack) + Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Security**: expo-secure-store for token storage, RLS policies

### Directory Structure
```
voter-unions/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API clients and services
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── stores/         # Zustand stores
│   └── utils/          # Utility functions
├── assets/             # Images, fonts, icons
├── app.config.ts       # Expo configuration
└── supabase-schema.sql # Database schema
```

### Core Features
1. **Union Pages**: Create/browse voter unions with role-based access (owner, admin, moderator, member, guest)
2. **Debates**: Structured arguments with pro/con stances and reactions
3. **Voting & Pledging**: Pledge support/opposition for candidates and policies
4. **Progress Tracking**: Campaign milestones with completion percentages

### Database Schema
- All tables use UUID primary keys
- Soft delete with `deleted_at` column
- Row Level Security (RLS) enabled on all tables
- Automatic count updates via triggers
- Composite indexes for performance

## User Preferences
- Expo Go compatibility required (no custom native modules)
- TypeScript strict mode enforced
- Offline-first architecture with caching
- Real-time updates for debates and union activity

## Next Steps
- Run database schema in Supabase SQL Editor (see SETUP.md)
- Test authentication flow in Expo Go
- Add real-time subscriptions for debates
- Implement optimistic updates for reactions/pledges
- Add error boundaries and toast notifications
- Build EAS production configuration
