import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../Database/db';
import { PotInformation } from '../../Database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, hasStarted, isFinalDay, startedOnDate, lastDayDate } = await request.json();

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    // Update or insert pot information
    const result = await db
      .insert(PotInformation)
      .values({
        contractAddress: contractAddress.toLowerCase(),
        hasStarted,
        isFinalDay,
        startedOnDate,
        lastDayDate
      })
      .onConflictDoUpdate({
        target: PotInformation.contractAddress,
        set: {
          hasStarted,
          isFinalDay,
          startedOnDate,
          lastDayDate,
          createdAt: new Date() // Update timestamp
        }
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: result[0] 
    });

  } catch (error) {
    console.error('Error updating pot information:', error);
    return NextResponse.json({ error: 'Failed to update pot information' }, { status: 500 });
  }
}