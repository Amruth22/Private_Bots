// File: app/api/ask/route.ts
import { NextResponse } from 'next/server';

interface AskResponse {
  answer: string;
}

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON request
    const { question } = await request.json();

    // Input Validation
    if (!question || typeof question !== 'string') {
      console.error('Invalid question provided.');
      return NextResponse.json(
        { error: 'Invalid question provided.' },
        { status: 400 }
      );
    }

    // Prepare payload for the external API
    const payload = { question, file: null }; // Omit 'file' if not needed

    // Set a timeout for the external API request (e.g., 25 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 50000); // 25,000 milliseconds = 25 seconds

    // Make a request to the external API
    const externalResponse = await fetch(
      'https://custom-gpt-azures-fix-406df467a391.herokuapp.com/ask',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout); // Clear the timeout once the request completes

    // Handle non-OK responses from the external API
    if (!externalResponse.ok) {
      const errorData = await externalResponse.text(); // Read as text first
      console.error('External API Error:', errorData);

      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        // If not JSON, return the plain text error
        parsedError = { error: errorData };
      }

      return NextResponse.json(
        { error: parsedError.error || 'Error from external API.' },
        { status: externalResponse.status }
      );
    }

    // Parse the response from the external API
    const data: AskResponse = await externalResponse.json();

    // Validate the response structure
    if (!data.answer) {
      console.error('Invalid response structure from external API:', data);
      return NextResponse.json(
        { error: 'Invalid response from external API.' },
        { status: 502 }
      );
    }

    // Return the answer to the client
    return NextResponse.json({ answer: data.answer }, { status: 200 });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('External API request timed out.');
      return NextResponse.json(
        { error: 'The request to the external service timed out. Please try again later.' },
        { status: 504 }
      );
    }

    // Log the error for debugging purposes
    console.error('Error in /api/ask:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
