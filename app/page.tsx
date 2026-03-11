import {
  ActivityGroup,
  getMonthlyActivityBuckets,
  getPreviousMonthActivityCount,
  getRecentActivitiesGroupedByType,
  getReposOverview,
} from "@/lib/db";
import { getConfig } from "@/lib/config";
import HomeDashboard from "@/components/home-dashboard";

export default async function Home() {
  const config = getConfig();

  const totalCount = (groups: ActivityGroup[]) =>
    groups.reduce((sum, g) => sum + g.activities.length, 0);

  const week = await getRecentActivitiesGroupedByType("week");
  const month = await getRecentActivitiesGroupedByType("month");
  const previousMonthCount = await getPreviousMonthActivityCount();
  const bucketData = await getMonthlyActivityBuckets();

  const reposOverview = await getReposOverview();

  const overviewData = {
    totalMonth: totalCount(month),
    week,
    month,
    previousMonthCount,
    bucketData,
    config,
    reposData: {
      reposOverview
    }
  };

  // 3. Pass data to the interactive dashboard
  return <HomeDashboard overviewData={overviewData} />;
}