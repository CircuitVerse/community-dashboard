import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

interface ReviewMetrics {
  totalReviews: number;
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  averageReviewTimeHours: number;
  topReviewers: Array<{
    username: string;
    reviewCount: number;
    avatarUrl: string;
  }>;
  reviewVelocity: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  dailyReviewData: Array<{
    date: string;
    reviews: number;
    avgTimeHours: number;
  }>;
  reviewStateDistribution: {
    approved: number;
    changesRequested: number;
    commented: number;
    pending: number;
  };
  prsNeedingReview: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    ageHours: number;
    isDraft: boolean;
  }>;
  prsReadyToMerge: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    approvals: number;
    ageHours: number;
  }>;
}

interface IssueMetrics {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  pendingTriage: number;
  recentlyTriaged: number;
  triageVelocity: {
    daily: number;
    weekly: number;
  };
  ageDistribution: {
    lessThan24h: number;
    oneToSevenDays: number;
    sevenToThirtyDays: number;
    moreThanThirtyDays: number;
  };
  dailyTriageData: Array<{
    date: string;
    triaged: number;
    pending: number;
    total: number;
  }>;
  issuesPendingTriage: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    ageHours: number;
    labels: string[];
  }>;
}

interface AnalyticsData {
  organization: string;
  lastUpdated: string;
  reviewMetrics: ReviewMetrics;
  issueMetrics: IssueMetrics;
  repositories: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    // Read analytics data from the generated JSON file
    const analyticsPath = path.join(process.cwd(), 'public', 'analytics', 'analytics.json');
    
    if (!fs.existsSync(analyticsPath)) {
      return NextResponse.json({ 
        error: "Analytics data not found. Please run 'npm run generate:analytics' to generate the data." 
      }, { status: 404 });
    }
    
    const analyticsData: AnalyticsData = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
    
    // Filter data based on type parameter
    const baseResult = {
      organization: analyticsData.organization,
      lastUpdated: analyticsData.lastUpdated,
      repositories: analyticsData.repositories,
    };

    type ResultType = typeof baseResult & Partial<Pick<AnalyticsData, 'reviewMetrics' | 'issueMetrics'>>;
    const result: ResultType = baseResult;

    if (type === 'all') {
      result.reviewMetrics = analyticsData.reviewMetrics;
      result.issueMetrics = analyticsData.issueMetrics;
    } else if (type === 'reviews') {
      result.reviewMetrics = analyticsData.reviewMetrics;
    } else if (type === 'issues') {
      result.issueMetrics = analyticsData.issueMetrics;
    }

    // Add cache headers for better performance
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error("Error reading analytics data:", error);
    return NextResponse.json(
      { 
        error: "Failed to read analytics data", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Try running 'npm run generate:analytics' to generate fresh data."
      },
      { status: 500 }
    );
  }
}