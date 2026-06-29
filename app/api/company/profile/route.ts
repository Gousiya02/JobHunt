import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { CompanyProfile } from '@/lib/models';
import { geocodeAddress } from '@/lib/geocoding';

async function getAuthEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}

export async function GET() {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Fetch companies where ownerEmail matches authenticated Google email
    const companies = await CompanyProfile.find({ ownerEmail: email });
    return NextResponse.json(companies);
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, companyName, category, address, ownerPhone } = body;

    if (!companyName || !category || !address || !ownerPhone) {
      return NextResponse.json({ error: 'Company Name, Category, Address, and Owner Phone are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Geocode the address using Nominatim
    const geocodeResult = await geocodeAddress(address);
    if (!geocodeResult) {
      return NextResponse.json({
        error: `Could not locate "${address}" on the map. Please simplify the address or check spelling (e.g. "Whitefield, Bangalore").`
      }, { status: 400 });
    }
    const coordinates = [geocodeResult.lng, geocodeResult.lat];

    if (companyId) {
      const updatedCompany = await CompanyProfile.findOneAndUpdate(
        { _id: companyId, ownerEmail: email },
        {
          companyName,
          category,
          address,
          location: {
            type: 'Point',
            coordinates
          },
          ownerPhone
        },
        { new: true }
      );
      if (!updatedCompany) {
        return NextResponse.json({ error: 'Company not found or unauthorized' }, { status: 404 });
      }
      return NextResponse.json(updatedCompany);
    } else {
      const newCompany = await CompanyProfile.create({
        companyName,
        category,
        address,
        location: {
          type: 'Point',
          coordinates // [lng, lat]
        },
        ownerPhone,
        ownerEmail: email, // Google sign-in email
        isVerified: false
      });
      return NextResponse.json(newCompany, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating company profile:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
