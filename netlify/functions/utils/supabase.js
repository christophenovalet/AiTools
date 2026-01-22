/**
 * Supabase client utility for Netlify Functions
 * Server-side only - uses service role key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key (bypasses RLS for server operations)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Set the user context for RLS policies
 * Must be called before any database operations
 */
export async function setUserContext(userId) {
  const { error } = await supabase.rpc('set_config', {
    setting: 'app.user_id',
    value: userId
  });

  if (error) {
    console.error('Failed to set user context:', error);
    throw new Error('Failed to set user context');
  }
}

/**
 * Get or create user from Google OAuth data
 */
export async function getOrCreateUser(googleProfile) {
  const { sub: googleId, email, name, picture } = googleProfile;

  // Check if user exists
  let { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching user:', fetchError);
    throw new Error('Database error');
  }

  if (existingUser) {
    // Update last login
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      throw new Error('Database error');
    }

    return updatedUser;
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      google_id: googleId,
      email,
      name,
      picture_url: picture
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating user:', createError);
    throw new Error('Database error');
  }

  return newUser;
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}
