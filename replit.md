# Voter Unions - Civic Engagement Platform

## Overview
Voter Unions is a cross-platform mobile application built with Expo and Supabase. Its primary purpose is to empower communities to organize into voter unions, facilitating political engagement, structured policy debates, and collective action. The platform aims to bridge online discussion with real-world political impact by enabling working-class voters to organize, coordinate vote pledging, track campaign progress, and engage in democratic decision-making.

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
The application is built using Expo SDK 52 with React Native and TypeScript. Navigation is handled by React Navigation, utilizing bottom tabs and a native stack navigator. State management combines React Query for server state and React Context API for authentication state. The backend leverages Supabase for authentication, PostgreSQL database, Realtime functionalities, and Storage. Security is handled with `expo-secure-store` for token storage and comprehensive Row-Level Security (RLS) policies in Supabase. The system is designed with an offline-first approach using React Query.

**UI/UX Decisions:**
- Standard mobile UI patterns with bottom tab navigation for core features and stack navigators for detail screens.
- Material Top Tabs are used for sub-navigation within complex sections like Power Tracker, People's Agenda, and People's Terms.
- Strict TypeScript and managed Expo workflow ensure a consistent and robust development environment.

**Technical Implementations:**
- **Authentication**: Email/Password signup/login with email verification, secure token storage, auto token refresh, password reset, and session management via React Context API.
- **User Profiles**: Unique usernames, display names, bios, statistics, editing, and password management.
- **Union Management**: Browse, create, join unions, and manage members with role-based access control.
- **Enhanced Debate System**: Supports browsing, creation of debates, arguments with stances (PRO/CON/NEUTRAL), user identity display, upvote/downvote system with real-time tallies, scoreboard for momentum, source attachments, and threaded replies with horizontal thread view.
- **Social Feed & Channels**: Posts can be routed to public feeds, specific unions, or channels within unions.
- **Power Tracker**: A transparency tool to track political power, money, and influence. Features include user-curated profiles of politicians with donor tracking, legislative analysis of bills, wealth inequality data graphics, and pledges to influence political action. All data is user-generated.
- **People's Agenda**: A platform to unite working-class communities around shared demands. Features include policy voting, collaborative drafting of "The People's Platform," a reform wins tracker, and tools for generating outreach content. All content is user-generated.
- **People's Terms / Negotiations**: A system to formalize community consensus into official demands and track negotiations. Features include drafting proposals with feedback, a voting hall with a ratification threshold, a living document of ratified terms, and tracking of activated demands and negotiation outcomes. All content is user-generated.
- **Consumer Union**: A platform to organize consumer power for economic justice and demand ethical behavior from corporations. Features include boycott proposal creation with evidence and alternatives, democratic voting to activate campaigns (60% threshold), active boycott tracking with pledges and timeline updates, and an impact archive documenting victories with economic metrics. Tagline: "Our money has power — we spend for justice." All content is user-generated.
  - **Security Architecture**: Production-grade vote field protection via dual triggers: (1) BEFORE INSERT trigger forces all vote fields to zero regardless of user input, preventing forged initial values; (2) BEFORE UPDATE trigger blocks manual changes using NULL-safe IS DISTINCT FROM comparisons and pg_trigger_depth() gating (allows only trigger-initiated updates). Vote counts are recalculated from aggregates by AFTER trigger on boycott_votes table. Campaign RLS policies enforce 60% activation threshold using EXISTS subqueries on real proposal data.

**Database Design:**
- PostgreSQL database with UUID v4 primary keys.
- Soft deletes implemented via `deleted_at` column.
- Row-Level Security (RLS) policies enforced on all tables.
- Automatic counts for members, arguments, and reactions managed via database triggers.
- Performance optimized with composite indexes.

## External Dependencies
- **Expo SDK 52 (React Native)**: Core mobile app development framework.
- **React Navigation**: For in-app navigation.
- **React Query (TanStack)**: For server state management and offline capabilities.
- **Supabase**:
    - **Supabase Auth**: User authentication.
    - **PostgreSQL**: Relational database backend.
    - **Supabase Realtime**: Real-time feature updates.
    - **Supabase Storage**: For future media storage.
- **expo-secure-store**: Secure storage for sensitive data.
- **TypeScript**: For type safety.