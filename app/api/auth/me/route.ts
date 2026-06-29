import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { SeekerProfile, CompanyProfile } from '@/lib/models';

export async function GET() {
  try {
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ authenticated: false, googleConfigured });
    }

    const email = session.user.email;

    await connectToDatabase();
    
    // Check if seeker profile exists
    const seeker = await SeekerProfile.findOne({ email });
    
    // Check if company profiles exist
    const companies = await CompanyProfile.find({ ownerEmail: email });

    return NextResponse.json({
      authenticated: true,
      googleConfigured,
      email,
      name: session.user.name,
      image: session.user.image,
      hasSeekerProfile: !!seeker,
      seekerProfile: seeker,
      hasCompanyProfile: companies.length > 0,
      companyProfiles: companies
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false, googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) }, { status: 500 });
  }
}
export async function DELETE() {
  // Clear session if next-auth is not used or let it sign out on client side
  return NextResponse.json({ success: true });
}
