import { NextRequest, NextResponse } from 'next/server';
import { createContractAnnouncement, createContractAnnouncementSafe } from '../../Database/actions';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 ==========================================');
    console.log('🧪 TEST NOTIFICATION API');
    console.log('🧪 ==========================================');

    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get('type') || 'safe'; // 'safe' or 'direct'
    const contractAddress = searchParams.get('contract') || '0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c';

    const messageEn = 'Test notification in English 🎉';
    const messagePt = 'Notificação de teste em Português 🎉';

    console.log('🧪 Test parameters:');
    console.log('🧪   Type:', testType);
    console.log('🧪   Contract:', contractAddress);
    console.log('🧪   Message EN:', messageEn);
    console.log('🧪   Message PT:', messagePt);

    let result;

    if (testType === 'direct') {
      console.log('🧪 Testing createContractAnnouncement (direct)...');
      result = await createContractAnnouncement(messageEn, contractAddress, messagePt);
    } else {
      console.log('🧪 Testing createContractAnnouncementSafe (with deduplication)...');
      result = await createContractAnnouncementSafe(messageEn, contractAddress, messagePt);
    }

    console.log('🧪 Test result:', result);
    console.log('🧪 ==========================================');

    return NextResponse.json({
      success: true,
      testType,
      result,
      message: 'Test notification created successfully'
    });
  } catch (error) {
    console.error('🧪 Test API Error:', error);
    return NextResponse.json({
      error: 'Failed to create test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
