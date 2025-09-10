import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, type } = body;

    console.log(`📧 Email API called:`, {
      type,
      recipientCount: Array.isArray(to) ? to.length : 1,
      subject,
    });

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, simulating email send');
      
      // Fallback: Log the email details instead of sending
      console.log(`📧 Would send email via Resend:`, {
        to: Array.isArray(to) ? to : [to],
        subject,
        htmlLength: html.length,
        type
      });

      const recipientCount = Array.isArray(to) ? to.length : 1;
      return NextResponse.json({
        success: true,
        message: `Email simulated for ${recipientCount} recipient(s) (RESEND_API_KEY not configured)`,
        sent: recipientCount,
        errors: []
      });
    }

    // Send email using Resend
    const emailData = {
      from: 'PrediWin <noreply@prediwin.com>', // Verified domain
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    console.log(`📧 Sending email via Resend:`, {
      to: emailData.to,
      subject: emailData.subject,
      fromDomain: emailData.from
    });

    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send email via Resend',
          details: result.error.message || 'Unknown Resend error'
        },
        { status: 500 }
      );
    }

    console.log('✅ Email sent successfully via Resend:', result.data?.id);

    const recipientCount = Array.isArray(to) ? to.length : 1;
    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${recipientCount} recipient(s)`,
      sent: recipientCount,
      errors: [],
      resendId: result.data?.id
    });

  } catch (error) {
    console.error('❌ Email API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}