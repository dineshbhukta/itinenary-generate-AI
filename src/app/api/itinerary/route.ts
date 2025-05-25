import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface Entry {
  location: string;
  from: string;
  to: string;
}

interface ItineraryRequestBody {
  entries: Entry[];
}

// Expanded city-to-IATA code mapping (lowercase keys for case-insensitive matching)
function getIATACode(city: string): string | null {
  const mapping: Record<string, string> = {
    mumbai: "BOM",
    delhi: "DEL",
    bangalore: "BLR",
    chennai: "MAA",
    kolkata: "CCU",
    hyderabad: "HYD",
    ahmedabad: "AMD",
    pune: "PNQ",
    goa: "GOI",
    jaipur: "JAI",
    lucknow: "LKO",
    cochin: "COK",
    trivandrum: "TRV",
    varanasi: "VNS",
    guwahati: "GAU",
    surat: "STV",
    ranchi: "IXR",
    bhopal: "BHO",
    chandigarh: "IXC",
    indore: "IDR",
    nagpur: "NAG",
    vadodara: "BDQ",
    bhubaneshwar: "BBI",
  };
  return mapping[city.toLowerCase()] || null;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey || !rapidApiKey) {
      return NextResponse.json(
        { error: "Missing API configuration." },
        { status: 500 }
      );
    }

    const { entries }: ItineraryRequestBody = await req.json();
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing entries." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const formattedEntries = entries
      .map((e, i) => `Location ${i + 1}: ${e.location} (${e.from} to ${e.to})`)
      .join("\n");

    const prompt = `
Generate a family-friendly travel itinerary based on the following locations and dates:

${formattedEntries}

Include:
- Suggested transportation between locations if there are multiple destinations (e.g., train, flight, rental car)
- Activities
- Sightseeing
- Local cuisine
- Recommended accommodations

Format the itinerary like this:
**Day 1 (June 1, 2025):** Activity 1, Activity 2, etc.
**Transportation:** If applicable, describe the travel method and time between locations.
**Day 2 (June 2, 2025):** Activity 1, Activity 2, etc.

Make sure the itinerary includes travel time between cities if there are multiple stops.

Keep the tone friendly and informative.
`;

    const result = await model.generateContent(prompt);

    const output =
      typeof result.response?.text === "function"
        ? await result.response.text()
        : "No response generated.";

    const itinerary = parseItinerary(output);

    // === Fetch Flight Data for Consecutive City Pairs ===
    const flightData = [];

    for (let i = 0; i < entries.length - 1; i++) {
      const originCity = entries[i].location;
      const destinationCity = entries[i + 1].location;

      const originIATA = getIATACode(originCity);
      const destinationIATA = getIATACode(destinationCity);

      if (!originIATA || !destinationIATA) {
        flightData.push({
          from: originCity,
          to: destinationCity,
          flights: [],
          error: "Missing IATA code for origin or destination",
        });
        continue;
      }

      const fromId = `${originIATA}.AIRPORT`;
      const toId = `${destinationIATA}.AIRPORT`;

      // Use the departure date from the "to" date of the current entry or "from" date of next
      // Assuming entries[i].to is the date leaving originCity
      const departDateISO = entries[i].to; // e.g. "2025-05-20T18:58:40.606Z"
      const departDate = new Date(departDateISO).toISOString().slice(0, 10); // "YYYY-MM-DD"

      try {
        const flightRes = await axios.get(
          "https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights",
          {
            params: {
              fromId,
              toId,
              departDate,
              stops: "none",
              pageNo: 1,
              adults: 1,
              children: "0,17",
              sort: "BEST",
              cabinClass: "ECONOMY",
              currency_code: "INR",
            },
            headers: {
              "x-rapidapi-host": "booking-com15.p.rapidapi.com",
              "x-rapidapi-key": rapidApiKey,
            },
          }
        );

        console.log(
          "Flight API raw response:",
          JSON.stringify(flightRes.data, null, 2)
        );

        // Safely navigate the response
        const aggData = flightRes.data?.data?.aggregation;
        if (!aggData || !aggData.airlines) {
          throw new Error("Missing aggregation.airlines in API response");
        }

        const airlines = aggData.airlines.map((airline: any) => ({
          name: airline.name,
          logoUrl: airline.logoUrl,
          iataCode: airline.iataCode,
          flightCount: airline.count,
          minPrice: {
            currencyCode: airline.minPrice?.currencyCode,
            units: airline.minPrice?.units,
            nanos: airline.minPrice?.nanos,
          },
        }));

        flightData.push({
          from: originCity,
          to: destinationCity,
          airlines,
        });
      } catch (err: any) {
        console.error("Flight fetch error:", err.message || err);
        flightData.push({
          from: originCity,
          to: destinationCity,
          airlines: [],
          error: err.message || "Failed to fetch flights",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        itinerary,
        flightData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error generating itinerary:", error.message || error);
    return NextResponse.json(
      { error: "An error occurred while generating the itinerary." },
      { status: 500 }
    );
  }
}

function parseItinerary(output: string): string[] {
  const itineraryDetails: string[] = [];
  const dayPattern = /\*\*Day \d+ \([^\)]+\):.*?(?=\n\*\*Day \d+ \(|$)/gs;

  const dayMatches = [...output.matchAll(dayPattern)];
  for (const match of dayMatches) {
    itineraryDetails.push(match[0].trim());
  }

  return itineraryDetails.length ? itineraryDetails : [output];
}
