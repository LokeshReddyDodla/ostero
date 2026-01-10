import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VisionModelRequest {
  imageBase64: string;
  age: number;
  sex: string;
  cxrView: string;
}

interface VisionModelResponse {
  model_name: string;
  model_risk_score_0_1: number;
  model_uncertainty_0_1: number;
}

/**
 * Vision Model Simulation for CXR Osteoporosis Screening
 * 
 * In production, this would call a trained ML model.
 * For MVP, we simulate realistic risk scores based on demographic factors.
 */
function simulateVisionModel(request: VisionModelRequest): VisionModelResponse {
  const { age, sex, cxrView } = request;
  
  // Base risk increases with age
  let baseRisk = 0.0;
  
  if (age < 50) {
    baseRisk = 0.10;
  } else if (age < 60) {
    baseRisk = 0.20;
  } else if (age < 70) {
    baseRisk = 0.35;
  } else if (age < 80) {
    baseRisk = 0.50;
  } else {
    baseRisk = 0.65;
  }
  
  // Females have higher risk postmenopause
  if (sex === 'female' && age >= 50) {
    baseRisk += 0.15;
  }
  
  // Add random variation to simulate model behavior
  const randomVariation = (Math.random() - 0.5) * 0.2;
  let riskScore = Math.max(0, Math.min(1, baseRisk + randomVariation));
  
  // Uncertainty increases with poor view quality
  let uncertainty = 0.10;
  if (cxrView === 'AP') {
    uncertainty = 0.15;
  } else if (cxrView === 'lateral') {
    uncertainty = 0.20;
  } else if (cxrView === 'unknown') {
    uncertainty = 0.40;
  }
  
  // Add small random variation to uncertainty
  uncertainty += (Math.random() - 0.5) * 0.05;
  uncertainty = Math.max(0, Math.min(1, uncertainty));
  
  return {
    model_name: "cxr-osteoflag-v0",
    model_risk_score_0_1: parseFloat(riskScore.toFixed(3)),
    model_uncertainty_0_1: parseFloat(uncertainty.toFixed(3)),
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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

    const requestData: VisionModelRequest = await req.json();
    
    // Validate required fields
    if (!requestData.imageBase64 || !requestData.age || !requestData.sex || !requestData.cxrView) {
      throw new Error("Missing required fields: imageBase64, age, sex, cxrView");
    }
    
    // Validate age
    if (requestData.age < 0 || requestData.age > 120) {
      throw new Error("Invalid age");
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = simulateVisionModel(requestData);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Vision model error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});