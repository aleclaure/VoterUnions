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
- **Authentication**: Email/Password signup and login with email verification, secure token storage with `expo-secure-store`, auto token refresh, password reset functionality, and session management via React Context API with memoized functions for stable references.
- **User Profiles**: Unique usernames with display names, user bios, profile statistics (debates created, arguments posted, unions joined), profile editing, and password management.
- **Union Management**: Users can browse public unions, view details, create new unions, join existing ones, and manage members with role-based access control (owner, admin, moderator, member, guest). All actions display user identities.
- **Enhanced Debate System**: 
  - Browse debates by union and filter by issue area
  - Create debates and add arguments with stance selection (PRO/CON/NEUTRAL)
  - **User Identity**: All debates, arguments, and replies show @username of creator
  - **Voting System**: Upvote/downvote arguments with real-time vote tallies
  - **Real-time Scoreboard**: Visual display of debate momentum showing which side is winning
  - **Source Attachments**: Add URLs and documents to support arguments
  - **Threaded Replies**: Fully recursive reply threading with horizontal thread view
  - **Horizontal Thread View**: Swipeable conversation chains showing full context
  - **Notifications**: Alerts when debate momentum shifts significantly
- **Social Feed & Channels**: 
  - Create posts with union and channel selection
  - **Post Routing System**: Posts intelligently appear based on selection:
    - **Public posts** → Appear in "All Posts" page (global feed) + selected union(s)
    - **Union posts** → Appear only in selected union(s)
    - **Channel posts** → Appear in specific channel(s) within union
    - **No channel selected** → Post appears in union's "All" view
  - Users can post to multiple unions simultaneously (creates separate posts per union)
  - Channel filtering: View all posts in a union or filter by specific channels
  - Enhanced logging tracks post creation, fetching, and filtering for debugging
- **Power Tracker**:
  - **Tab 1: Politicians** - User-curated politician profiles with donor tracking, corporate ties, and conflict of interest analysis
  - **Tab 2: Bills** - Legislative analysis showing "who profits" from bills, beneficiary corporations, and lobbying connections
  - **Tab 3: Data & Graphics** - Gallery of wealth inequality infographics, corporate power visualizations, and economic data
  - **Tab 4: Take Action** - Create pledges to vote against politicians or support/oppose reforms, linked to specific unions
  - **Philosophy**: "Know your enemy: organized money" - expose where real power lies by following money and influence
  - **User-Generated Content**: All data is manually curated by users for targeted, clean analysis (no API dependencies)
  - **Material Top Tabs**: Horizontal swipeable tabs positioned below iPhone status bar/notch for optimal UX
- **People's Agenda**:
  - **Tab 1: Priorities** - Policy voting interface where users propose and vote on policy priorities (e.g., Medicare for All, housing reform)
  - **Tab 2: Platform** - Collaborative drafting of "The People's Platform" with sections and proposed amendments
  - **Tab 3: Wins** - Reform wins tracker showing policies gaining momentum at local, state, and national levels
  - **Tab 4: Outreach** - Auto-generate shareable campaign content and representative messages based on top voted policies
  - **Philosophy**: "Different backgrounds, one struggle" - unite working class around shared demands, replacing divisive talking points with practical solutions
  - **User-Generated Content**: All policies, platform sections, and reform tracking manually curated by users (no API dependencies)
  - **Material Top Tabs**: Horizontal swipeable tabs matching Power Tracker's design pattern
- **Progress Tracking**: Features for viewing campaign milestones, tracking completion percentages, and monitoring deadlines, all scoped to individual unions.

**Database Design:**
- All tables (`profiles`, `unions`, `union_members`, `debates`, `arguments`, `reactions`, `candidates`, `policies`, `pledges`, `milestones`, `power_politicians`, `power_donors`, `power_bills`, `power_beneficiaries`, `power_graphics`, `power_pledges`, `power_bill_politicians`, `policy_votes`, `platform_sections`, `platform_amendments`, `amendment_votes`, `reform_wins`) use UUID v4 as primary keys.
- Soft deletes are implemented using a `deleted_at` column.
- Row-Level Security (RLS) policies are enabled on all tables to enforce data security.
- Automatic counts for members, arguments, and reactions are managed via database triggers.
- Performance is optimized with composite indexes on common query paths.

**UI/UX Decisions:**
- The application uses a standard mobile UI pattern with bottom tab navigation for core features and stack navigators for detail screens.
- Strict TypeScript mode and a managed Expo workflow ensure a consistent and robust development environment.

