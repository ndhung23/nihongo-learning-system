import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { masterDataResources } from "@/lib/admin/master-data";
import mongoose from "mongoose";

export async function GET() {
  try {
    await requirePermission("admin:master-data:read"); await connectMongoDB();
    const data = await Promise.all(masterDataResources.map(async (resource) => ({ ...resource, count: await mongoose.connection.collection(resource.collection).countDocuments({}) })));
    return NextResponse.json({ data });
  } catch (error) { if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 }); return NextResponse.json({ message: "Không thể tải Master Data." }, { status: 500 }); }
}
