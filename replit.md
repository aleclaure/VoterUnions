# Voter Unions - Civic Engagement Platform

## Overview
Voter Unions is a cross-platform mobile application built with Expo and Supabase, designed to empower communities through political engagement, structured policy debates, and collective action. It aims to connect online discussions with real-world political impact, enabling working-class voters to organize, coordinate vote pledging, track campaign progress, and participate in democratic decision-making. Key capabilities include union management, enhanced debate systems, transparency tools (Power Tracker), collaborative policy drafting (People's Agenda, People's Terms), and specialized organizing platforms for consumers and workers (Consumer Union, Workers Union). The platform also provides educational content on corporate and labor power dynamics, fostering collective action and increasing political efficacy.

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
The application is built using Expo SDK 52 with React Native and TypeScript, ensuring a managed Expo workflow. Navigation is handled by React Navigation, utilizing bottom tabs for primary features and stack navigators for detailed content. State management combines React Query for server state and React Context API for authentication. The backend leverages Supabase for PostgreSQL, Realtime features, and Storage. Security is paramount, employing `expo-secure-store` for token storage and comprehensive Row-Level Security (RLS) policies. An offline-first approach is implemented using React Query.

**UI/UX Decisions:**
- Standard mobile UI patterns with bottom tab navigation for primary features.
- Material Top Tabs are used for sub-navigation within complex sections (e.g., Power Tracker, People's Agenda).

**Technical Implementations:**
- **Authentication**: Email/password authentication (migrating to a privacy-first, WebAuthn/Device Token based system), hardware-backed token storage (`expo-secure-store`), auto-token refresh, password reset, and session management via React Context API. Includes strong password policies, email validation, audit logging, client-side rate limiting, multi-device session tracking, and remote session revocation.
- **Core Modules**: User profiles, union management with role-based access control, an enhanced debate system with real-time tallies, and a social feed.
- **Civic Engagement Platforms**: Power Tracker, People's Agenda, People's Terms / Negotiations, Consumer Union, and Workers Union for organizing collective actions and collaborative policy drafting.
- **Educational Platforms**: "Corporate Power" and "Labor Power" sections with user-generated content.
- **Database Design**: PostgreSQL with UUID v4 primary keys, soft deletes, comprehensive RLS, automatic counts via triggers, and performance-optimized indexes.
- **Device-Based Vote Protection**: Enforces one vote per entity per device using `device_id` and `expo-secure-store`.
- **XSS Protection System**: Automated enforcement via AST-based data flow analysis with Babel parser, sanitizing user-generated content.
- **GDPR Compliance**: Includes a content reporting system, GDPR-compliant privacy policy, data export (Article 20), and a robust hard delete account system (Article 17) with cascade deletion.
- **Admin Audit Logging & Transparency**: Comprehensive audit logs for authentication, moderation, and admin actions.
- **Rate Limiting**: Client-side rate limiting prevents abuse across various action types.
- **Blue Spirit Phase 1 Migration**: Transitioning from Supabase email/password authentication to a WebAuthn-based, privacy-first architecture, with a "Device Token Auth" path for Expo Go compatibility. This involves removing email collection, implementing a zero-knowledge architecture, blind-signature voting, E2EE messaging, and encrypted memberships. The migration uses feature flags, a data adapter layer, and security guardrails. The system now utilizes the `elliptic` library for cryptographic operations due to Expo Go compatibility.

## External Dependencies
- **Expo SDK 52 (React Native)**: Core mobile application development.
- **React Navigation**: In-app navigation.
- **React Query (TanStack)**: Server state management, offline capabilities.
- **Supabase**: PostgreSQL, Realtime features, and Storage.
- **expo-secure-store**: Secure storage for sensitive data.
- **expo-crypto**: Cryptographic operations.
- **expo-application**: Generates stable device identifiers.
- **elliptic**: Pure JavaScript ECDSA library for cryptographic operations (Expo Go compatible).
- **@noble/curves**, **@noble/hashes**: Used in backend for ECDSA, previously attempted in frontend but removed due to Expo Go incompatibility.
- **react-native-get-random-values**: Provides a secure random number generator polyfill.
- **TypeScript**: Type safety.
- **Vitest**: Testing framework.
- **ESLint Security Plugin**: Static analysis for security.
- **Babel Parser/Traverse**: AST-based data flow analysis.
- **Redis**: Backend challenge storage for authentication.