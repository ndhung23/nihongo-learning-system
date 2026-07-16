import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";

export async function GET() {
  try {
    const mongoose = await connectMongoDB();

    return NextResponse.json({
      ok: true,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown database connection error.",
      },
      { status: 500 },
    );
  }
}
