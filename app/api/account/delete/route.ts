// app/api/account/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user from Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role for admin operations (cascade delete + auth user removal)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userId = user.id;

    // 1. Get all trees owned by this user
    const { data: trees } = await supabaseAdmin
      .from('trees')
      .select('id')
      .eq('user_id', userId);

    const treeIds = trees?.map(t => t.id) || [];

    if (treeIds.length > 0) {
      // 2. Get all people in user's trees (for photo cleanup)
      const { data: people } = await supabaseAdmin
        .from('people')
        .select('id, photo_url')
        .in('tree_id', treeIds);

      // 3. Delete relationships in user's trees
      await supabaseAdmin
        .from('relationships')
        .delete()
        .in('tree_id', treeIds);

      // 4. Delete people in user's trees
      await supabaseAdmin
        .from('people')
        .delete()
        .in('tree_id', treeIds);

      // 5. Delete share links for user's trees
      await supabaseAdmin
        .from('share_links')
        .delete()
        .in('tree_id', treeIds);

      // 6. Delete trees
      await supabaseAdmin
        .from('trees')
        .delete()
        .eq('user_id', userId);

      // 7. Clean up photos from storage
      if (people && people.length > 0) {
        const photoPaths = people
          .filter(p => p.photo_url && p.photo_url.includes('/photos/'))
          .map(p => {
            // Extract path after /photos/ bucket
            const match = p.photo_url.match(/photos\/(.+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (photoPaths.length > 0) {
          await supabaseAdmin.storage
            .from('photos')
            .remove(photoPaths);
        }
      }
    }

    // 8. Delete purchases
    await supabaseAdmin
      .from('purchases')
      .delete()
      .eq('user_id', userId);

    // 9. Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 10. Delete auth user (requires service role)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please contact support.' },
      { status: 500 }
    );
  }
}
