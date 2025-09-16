import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../Database/db';
import { PotInformation } from '../../Database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { contractAddress } = await request.json();

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    // Fetch pot information from database
    const potInfo = await db
      .select()
      .from(PotInformation)
      .where(eq(PotInformation.contractAddress, contractAddress.toLowerCase()))
      .limit(1);

    if (potInfo.length === 0) {
      // If no record exists, return default values
      return NextResponse.json({
        hasStarted: false,
        isFinalDay: false,
        startedOnDate: null,
        lastDayDate: null,
        announcementSent: false
      });
    }

    const info = potInfo[0];
    return NextResponse.json({
      hasStarted: info.hasStarted,
      isFinalDay: info.isFinalDay,
      startedOnDate: info.startedOnDate,
      lastDayDate: info.lastDayDate,
      announcementSent: info.announcementSent || false
    });

  } catch (error) {
    console.error('Error fetching pot information:', error);
    return NextResponse.json({ error: 'Failed to fetch pot information' }, { status: 500 });
  }
}