import { predictionProxy } from "@/lib/prediction-proxy";

export const dynamic = "force-dynamic";
export async function GET() {
  return predictionProxy("current");
}
