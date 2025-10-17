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
- **Authentication**: Email/Password signup/login with email verification, hardware-backed secure token storage (expo-secure-store), auto token refresh, password reset, and session management via React Context API.
  - **Security Enhancements (Phase 1)**:
    - Environment-enforced credentials with runtime validation (no hardcoded fallbacks)
    - Hardware-backed token encryption via expo-secure-store on native platforms
    - Strong password policy: 12+ characters with uppercase, lowercase, numbers, and special characters
    - Email validation on all authentication entry points
    - Consistent password validation across signup, signin, reset, and profile updates
  - **Security Enhancements (Phase 2)**:
    - **Audit Logging**: Comprehensive security event logging for all auth actions (login, logout, password changes, failures) with device tracking, IP address capture, and metadata storage. Immutable audit logs with system-only access via RLS policies.
    - **Rate Limiting**: Client-side brute force protection with configurable thresholds (5 login attempts per 15 min, 3 signup attempts per hour). Email normalization prevents bypass via casing. Temporary account lockouts after threshold breach.
    - **Session Timeout**: Automatic logout after 30 minutes of inactivity. Navigation-based activity tracking with 5-minute warning before expiration. Session state preserved across app backgrounding.
  - **Security Enhancements (Phase 3)** - Advanced Session Management & Monitoring:
    - **Multi-Device Session Tracking**: Complete device fingerprinting with device name, type, OS version, and app version. Active sessions table tracks all logged-in devices with last activity timestamps. Service-role protected RLS policies ensure users can only access their own session data.
    - **Email Verification Enforcement**: Comprehensive guard system to block unverified users from protected actions (voting, posting, creating content). Reusable `useEmailVerificationGuard` hook with user-friendly alerts and one-click resend functionality. Integration guide provided for all protected mutations.
    - **Session Management Service**: Remote session revocation for compromised devices. Bulk "revoke all other sessions" for security incidents. Trusted device management with configurable trust duration. Session activity tracking for security monitoring.
    - **Database Schema**: `active_sessions`, `user_security_settings`, `security_alerts`, and `trusted_devices` tables with comprehensive RLS policies. Helper functions for session management (upsert_active_session, revoke_session, calculate_security_score). Security views for monitoring suspicious activity patterns.
- **User Profiles**: Unique usernames, display names, bios, statistics, editing, and password management.
- **Union Management**: Browse, create, join unions, and manage members with role-based access control.
- **Enhanced Debate System**: Supports browsing, creation of debates, arguments with stances (PRO/CON/NEUTRAL), user identity display, upvote/downvote system with real-time tallies, scoreboard for momentum, source attachments, and threaded replies with horizontal thread view.
- **Social Feed & Channels**: Posts can be routed to public feeds, specific unions, or channels within unions.
- **Power Tracker**: A transparency tool to track political power, money, and influence. Features include user-curated profiles of politicians with donor tracking, legislative analysis of bills, wealth inequality data graphics, and pledges to influence political action. All data is user-generated.
- **People's Agenda**: A platform to unite working-class communities around shared demands. Features include policy voting, collaborative drafting of "The People's Platform," a reform wins tracker, and tools for generating outreach content. All content is user-generated.
- **People's Terms / Negotiations**: A system to formalize community consensus into official demands and track negotiations. Features include drafting proposals with feedback, a voting hall with a ratification threshold, a living document of ratified terms, and tracking of activated demands and negotiation outcomes. All content is user-generated.
- **Consumer Union**: A platform to organize consumer power for economic justice and demand ethical behavior from corporations. Features include boycott proposal creation with evidence and alternatives, democratic voting to activate campaigns (60% threshold), active boycott tracking with pledges and timeline updates, and an impact archive documenting victories with economic metrics. Tagline: "Our money has power — we spend for justice." All content is user-generated.
  - **Security Architecture**: Production-grade vote field protection via dual triggers: (1) BEFORE INSERT trigger forces all vote fields to zero regardless of user input, preventing forged initial values; (2) BEFORE UPDATE trigger blocks manual changes using NULL-safe IS DISTINCT FROM comparisons and pg_trigger_depth() gating (allows only trigger-initiated updates). Vote counts are recalculated from aggregates by AFTER trigger on boycott_votes table. Campaign RLS policies enforce 60% activation threshold using EXISTS subqueries on real proposal data.
