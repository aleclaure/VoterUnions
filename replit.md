# Voter Unions - Civic Engagement Platform

## Overview
Voter Unions is a cross-platform mobile application designed to empower communities by facilitating political engagement, structured policy debates, and collective action. Built with Expo and Supabase, it aims to connect online discussions with real-world political impact, enabling working-class voters to organize, coordinate vote pledging, track campaign progress, and participate in democratic decision-making. The platform includes features for union management, enhanced debate systems, transparency tools (Power Tracker), collaborative policy drafting (People's Agenda, People's Terms), and specialized organizing platforms for consumers and workers (Consumer Union, Workers Union). It also provides educational content on corporate and labor power dynamics.

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
The application is built using Expo SDK 52 with React Native and TypeScript. Navigation is managed by React Navigation, utilizing bottom tabs and native stack navigators. State management combines React Query for server state and React Context API for authentication. The backend is powered by Supabase for authentication, PostgreSQL, Realtime features, and Storage. Security is a core focus, employing `expo-secure-store` for token storage and comprehensive Row-Level Security (RLS) policies in Supabase. The system incorporates an offline-first approach using React Query.

**UI/UX Decisions:**
- Standard mobile UI patterns with bottom tab navigation for primary features and stack navigators for detailed content.
- Material Top Tabs are used for sub-navigation within complex sections like Power Tracker, People's Agenda, People's Terms, Corporate Power, and Labor Power.
- The development environment enforces strict TypeScript and a managed Expo workflow for consistency and robustness.

**Technical Implementations:**
- **Authentication**: Features email/password signup/login with verification, hardware-backed token storage (`expo-secure-store`), auto-token refresh, password reset, and session management via React Context API.
  - **Security Enhancements**: Includes environment-enforced credentials, strong password policies, email validation, comprehensive audit logging with device and IP tracking, client-side rate limiting for authentication attempts, and automatic session timeouts.
  - **Advanced Session Management**: Multi-device session tracking with device fingerprinting and remote session revocation capabilities.
  - **Email Verification Enforcement**: A robust, production-ready system to enforce email verification for all critical actions (7 voting actions and 9 content creation actions), featuring a two-tier verification check, automatic session refresh on app foreground, real-time state synchronization, and a user-friendly `useEmailVerificationGuard` hook with a persistent `EmailVerificationBanner`.
- **Core Modules**: Includes user profiles, union management with role-based access control, an enhanced debate system with upvoting/downvoting and real-time tallies, and a social feed supporting various channels.
- **Civic Engagement Platforms**:
  - **Power Tracker**: A transparency tool for tracking political power, money, and influence, with user-generated data on politicians, donors, and legislation.
  - **People's Agenda**: Facilitates collaborative policy drafting and voting to unite communities around shared demands.
  - **People's Terms / Negotiations**: Formalizes community consensus into demands, with a voting hall for ratification and tracking of negotiation outcomes.
  - **Consumer Union**: Organizes consumer power through boycott proposals, democratic voting for campaign activation, and impact tracking, secured by production-grade vote field protection via database triggers and RLS policies enforcing activation thresholds.
  - **Workers Union**: Empowers workers to organize strikes or reforms through proposals, democratic voting, and coordination, also secured by robust vote field protection via database triggers and RLS policies.
- **Educational Platforms**:
  - **Corporate Power**: Exposes corporate influence, consumer/worker impact, and accountability with user-generated content across multiple categories.
  - **Labor Power**: Documents labor struggles, organizing tactics, and worker victories with user-generated content across various categories.
- **Database Design**: PostgreSQL with UUID v4 primary keys, soft deletes (`deleted_at`), comprehensive RLS policies on all tables, automatic counts via database triggers, and performance optimization with composite indexes.
- **Device-Based Vote Protection**: A security model across all seven vote tables that enforces exactly one vote per entity per device, utilizing a `device_id` column with a unique index, and `expo-secure-store` for stable device identifiers.
- **XSS Protection System**: Bulletproof automated enforcement via AST-based data flow analysis using Babel parser. All user-generated content is sanitized before database insertion with 62 automated tests (31 sanitization tests, 16 integration tests, 8 enforcement tests, 7 AST data flow tests) that FAIL if sanitization is bypassed. ESLint security plugin provides additional static analysis. System tracks variables from sanitization calls through to Supabase .insert() operations, detecting direct assignments, inline sanitization, conditional expressions, and object spreads.
- **GDPR Compliance Features**:
  - **Content Reporting System**: Comprehensive reporting system supporting 18 content types (posts, comments, profiles, etc.) with RLS policies, ReportButton UI component, and ModerationQueueScreen for union admins to review and resolve reports.
  - **Privacy Policy**: GDPR-compliant screen with lawful bases for processing (Article 6), data controller details, EU representative section, and Standard Contractual Clauses for international transfers (placeholders noted for production).
  - **Data Export (Article 20)**: Complete data portability across all user data (20+ tables) with platform-adaptive delivery (expo-sharing on native, JSON modal with copy-to-clipboard fallback for web/simulators where FileSystem unavailable).
  - **Hard Delete Account (Article 17)**: Complete GDPR-compliant erasure system with:
    - **Immediate**: Cascade deletion across 50+ tables and audit log anonymization
    - **Automated Backend**: Supabase Edge Function (cleanup-deleted-users) deletes auth.users records within 30 days using service-role permissions
    - **Tracking**: user_deletion_requests table logs all deletion requests with status tracking
    - **Transparency**: Users can query deletion status via get_deletion_request_status() function
    - **Deployment**: Production-ready Edge Function with comprehensive deployment guide (see voter-unions/supabase/EDGE_FUNCTION_DEPLOYMENT.md)
- **Admin Audit Logging & Transparency**:
  - **Comprehensive Audit System**: Extended audit_logs table tracking authentication events, moderation actions (report status changes, content deletions), and admin actions with device/IP tracking.
  - **Database Triggers**: Automatic logging of report status changes (dismissed, reviewed, actioned) and content deletion (posts, comments) for complete transparency.
  - **Union Member Visibility**: RLS policies and get_union_moderation_logs() function allow all union members to view moderation actions via ModerationLogsScreen, ensuring admin accountability.
- **Rate Limiting**: Client-side rate limiting across 11 action types (authentication, posts, comments, channels, power pledges) to prevent abuse and spam.

## External Dependencies
- **Expo SDK 52 (React Native)**: Core mobile application development.
- **React Navigation**: In-app navigation.
- **React Query (TanStack)**: Server state management and offline capabilities.
- **Supabase**:
    - **Supabase Auth**: User authentication.
    - **PostgreSQL**: Relational database.
    - **Supabase Realtime**: Real-time feature updates.
    - **Supabase Storage**: Media storage.
- **expo-secure-store**: Secure storage for sensitive data.
- **TypeScript**: Type safety.
- **expo-application**: Generates stable device identifiers.
- **Testing & Security**:
    - **Vitest**: Testing framework for automated security enforcement.
    - **ESLint Security Plugin**: Static analysis for security vulnerabilities.
    - **Babel Parser/Traverse**: AST-based data flow analysis for XSS protection.
    - **62 Automated Security Tests**: Comprehensive test suite that prevents XSS vulnerabilities.