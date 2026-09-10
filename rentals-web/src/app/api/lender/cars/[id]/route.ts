import { NextResponse } from "next/server";

import { lenderFetch } from "@/lib/lender-api";

export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { status, body } = await lenderFetch(`/cars/${id}`, {
    method: "PATCH",
    body: await request.text(),
  });
  return NextResponse.json(body, { status });
};

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { status, body } = await lenderFetch(`/cars/${id}`, { method: "DELETE" });
  return NextResponse.json(body, { status });
};
