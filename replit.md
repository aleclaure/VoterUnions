# Voter Unions - Civic Engagement Platform

## Overview
Voter Unions is a cross-platform mobile application built with Expo and Supabase. Its primary purpose is to empower communities to organize into voter unions, facilitating political engagement, structured policy debates, and collective action. The platform aims to bridge online discussion with real-world political impact by enabling working-class voters to organize, coordinate vote pledging, track campaign progress, and engage in democratic decision-making. The current MVP is complete, fully functional, and ready for testing on Expo Go.

## User Preferences
- Expo Go compatibility enforced (no custom native modules)
- TypeScript strict mode enabled
- Offline-first architecture
- Real-time updates for collaborative features
- Follow all rules below while building this app. The app MUST run in Expo Go during development and build reliably with EAS Build for both iOS and Android later.
- Only use Expo-supported packages (expo-notifications, expo-secure-store, expo-file-system, expo-sharing, expo-haptics, expo-image, expo-blur, expo-clipboard).
- Forbidden while in Expo Go: any third-party module that requires npx expo prebuild or custom native code.
- Media, camera, and file features must use Expo equivalents (expo-camera, expo-image-picker, expo-file-system).
- Do not modify android/ or ios/ folders unless we intentionally prebuild.
- Before adding any library, explain:
  1. Why it's needed
  2. Expo Go compatibility
  3. Impact on EAS build
  4. Removal plan if deprecated

## System Architecture
The application is built using Expo SDK 52 with React Native and TypeScript in strict mode. Navigation is handled by React Navigation, utilizing both bottom tabs and a native stack navigator. State management combines React Query (TanStack) for server state and React Context API for authentication state. The backend leverages Supabase for authentication, PostgreSQL database, Realtime functionalities, and Storage. Security is a paramount concern, with `expo-secure-store` used for token storage and comprehensive Row-Level Security (RLS) policies implemented in Supabase. The system is designed with an offline-first approach using React Query's capabilities.

**Key Features:**
- **Authentication**: Email OTP login/signup, secure token storage with `expo-secure-store`, auto token refresh, and session management via React Context API with memoized functions for stable references.
- **Union Management**: Users can browse public unions, view details, create new unions, join existing ones, and manage members with role-based access control (owner, admin, moderator, member, guest).
- **Debate System**: Functionality to browse debates by union, filter by issue area, create debates, and add arguments with stance selection (pro/con/neutral). Arguments display reaction counts with real-time updates.
- **Voting & Pledging**: Users can browse candidates and policies, pledge support or opposition, with pledges scoped to specific unions and supporting multi-union participation.
- **Progress Tracking**: Features for viewing campaign milestones, tracking completion percentages, and monitoring deadlines, all scoped to individual unions.

**Database Design:**
- All tables (`profiles`, `unions`, `union_members`, `debates`, `arguments`, `reactions`, `candidates`, `policies`, `pledges`, `milestones`) use UUID v4 as primary keys.
- Soft deletes are implemented using a `deleted_at` column.
- Row-Level Security (RLS) policies are enabled on all tables to enforce data security.
- Automatic counts for members, arguments, and reactions are managed via database triggers.
- Performance is optimized with composite indexes on common query paths.

**UI/UX Decisions:**
- The application uses a standard mobile UI pattern with bottom tab navigation for core features and stack navigators for detail screens.
- Strict TypeScript mode and a managed Expo workflow ensure a consistent and robust development environment.

## Recent Changes
- **October 6, 2025**: Migrated authentication state management from Zustand to React Context API to resolve Snackager bundling errors. Zustand was causing @types/react peer dependency conflicts in Expo's cloud bundler. The new AuthContext implementation uses useCallback and useMemo to ensure stable function references, maintaining the same behavior as the previous Zustand store while eliminating the bundling issues.

## External Dependencies
- **Expo SDK 52 (React Native)**: Core framework for mobile app development.
- **React Navigation**: Handles in-app navigation (bottom tabs and native stack).
- **React Query (TanStack)**: Manages server state, caching, and offline-first capabilities.
- **React Context API**: For authentication state management (user, session, isLoading).
- **Supabase**:
    - **Supabase Auth**: For user authentication (Email OTP).
    - **PostgreSQL**: The relational database backend.
    - **Supabase Realtime**: For real-time updates (e.g., argument counts).
    - **Supabase Storage**: For potential future media storage.
- **expo-secure-store**: Securely stores sensitive data like authentication tokens.
- **TypeScript**: Provides type safety across the codebase.