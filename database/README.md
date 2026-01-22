# Database Setup Instructions

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: ai-tools
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free

### 2. Run Schema SQL

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase-schema.sql`
4. Paste into the editor
5. Click "Run" or press Ctrl+Enter
6. Verify all tables were created (check **Table Editor**)

### 3. Get API Credentials

1. Go to **Project Settings** > **API**
2. Copy these values (you'll need them for Netlify):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (this is safe for client-side)
   - **service_role key**: `eyJhbGc...` (NEVER expose client-side, use server-side only)

### 4. Configure RLS (Row-Level Security)

The schema already includes RLS policies, but verify:

1. Go to **Authentication** > **Policies**
2. Each table should have policies visible
3. Test by creating a test user and checking they can only see their data

## Environment Variables

Add these to your Netlify environment variables:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
JWT_SECRET=your-random-secret-here
```

## Testing the Database

You can test the database directly in Supabase:

```sql
-- Insert a test user
INSERT INTO users (google_id, email, name)
VALUES ('test123', 'test@example.com', 'Test User');

-- Insert a test project
INSERT INTO projects (user_id, project_id, name, color, data)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com'),
  1234567890,
  'Test Project',
  '#3b82f6',
  '{"texts": [], "createdAt": 1234567890}'::jsonb
);

-- Query user's projects
SELECT * FROM projects WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

## Backup

Supabase free tier includes:
- Automatic daily backups (7-day retention)
- Point-in-time recovery

For manual backups:
1. Go to **Database** > **Backups**
2. Click "Create Backup"

## Monitoring

Monitor your database usage:
1. Go to **Project Settings** > **Usage**
2. Check:
   - Database size (500MB limit on free tier)
   - Bandwidth (2GB/month limit)
   - Active connections

## Troubleshooting

### RLS Policies Not Working

If users can't access their data:

1. Check that `app.user_id` is being set in your API calls
2. In Netlify functions, use:
   ```javascript
   await supabase.rpc('set_config', {
     setting: 'app.user_id',
     value: userId
   })
   ```

### Connection Issues

If you get connection errors:
1. Verify the Supabase URL is correct
2. Check your service role key is valid
3. Ensure your IP isn't blocked (check Supabase dashboard)

### Migration from localStorage

See `../docs/migration-guide.md` for step-by-step instructions on migrating existing user data.
