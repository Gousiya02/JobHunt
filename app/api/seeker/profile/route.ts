import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { SeekerProfile } from '@/lib/models';
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
    const profile = await SeekerProfile.findOne({ email });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error fetching seeker profile:', error);
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
    const { name, phone, skills, availability, experienceLevel, locality, languages, photo } = body;

    if (!name || !locality || !experienceLevel) {
      return NextResponse.json({ error: 'Name, Locality, and Experience Level are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Geocode the locality using Nominatim
    const geocodeResult = await geocodeAddress(locality);
    if (!geocodeResult) {
      return NextResponse.json({
        error: `Could not locate "${locality}" on the map. Please simplify the locality or check spelling (e.g. "BTM Layout, Bangalore").`
      }, { status: 400 });
    }
    const coordinates = [geocodeResult.lng, geocodeResult.lat];

    const updatedProfile = await SeekerProfile.findOneAndUpdate(
      { email },
      {
        name,
        phone: phone || '',
        skills: skills || [],
        availability: availability || [],
        experienceLevel,
        locality,
        location: {
          type: 'Point',
          coordinates // [lng, lat]
        },
        languages: languages || [],
        photo: photo || '',
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    console.error('Error saving seeker profile:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
