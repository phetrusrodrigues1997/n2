import { NextRequest, NextResponse } from 'next/server';
import { getWrongPredictions } from '../../Database/OwnerActions';

export async function POST(request: NextRequest) {
  try {
    const { tableType } = await request.json();
    
    if (!tableType) {
      return NextResponse.json(
        { error: 'Table type is required' },
        { status: 400 }
      );
    }

    const wrongPredictionAddresses = await getWrongPredictions(tableType);
    
    // Return in format expected by frontend
    const wrongPredictions = wrongPredictionAddresses.map(address => ({
      walletAddress: address
    }));
    
    return NextResponse.json({
      success: true,
      wrongPredictions
    });
  } catch (error) {
    console.error('Error fetching wrong predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wrong predictions' },
      { status: 500 }
    );
  }
}