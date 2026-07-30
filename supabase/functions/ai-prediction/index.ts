import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelemetryRow {
  recorded_at: string;
  temperature: number;
  humidity: number;
  pressure?: number;
  battery_level?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  speed_kmh?: number;
  door_status: string;
  cooling_system_status: string;
}

interface ShipmentRow {
  id: string;
  shipment_number: string;
  medicine_name: string;
  medicine_type: string;
  batch_number: string;
  required_temp_min: number;
  required_temp_max: number;
  current_temp: number;
  status: string;
  risk_level: string;
  origin_city: string;
  destination_city: string;
  eta: string;
}

function buildPrompt(shipment: ShipmentRow, telemetry: TelemetryRow[]) {
  const tempReadings = telemetry.map(t => `${t.recorded_at}: ${t.temperature}°C (humidity ${t.humidity}%, cooling ${t.cooling_system_status}, door ${t.door_status}, battery ${t.battery_level ?? 'N/A'}%)`);
  const recentTemps = telemetry.slice(-20).map(t => t.temperature);
  const minTemp = Math.min(...recentTemps);
  const maxTemp = Math.max(...recentTemps);
  const avgTemp = recentTemps.reduce((a, b) => a + b, 0) / recentTemps.length;
  const tempVariance = maxTemp - minTemp;

  return `You are an expert cold chain logistics AI for healthcare/pharmaceutical shipments. Analyze the following shipment and telemetry data to predict spoilage risk.

SHIPMENT DETAILS:
- Shipment Number: ${shipment.shipment_number}
- Medicine: ${shipment.medicine_name} (${shipment.medicine_type})
- Batch: ${shipment.batch_number}
- Required Temperature Range: ${shipment.required_temp_min}°C to ${shipment.required_temp_max}°C
- Current Temperature: ${shipment.current_temp}°C
- Status: ${shipment.status}
- Current Risk Level: ${shipment.risk_level}
- Route: ${shipment.origin_city} → ${shipment.destination_city}
- ETA: ${shipment.eta}

TELEMETRY ANALYSIS:
- Recent readings (last 20): ${tempReadings.slice(-20).join(' | ')}
- Min Temp: ${minTemp}°C, Max Temp: ${maxTemp}°C, Avg Temp: ${avgTemp.toFixed(2)}°C
- Temperature Variance: ${tempVariance.toFixed(2)}°C
- Required range compliance: ${minTemp >= shipment.required_temp_min && maxTemp <= shipment.required_temp_max ? 'WITHIN RANGE' : 'OUT OF RANGE'}

Based on this data, provide a risk prediction. Respond ONLY with a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "risk_score": <number 0-100>,
  "risk_level": "<safe|medium|critical>",
  "remaining_thermal_stability": <number of hours until spoilage, 0-72>,
  "confidence": <number 0-1>,
  "reason": "<detailed explanation of the risk factors, 2-3 sentences>",
  "recommendation": "<actionable recommendation, 1-2 sentences>",
  "contributing_factors": ["<factor1>", "<factor2>", "<factor3>"]
}

Rules:
- risk_score 0-30 = safe, 31-65 = medium, 66-100 = critical
- Consider temperature excursions, cooling system health, battery level, door openings, humidity, and variance
- If temperature is within range and cooling is active, risk should be low
- If temperature is out of range or cooling system is off, risk should be high
- remaining_thermal_stability should reflect how many hours the medicine can survive current conditions`;
}

async function callGemini(prompt: string): Promise<any> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY secret not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed = JSON.parse(text);
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { shipmentId } = await req.json();
    if (!shipmentId) {
      return new Response(JSON.stringify({ error: "shipmentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .single();

    if (shipErr || !shipment) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: telemetry, error: teleErr } = await supabase
      .from("shipment_telemetry")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("recorded_at", { ascending: true })
      .limit(50);

    if (teleErr) throw teleErr;

    const telemetryRows = (telemetry || []) as TelemetryRow[];
    if (telemetryRows.length === 0) {
      return new Response(JSON.stringify({ error: "No telemetry data available for prediction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(shipment as ShipmentRow, telemetryRows);
    const aiResult = await callGemini(prompt);

    return new Response(JSON.stringify(aiResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
