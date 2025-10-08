import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugPosts() {
  console.log('\n🔍 CHECKING YOUR PROFILE AND POSTS...\n');
  console.log('📍 Database:', SUPABASE_URL);
  
  // First check the profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'fc3aa144-2fec-4e17-9fe3-0e19070dbc52')
    .single();
  
  console.log('\n👤 YOUR PROFILE:');
  if (profileError) {
    console.log('❌ Profile Error:', profileError);
  } else if (profile) {
    console.log('✅ Profile exists!');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email || 'NULL ❌');
    console.log('   Display Name:', profile.display_name || 'NULL ❌');
    console.log('   Username:', profile.username || 'NULL ❌');
    console.log('   Username Normalized:', profile.username_normalized || 'NULL ❌');
  } else {
    console.log('❌ NO PROFILE FOUND!');
  }
  
  console.log('\n---\n');
  
  // First, get posts without joins
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching posts:', error);
    return;
  }

  console.log(`\n📊 TOTAL POSTS FOUND: ${posts?.length || 0}\n`);

  if (!posts || posts.length === 0) {
    console.log('❌ No posts found in database!');
    console.log('\n✅ Debug complete!\n');
    process.exit(0);
  }

  // Now get profiles separately
  const authorIds = [...new Set(posts.map(p => p.author_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`\n📊 TOTAL POSTS FOUND: ${posts?.length || 0}\n`);

  const profileMap = new Map();
  if (profiles) {
    profiles.forEach(p => profileMap.set(p.id, p));
  }

  posts.forEach((post, index) => {
    const profile = profileMap.get(post.author_id);
    console.log(`\n--- POST ${index + 1} ---`);
    console.log(`📝 Content: "${post.content}"`);
    console.log(`🆔 Post ID: ${post.id}`);
    console.log(`👤 Author ID: ${post.author_id}`);
    console.log(`📧 Author Email: ${profile?.email || 'NO EMAIL'}`);
    console.log(`🏷️  Author Display Name: ${profile?.display_name || 'NO DISPLAY NAME'}`);
    console.log(`🔤 Author Username Normalized: ${profile?.username_normalized || 'NULL/MISSING ❌'}`);
    console.log(`🏛️  Union ID: ${post.union_id || 'NO UNION'}`);
    console.log(`🌐 Public: ${post.is_public ? 'Yes' : 'No'}`);
    console.log(`📅 Created: ${new Date(post.created_at).toLocaleString()}`);
  });

  const missingUsernames = posts.filter(p => {
    const profile = profileMap.get(p.author_id);
    return !profile?.username_normalized;
  });
  
  if (missingUsernames.length > 0) {
    console.log(`\n⚠️  WARNING: ${missingUsernames.length} posts have missing username_normalized!`);
    console.log('This is why they are not displaying in the app.');
    console.log('\n💡 FIX: Run this in Supabase SQL Editor:');
    console.log('UPDATE profiles SET username_normalized = LOWER(display_name) WHERE username_normalized IS NULL;');
  }

  console.log('\n✅ Debug complete!\n');
  process.exit(0);
}

debugPosts();
