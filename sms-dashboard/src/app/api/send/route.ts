import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // ১. API Key রিসিভ করা (SaaS আর্কিটেকচার)
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized Request. API Key is missing.' },
        { status: 401 }
      );
    }

    // ২. রিকোয়েস্ট থেকে ডাটা বের করা
    const body = await request.json();
    const { phone_number, message } = body;

    // ৩. ভ্যালিডেশন
    if (!phone_number || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // ৪. ডাটাবেস কানেকশন তৈরি
    const supabase = await createClient();

    // ৫. ডাটাবেসের messages টেবিলে ডাটা এবং API Key সেভ করা
    const { data, error } = await supabase
      .from('messages')
      .insert([
        { 
          phone_number: phone_number, 
          message: message, 
          status: 'pending',
          api_key: apiKey // নতুন যুক্ত করা কলাম
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json(
        { error: 'Failed to queue message in database' },
        { status: 500 }
      );
    }

    // ৬. সফলভাবে সেভ হলে সাকসেস রেসপন্স
    return NextResponse.json(
      { success: true, message: 'Message queued successfully', data },
      { status: 200 }
    );

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}