import { runBusinessLogicTests } from "@/src/lib/business-logic.test";
import { apiSuccess } from "@/src/lib/api-response";

export async function GET() {
  const results = await runBusinessLogicTests();
  const allPassed = results.every((r) => r.passed);
  return apiSuccess({
    allPassed,
    total: results.length,
    passedCount: results.filter((r) => r.passed).length,
    results,
  });
}
