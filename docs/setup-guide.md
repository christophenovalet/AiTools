# Setup Guide: Local Development & Deployment

This guide walks you through setting up the AI Tools application with cloud storage, Google authentication, and offline sync.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Google Cloud account
- Supabase account
- Netlify account (for deployment)

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- `@supabase/supabase-js` - Supabase client
- `jsonwebtoken` - JWT token management
- `google-auth-library` - Google OAuth verification
- `idb` - IndexedDB wrapper for offline sync queue

## Step 2: Set Up Google OAuth

### Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **OAuth 2.0 Client ID**
6. Configure OAuth consent screen:
   - User Type: External
   - App name: AI Tools
   - Support email: Your email
   - Authorized domains: `netlify.app`, your custom domain
7. Create OAuth Client ID:
   - Application type: Web application
   - Name: AI Tools Web Client
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://your-site.netlify.app` (production)
   - Authorized redirect URIs:
     - `http://localhost:5173` (development)
     - `https://your-site.netlify.app` (production)
8. Save **Client ID** and **Client Secret**

## Step 3: Set Up Supabase

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save database password
4. Wait for project to finish provisioning

### Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy contents of `database/supabase-schema.sql`
3. Paste and run in SQL Editor
4. Verify tables created in **Table Editor**

### Get API Keys

1. Go to **Project Settings** > **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (for client-side)
   - **service_role** key (for server-side, KEEP SECRET)

## Step 4: Configure Environment Variables

### Local Development

Create `.env` file in project root:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT
JWT_SECRET=your-random-secret-at-least-32-characters-long
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Netlify Deployment

Add environment variables in Netlify dashboard:

1. Go to **Site settings** > **Environment variables**
2. Add each variable from above
3. Make sure to mark as **Secret** for sensitive values

## Step 5: Update Client Configuration

Create `src/config/auth.js`:

```javascript
export const GOOGLE_CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com';
export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5050/.netlify/functions'
  : 'https://your-site.netlify.app/.netlify/functions';
```

## Step 6: Run Locally

### Start Development Server

```bash
npm run dev
```

This starts Vite dev server on `http://localhost:5173`

### Start Netlify Functions Locally

In a separate terminal:

```bash
npx netlify dev
```

This starts:
- Vite on port 5173
- Netlify Functions on port 5050

Access the app at the URL shown (usually `http://localhost:5050`)

## Step 7: Deploy to Netlify

### Connect Repository

1. Push code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click **Add new site** > **Import an existing project**
4. Connect to GitHub and select your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Add Environment Variables

In Netlify dashboard:
1. **Site settings** > **Environment variables**
2. Add all variables from `.env`
3. Deploy site

### Test Deployment

1. Visit your Netlify URL
2. Click "Sign in with Google"
3. Authorize the application
4. Verify you can create projects and they sync

## Step 8: Verify Everything Works

### Test Checklist

- [ ] Google Sign In works
- [ ] API keys can be saved (encrypted)
- [ ] Projects can be created
- [ ] Data appears in Supabase dashboard
- [ ] Offline mode queues changes
- [ ] Online mode syncs changes
- [ ] Multi-device sync works

### Check Supabase Data

In Supabase dashboard:
1. Go to **Table Editor**
2. View `users` table - your account should be there
3. View `projects` table - should see test project
4. View `user_settings` table - API keys should be encrypted

### Check Netlify Functions

In Netlify dashboard:
1. Go to **Functions**
2. Check recent invocations
3. View logs for any errors

## Troubleshooting

### Google Sign In Not Working

- Check OAuth credentials are correct
- Verify authorized origins include your domain
- Check browser console for errors
- Clear cookies and try again

### Database Connection Issues

- Verify Supabase URL is correct
- Check service role key is valid
- Ensure RLS policies are enabled
- Check Supabase logs

### Netlify Functions Errors

- Check environment variables are set
- View function logs in Netlify dashboard
- Test functions locally with `netlify dev`
- Check Node version is 18+

### Sync Not Working

- Check browser console for errors
- Verify you're signed in
- Check network tab for failed requests
- Try manual sync from settings page

## Security Notes

### Important Security Practices

1. **NEVER commit `.env` to git** - it's already in `.gitignore`
2. **Keep service_role key secret** - only use server-side
3. **Use HTTPS in production** - Netlify provides this automatically
4. **Enable RLS on all tables** - already done in schema
5. **Rotate JWT secret periodically** - invalidates all tokens
6. **Monitor Supabase logs** - watch for suspicious activity

### Rate Limiting

The application includes basic rate limiting:
- 100 requests per minute per user
- Returns 429 status when exceeded
- For production, consider Redis-based rate limiting

## Monitoring & Maintenance

### Check Quotas

**Netlify Free Tier:**
- 125k function invocations/month
- 100 hours runtime/month
- Monitor in Netlify dashboard

**Supabase Free Tier:**
- 500MB database storage
- 2GB bandwidth/month
- Monitor in Supabase dashboard

### Backup Strategy

1. **Database**: Supabase auto-backups daily (7-day retention)
2. **User data**: Users should export localStorage before migration
3. **Manual backups**: Use Supabase dashboard to create on-demand backups

### Update Dependencies

Periodically update dependencies:

```bash
npm outdated
npm update
```

Test thoroughly after updates.

## Next Steps

After setup is complete:
1. Test all features thoroughly
2. Migrate existing user data (see `migration-guide.md`)
3. Monitor usage and performance
4. Set up error tracking (Sentry recommended)
5. Configure custom domain (optional)

## Support

For issues:
1. Check browser console and Netlify logs
2. Review Supabase dashboard for errors
3. Test with `netlify dev` locally
4. Check network requests in DevTools
