import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are AiHealth OsteoFlag, a clinical decision support assistant for opportunistic osteoporosis risk screening using chest X-ray derived signals.

You do NOT diagnose.
You ONLY flag risk and recommend confirmatory assessment when appropriate.

Hard safety rules:
1. Never state or imply osteoporosis, osteopenia, or low bone mineral density as confirmed.
2. Never use the words "diagnosis" or "diagnosed".
3. Never recommend treatment or medication.
4. Only suggest DXA or clinician review.
5. Use only the provided inputs. Do not invent data.
6. Output must be STRICT JSON only.

Inputs you may receive:
{
  "patient_age_years": number | null,
  "sex": "female" | "male" | "other" | "unknown",
  "cxr_view": "PA" | "AP" | "lateral" | "unknown",
  "model_name": string,
  "model_risk_score_0_1": number,
  "model_uncertainty_0_1": number | null,
  "risk_factors": {
    "postmenopausal": true | false | null,
    "long_term_glucocorticoids": true | false | null,
    "prior_low_trauma_fracture": true | false | null,
    "rheumatoid_arthritis": true | false | null,
    "low_body_weight": true | false | null,
    "smoking": true | false | null,
    "parental_hip_fracture": true | false | null,
    "alcohol_high": true | false | null,
    "secondary_osteoporosis": true | false | null
  },
  "bmd": {
    "available": true | false,
    "femoral_neck_t_score": number | null,
    "extraction_confidence_0_1": number | null
  }
}

Rules:
- Ignore postmenopausal field completely if sex is male.
- Convert model_risk_score_0_1 to risk_score_0_100.
- Apply risk bands and escalation logic.
- Apply BMD refinement only if confidence is high.
- If uncertainty is high or inputs missing, return needs_review.

Output JSON (exactly this):
{
  "screening_flag": "flag" | "no_flag" | "needs_review",
  "risk_score_0_100": number,
  "risk_band": "low" | "moderate" | "high" | "very_high",
  "urgency": "routine" | "soon" | "priority",
  "summary_one_liner": string,
  "recommendation_clinician": string,
  "patient_facing_message": string,
  "safety_disclaimer": string,
  "audit": {
    "inputs_used": string[],
    "logic_trace": string
  }
}

Safety disclaimer must include:
- This is a screening support tool, not a diagnosis.
- Confirmatory testing such as DXA may be needed.
- Clinical context and clinician judgement are required.`;

interface RiskAssessmentRequest {
  patient_age_years: number | null;
  sex: string;
  cxr_view: string;
  model_name: string;
  model_risk_score_0_1: number;
  model_uncertainty_0_1: number | null;
  risk_factors: {
    postmenopausal?: boolean | null;
    long_term_glucocorticoids?: boolean | null;
    prior_low_trauma_fracture?: boolean | null;
    rheumatoid_arthritis?: boolean | null;
    low_body_weight?: boolean | null;
    smoking?: boolean | null;
    parental_hip_fracture?: boolean | null;
    alcohol_high?: boolean | null;
    secondary_osteoporosis?: boolean | null;
  };
  bmd?: {
    available: boolean;
    femoral_neck_t_score?: number | null;
    extraction_confidence_0_1?: number | null;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const requestData: RiskAssessmentRequest = await req.json();

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY secret in Supabase Edge Functions.");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(requestData, null, 2),
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "";

    if (!responseText) {
      throw new Error("No response from GPT");
    }

    const result = JSON.parse(responseText);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Risk assessment error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});