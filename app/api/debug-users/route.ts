import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../Database/db';
import { UsersTable } from '../../Database/schema';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API: Getting ALL users from UsersTable');

    // Get ALL users from the UsersTable
    const allUsers = await db
      .select()
      .from(UsersTable);

    console.log(`🔍 Debug API: Found ${allUsers.length} total users`);
    console.log(`🔍 Debug API: Users:`, allUsers);

    return NextResponse.json({
      count: allUsers.length,
      users: allUsers
    });
  } catch (error) {
    console.error('🔍 Debug API: Error fetching users:', error);
    console.error('🔍 Debug API: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
