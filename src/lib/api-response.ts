import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function apiError(message: string, code = "INTERNAL_ERROR", status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error("API Error caught:", error);
  if (error instanceof AuthError) {
    return apiError(error.message, error.code, error.statusCode);
  }
  const err = error as Error;
  const message = err?.message || "Неизвестная ошибка сервера";
  let code = "BAD_REQUEST";
  let status = 400;

  if (message.includes("INSUFFICIENT_STOCK")) {
    code = "INSUFFICIENT_STOCK";
  } else if (message.includes("WAREHOUSE_MISMATCH")) {
    code = "WAREHOUSE_MISMATCH";
  } else if (message.includes("уже проведён")) {
    code = "DOCUMENT_ALREADY_POSTED";
  } else if (message.includes("не найден")) {
    code = "NOT_FOUND";
    status = 404;
  }

  return apiError(message, code, status);
}
