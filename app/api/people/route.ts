import { NextResponse } from "next/server";
import { getPeopleData } from "@/lib/people";

export function GET() {
  try {
    const data = getPeopleData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { error: "Failed to fetch people" },
      { status: 500 }
    );
  }
}