- **Workers Union**: A platform empowering workers to collectively organize, propose, and execute strikes or workplace reforms. Features include worker proposals for workplace demands (fair pay, safe conditions, union recognition), democratic voting for labor actions (strike planning, petition filing, negotiation), active strike coordination with real-time updates and solidarity pledges, and outcome tracking documenting victories, cross-industry alliances, and strategic lessons. Tagline: "We make the economy run — and we can stop it too." All content is user-generated.
  - **Security Architecture**: Production-grade vote field protection via dual triggers: (1) BEFORE INSERT trigger forces all vote fields to zero regardless of user input, preventing forged initial values; (2) BEFORE UPDATE trigger blocks manual changes using NULL-safe IS DISTINCT FROM comparisons and pg_trigger_depth() gating (allows only trigger-initiated updates). Vote counts are recalculated from aggregates by AFTER trigger on worker_votes table. Strike RLS policies enforce proposal ownership and 60% activation threshold using EXISTS subqueries on real proposal data. Engagement counts (pledge_count, update_count) protected with same dual-trigger pattern. Outcome recording restricted to strike creators.
- **Corporate Power**: An educational platform exposing corporate influence and power dynamics in politics and society. Features include documenting corporate influence (lobbying, dark money, revolving door), tracking consumer impact (price gouging, monopolies, deceptive practices), exposing worker impact (wage theft, union busting, safety violations), and corporate accountability (legal actions, regulatory failures). All content is user-generated with categories, evidence links, and impact descriptions.
  - **Database Schema**: 4 content tables (corporate_influence, consumer_impact, worker_impact, corporate_accountability) + 2 participation tables (corporate_power_bookmarks, corporate_power_user_contributions). Soft deletes via deleted_at column. RLS policies enforce public read access and authenticated user write access.
  - **UI/UX**: Material Top Tabs for 4 content categories. SafeAreaView integration for iPhone status bar protection. Multi-line tab labels for compact mobile display.
- **Labor Power**: An educational platform documenting labor struggles, organizing tactics, and worker victories. Features include exposing corporate exploitation (wage theft, forced overtime, misclassification, retaliation), showcasing organizing & resistance (union drives, walkouts, solidarity actions), tracking worker rights legislation (labor law changes, enforcement issues, policy advocacy), and celebrating solidarity & victories (successful strikes, contract wins, movement building). All content is user-generated with categories, evidence links, and impact descriptions.
  - **Database Schema**: 4 content tables (corporate_exploitation, organizing_resistance, worker_rights_legislation, solidarity_victories) + 3 participation tables (labor_power_bookmarks, labor_power_user_contributions, organizing_participation for pledge tracking). Soft deletes via deleted_at column. RLS policies enforce public read access and authenticated user write access.
  - **UI/UX**: Material Top Tabs for 4 content categories. SafeAreaView integration for iPhone status bar protection. Multi-line tab labels for compact mobile display.

**Database Design:**
- PostgreSQL database with UUID v4 primary keys.
- Soft deletes implemented via `deleted_at` column.
- Row-Level Security (RLS) policies enforced on all tables.
- Automatic counts for members, arguments, and reactions managed via database triggers.
- Performance optimized with composite indexes.

**Device-Based Vote Protection (All 7 Vote Tables):**
- **Security Model**: Each device gets exactly one vote per entity, preventing fraud through device-level enforcement.
- **Database Layer**: All vote tables have `device_id` column with NOT NULL constraint + unique index on (entity_id, device_id).
- **Read Layer**: All vote queries filter by BOTH user_id AND device_id for per-device state.
- **Mutation Layer**: All vote mutations query by user_id AND device_id before update/delete/insert operations.
- **UX Layer**: Vote handlers silently ignore clicks while deviceId loads (no error alerts).
- **Migration**: Legacy votes migrated with unique placeholder device IDs before enforcing NOT NULL constraints.
- **Protected Tables**: argument_votes, post_reactions, policy_votes, demand_votes, boycott_votes, worker_votes, amendment_votes.
- **Device Tracking**: Uses `expo-application` to generate stable device identifiers stored in `expo-secure-store`.

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