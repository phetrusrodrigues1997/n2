import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../Database/db';
import { Messages } from '../../Database/schema';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API: Getting ALL messages from Messages table');

    // Get ALL messages from the Messages table (no filtering)
    const allMessages = await db
      .select()
      .from(Messages)
      .orderBy(Messages.datetime);

    console.log(`🔍 Debug API: Found ${allMessages.length} total messages`);
    console.log(`🔍 Debug API: First 3 messages:`, allMessages.slice(0, 3));

    return NextResponse.json(allMessages);
  } catch (error) {
    console.error('🔍 Debug API: Error fetching all messages:', error);
    console.error('🔍 Debug API: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}