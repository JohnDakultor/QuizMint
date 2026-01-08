// import { headers } from "next/headers";
// import { NextResponse } from "next/server";

// export async function GET() {
//   const country = (await headers()).get("x-vercel-ip-country") ?? "US";

//   const currencyMap: Record<
//     string,
//     { currency: string; symbol: string }
//   > = {
//     US: { currency: "USD", symbol: "$" },
//     SA: { currency: "SAR", symbol: "﷼" },
//     AE: { currency: "AED", symbol: "د.إ" },
//     PH: { currency: "PHP", symbol: "₱" },
//     IN: { currency: "INR", symbol: "₹" },
//     GB: { currency: "GBP", symbol: "£" },
//     EU: { currency: "EUR", symbol: "€" },
//   };

//   const result =
//     currencyMap[country] ?? currencyMap["US"];

//   return NextResponse.json({
//     country,
//     currency: result.currency,
//     symbol: result.symbol,
//   });
// }


import { headers } from "next/headers";
import { NextResponse } from "next/server";

const BASE_PRICES = {
  pro: 5,      // in USD
  premium: 15, // in USD
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Localhost testing override
  const overrideCountry = url.searchParams.get("country"); // e.g., ?country=PH
  const country = overrideCountry ?? (await headers()).get("x-vercel-ip-country") ?? "US";

  // Country → currency mapping
  const COUNTRY_TO_CURRENCY: Record<string, string> = {
    US: "USD",
    SA: "SAR",
    PH: "PHP",
    AE: "AED",
    GB: "GBP",
    EU: "EUR",
    IN: "INR",
  };

  const currency = COUNTRY_TO_CURRENCY[country] ?? "USD";

  let convertedPrices = { ...BASE_PRICES };

  if (currency !== "USD") {
    try {
      const res = await fetch(
        `https://api.apilayer.com/exchangerates_data/latest?base=USD&symbols=${currency}`,
        {
          method: "GET",
          headers: {
            apikey: process.env.EXCHANGE_RATE_API_KEY!,
          },
        }
      );

      const data = await res.json();
      const rate = data?.rates?.[currency];

      if (rate) {
        convertedPrices = {
          pro: Math.round(BASE_PRICES.pro * rate),
          premium: Math.round(BASE_PRICES.premium * rate),
        };
      } else {
        console.warn("Exchange rate not found, using USD prices");
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate, using USD prices", err);
    }
  }

  console.log("Currency API response:", { country, currency, convertedPrices });

  return NextResponse.json({
    country,
    currency,
    prices: convertedPrices,
  });
}
