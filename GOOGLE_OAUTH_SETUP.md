# Google OAuth Implementation Guide

## Overview

Google OAuth has been successfully integrated into the LINGUA application using Supabase Auth. Users can now sign in with Google on all authentication pages.

## Files Created/Modified

### New Files
1. **`src/lib/google-auth.ts`** - Google OAuth utility functions
   - `signInWithGoogle()` - Initiates Google OAuth flow
   - `getIntendedRole()` - Retrieves intended role after OAuth
   - `setIntendedRole()` - Stores intended role before OAuth
   - `clearIntendedRole()` - Clears intended role after OAuth
   - `signOut()` - Signs out and clears OAuth state

2. **`src/components/auth/google-button.tsx`** - Reusable Google button component
   - Displays Google logo
   - Shows loading state
   - Prevents multiple clicks

### Modified Files
1. **`src/routes/auth.callback.tsx`** - OAuth callback handler
   - Handles Google OAuth redirect
   - Creates user profile from Google data
   - Assigns correct role based on intended role
   - Creates mentor profile for mentor signups
   - Redirects to appropriate dashboard

2. **`src/routes/auth.tsx`** - Student login/signup page
   - Added "Continue with Google" button on login tab
   - Added "Continue with Google" button on signup tab
   - Student signup sets intended_role = "student"

3. **`src/routes/mentor-signup.tsx`** - Mentor login/signup page
   - Added "Continue with Google" button
   - Mentor signup sets intended_role = "mentor"

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"**
   - Button calls `signInWithGoogle(role)` with intended role
   - Intended role is stored in localStorage
   - Supabase OAuth flow is initiated

2. **Google Authentication**
   - User selects Google account
   - Google authenticates user
   - Redirects back to `/auth/callback`

3. **OAuth Callback**
   - App exchanges code for session
   - Checks if user exists in database
   - If new user:
     - Retrieves intended role from localStorage
     - Creates user role (student or mentor_pending)
     - Creates mentor profile if mentor
     - Creates user profile from Google data
   - If existing user:
     - Uses existing roles and profile
   - Clears intended role from localStorage
   - Redirects to appropriate dashboard

### Role Assignment

#### Student Signup
- Intended role: `student`
- Creates: `student` role
- Redirects to: `/onboarding` or `/student/dashboard`

#### Mentor Signup
- Intended role: `mentor`
- Creates: `mentor_pending` role
- Creates: `mentor_profiles` entry
- Redirects to: `/mentor/pending`

#### Existing Users
- No role creation
- Uses existing roles
- Redirects based on existing role

## Supabase Configuration Required

### Enable Google OAuth Provider

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** provider
5. Toggle **Enable** to ON
6. Configure OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
7. Save changes

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

### Site URL Configuration

In Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://lingua.app`)
3. Add redirect URLs:
   - `https://lingua.app/auth/callback`
   - `http://localhost:5173/auth/callback` (for development)

## Security Features

### 1. Intended Role Preservation
- Role is stored in localStorage before OAuth
- Survives the OAuth redirect
- Cleared after use
- Cannot be tampered with (only "student" or "mentor" accepted)

### 2. No Privilege Escalation
- Google OAuth callback NEVER accepts role from URL
- Only uses localStorage intended role for NEW users
- Existing users keep their existing roles
- Database is source of truth for roles

### 3. Profile Creation
- Uses Google profile data (name, email, avatar)
- Does NOT override existing profiles
- Safe defaults for missing data

### 4. Error Handling
- Handles user cancellation
- Handles OAuth failures
- Handles network errors
- Never leaves user on blank page

## Testing Checklist

### Test 1: New Student via Google
1. Go to `/auth?mode=signup`
2. Click "Continue with Google"
3. Sign in with Google account
4. ✅ Profile created with student role
5. ✅ Redirected to `/onboarding` or `/student/dashboard`

### Test 2: New Mentor via Google
1. Go to `/mentor-signup?mode=signup`
2. Click "Continue with Google"
3. Sign in with Google account
4. ✅ Profile created with mentor_pending role
5. ✅ Mentor profile created
6. ✅ Redirected to `/mentor/pending`

### Test 3: Existing Student via Google
1. Sign up as student with email/password
2. Logout
3. Click "Continue with Google" with same email
4. ✅ Existing account used
5. ✅ No duplicate profile created
6. ✅ Redirected to student dashboard

### Test 4: Existing Mentor via Google
1. Sign up as mentor with email/password
2. Get approved to mentor role
3. Logout
4. Click "Continue with Google" with same email
5. ✅ Existing account used
6. ✅ Redirected to mentor dashboard

### Test 5: User Cancels Google Login
1. Click "Continue with Google"
2. Cancel Google login
3. ✅ Returns to auth page
4. ✅ No errors

### Test 6: Wrong Role Access
1. Try to access `/admin/*` as student
2. ✅ Blocked by route guard
3. Try to access `/mentor/*` as student
4. ✅ Blocked by route guard

## Environment Variables

No new environment variables required. Uses existing Supabase configuration:

```env
SUPABASE_URL=https://rrxmdipcamedeuabpdyz.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_glBI9aXg1veM8RgptSzuyQ_vMCnwICs
```

## Important Notes

### DO NOT
- ❌ Hardcode Google client secrets in frontend
- ❌ Accept role from URL parameters
- ❌ Allow users to self-assign admin role
- ❌ Create duplicate profiles for existing users
- ❌ Overwrite existing profile data

### DO
- ✅ Use Supabase's built-in Google OAuth
- ✅ Store intended role in localStorage
- ✅ Check database for existing users
- ✅ Use database as source of truth for roles
- ✅ Create appropriate profiles based on role
- ✅ Clear OAuth state after completion

## Troubleshooting

### Google OAuth Not Working
1. Verify Google provider is enabled in Supabase
2. Check Client ID and Secret are correct
3. Verify redirect URIs are configured
4. Check browser console for errors

### Users Getting Wrong Role
1. Check localStorage for `lingua_intended_role`
2. Verify OAuth callback is reading intended role
3. Check database trigger `handle_new_user` is working
4. Review callback logs in console

### Duplicate Profiles
1. Check if email matches existing user
2. Verify `upsert` is used, not `insert`
3. Check unique constraints on profiles table

## Architecture Consistency

This implementation integrates with the SAME role creation system used for email/password signup:

- Email/password signup uses `intended_role` in user_metadata
- Google OAuth uses `intended_role` in localStorage
- Both call the same database trigger `handle_new_user`
- Both create the same role/profile structure
- No duplicate or conflicting role systems

## Production Deployment

Before deploying to production:

1. ✅ Enable Google provider in Supabase
2. ✅ Configure Google Cloud Console credentials
3. ✅ Set production Site URL in Supabase
4. ✅ Add production redirect URLs
5. ✅ Test all 7 authentication flows
6. ✅ Verify role assignment is correct
7. ✅ Check error handling works
8. ✅ Verify no duplicate users created

## Support

For issues or questions:
- Check Supabase Auth logs in dashboard
- Review browser console for client errors
- Check network tab for failed requests
- Verify database triggers are working