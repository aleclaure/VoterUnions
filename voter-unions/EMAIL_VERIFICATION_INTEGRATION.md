# Email Verification Integration Guide

## Overview
This guide shows how to integrate email verification guards into protected actions across the app.

## Integration Pattern

### 1. Import the Guard Hook
```typescript
import { useEmailVerificationGuard } from '../hooks/useEmailVerificationGuard';
```

### 2. Use the Hook in Components
```typescript
const { guardAction } = useEmailVerificationGuard();
```

### 3. Guard Protected Actions
Before any protected action, call `guardAction`:

```typescript
const handleVote = async () => {
  // Guard the vote action
  const allowed = await guardAction('VOTE');
  if (!allowed) return; // User not verified - guard shows alert
  
  // Proceed with vote
  await voteOnArgument.mutateAsync({ ... });
};
```

## Example Integrations

### Voting (Arguments, Policies, etc.)
```typescript
// In DebateDetailScreen.tsx or ArgumentCard.tsx
const { guardAction } = useEmailVerificationGuard();
const voteOnArgument = useVoteOnArgument();

const handleUpvote = async () => {
  if (!await guardAction('VOTE')) return;
  
  await voteOnArgument.mutateAsync({
    argumentId,
    voteType: 'upvote',
    debateId,
    deviceId,
  });
};
```

### Creating Debates
```typescript
// In CreateDebateScreen.tsx
const { guardAction } = useEmailVerificationGuard();

const handleCreate = async () => {
  if (!await guardAction('CREATE_DEBATE')) return;
  
  // Proceed with debate creation
  await createDebate.mutateAsync({ ... });
};
```

### Creating Posts
```typescript
// In CreatePostScreen.tsx or PostComposer.tsx
const { guardAction } = useEmailVerificationGuard();

const handleSubmit = async () => {
  if (!await guardAction('CREATE_POST')) return;
  
  await createPost.mutateAsync({ ... });
};
```

### Creating Arguments
```typescript
// In AddArgumentScreen.tsx or ArgumentForm.tsx
const { guardAction } = useEmailVerificationGuard();

const handleSubmit = async () => {
  if (!await guardAction('CREATE_ARGUMENT')) return;
  
  await addArgument.mutateAsync({ ... });
};
```

### Creating Unions
```typescript
// In CreateUnionScreen.tsx
const { guardAction } = useEmailVerificationGuard();

const handleCreate = async () => {
  if (!await guardAction('CREATE_UNION')) return;
  
  await createUnion.mutateAsync({ ... });
};
```

### Creating Boycott Proposals
```typescript
// In Consumer Union screens
const { guardAction } = useEmailVerificationGuard();

const handleCreateBoycott = async () => {
  if (!await guardAction('CREATE_BOYCOTT')) return;
  
  await createBoycott.mutateAsync({ ... });
};
```

### Creating Strike Proposals
```typescript
// In Workers Union screens
const { guardAction } = useEmailVerificationGuard();

const handleCreateStrike = async () => {
  if (!await guardAction('CREATE_STRIKE')) return;
  
  await createStrike.mutateAsync({ ... });
};
```

## Adding the Verification Banner

Add the verification banner to main navigation screens:

```typescript
// In UnionsTabNavigator.tsx, PowerTrackerScreen.tsx, etc.
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

export const SomeScreen = () => {
  return (
    <SafeAreaView>
      <EmailVerificationBanner />
      {/* Rest of screen content */}
    </SafeAreaView>
  );
};
```

## Protected Actions List

The following actions require email verification:
- `CREATE_POST` - Creating posts
- `CREATE_DEBATE` - Creating debates
- `CREATE_ARGUMENT` - Adding arguments to debates
- `VOTE` - Voting on arguments, policies, proposals
- `CREATE_UNION` - Creating voter unions
- `CREATE_BOYCOTT` - Creating boycott proposals
- `CREATE_STRIKE` - Creating strike proposals
- `UPDATE_PROFILE` - Updating user profile

## User Experience

When an unverified user attempts a protected action:
1. Guard function blocks the action
2. Alert is shown explaining email verification requirement
3. User can:
   - Resend verification email (with one click)
   - Cancel and verify later

## Testing

To test email verification enforcement:
1. Create a new account
2. Do NOT verify the email
3. Try to vote, post, or create content
4. Verify the guard blocks the action
5. Verify the email and try again
6. Confirm the action now succeeds