## Recent Changes
- **October 9, 2025**: People's Agenda feature replaces Vote tab:
  - **New Feature**: Replaced Vote tab with People's Agenda - a tool to unite working class around shared demands
  - **Database Schema**: Added 5 new tables (`policy_votes`, `platform_sections`, `platform_amendments`, `amendment_votes`, `reform_wins`) with full RLS policies
  - **UI Implementation**: 4 Material Top Tabs (Priorities, Platform, Wins, Outreach) with swipeable navigation
  - **Tab Features**: Policy voting with upvote/downvote, collaborative platform drafting with amendments, reform wins tracker, auto-generated outreach campaigns
  - **Philosophy Shift**: From "Know your enemy: organized money" (Power Tracker) to "Different backgrounds, one struggle" (People's Agenda)
  - **Navigation Update**: Changed bottom tab from "Vote" (🗳️) to "Agenda" (🤝)
  - **Files Created**: `PeoplesAgendaScreen.tsx`, `PrioritiesTab.tsx`, `PlatformTab.tsx`, `WinsTab.tsx`, `OutreachTab.tsx`, `peoples-agenda-schema.sql`
  - **Migration Required**: User must run `peoples-agenda-schema.sql` in Supabase SQL Editor to activate new tables
- **October 9, 2025**: Power Tracker feature added:
  - **New Feature**: Replaced Debates tab with Power Tracker - a transparency tool to track political power, money, and influence
  - **Database Schema**: Added 7 new tables (`power_politicians`, `power_donors`, `power_bills`, `power_beneficiaries`, `power_graphics`, `power_pledges`, `power_bill_politicians`) with full RLS policies
  - **UI Implementation**: 4 Material Top Tabs (Politicians, Bills, Data, Action) with swipeable navigation below safe area
  - **CRUD Hooks**: Complete set of hooks for all Power Tracker tables (`usePowerPoliticians`, `usePowerBills`, `usePowerGraphics`, `usePowerPledges`)
  - **User-Curated Content**: All data manually created by users - politicians with donors, bills with beneficiary analysis, wealth inequality graphics, and action pledges
  - **Navigation Update**: Changed bottom tab from "Debates" (💬) to "Power" (🔍)
  - **Files Created**: `PowerTrackerScreen.tsx`, `PoliticiansTab.tsx`, `BillsTab.tsx`, `DataTab.tsx`, `ActionTab.tsx`, `power-tracker-schema.sql`, plus 4 new hook files
  - **Migration Required**: User must run `power-tracker-schema.sql` in Supabase SQL Editor to activate new tables
- **October 8, 2025**: Post visibility fix and database query improvements:
  - **Fixed Post Visibility**: Posts now display correctly by implementing manual profile joins (Supabase foreign key constraint was missing between posts and profiles tables)
  - **Query Optimization**: Replaced foreign key-dependent joins with manual two-step queries (fetch posts, then fetch profiles separately and join in-memory)
  - **Root Cause**: Database missing `posts_author_id_fkey` constraint, causing automatic joins to fail silently
  - **Solution**: Modified `usePosts`, `usePublicPosts`, and `usePostComments` to fetch profiles separately using `.in()` operator and join manually using Map
  - **Fixed SecureStore Error**: Migrated from expo-secure-store to AsyncStorage for Supabase auth storage (SecureStore has 2048-byte limit, Supabase tokens exceed this - official 2024 Expo+Supabase recommendation)
  - **Enhanced Logging**: Added comprehensive logging to track post creation, fetching, and filtering across unions and channels
  - **Files Modified**: `supabase.ts`, `usePosts.ts`, `MyUnionsScreen.tsx`
- **October 7, 2025**: Enhanced debate system with interactive features:
  - **Database Updates**: Added `parent_id`, `source_links`, `upvotes`, `downvotes` columns to `arguments` table
  - **New Tables**: Created `argument_votes` table to track individual votes with proper RLS policies
  - **Voting System**: Implemented upvote/downvote functionality with real-time vote tallies
  - **Real-time Scoreboard**: Added visual scoreboard showing PRO/CON/NEUTRAL debate momentum
  - **Supabase Realtime**: Integrated live updates for votes and arguments
  - **Database Migration**: Created `debate-enhancements-migration.sql` - must be run in Supabase SQL Editor to activate new features
  - **Files Modified**: `DebateDetailScreen.tsx`, `supabase-schema.sql`, `types/index.ts`
  - **New Hooks**: `useArgumentVotes.ts`, `useDebateStats.ts`
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