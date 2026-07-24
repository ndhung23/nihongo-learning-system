import "server-only";

import { UserModel } from "@/models/User";

export const DAILY_CONTRIBUTION_TICKET_LIMIT = 10;

function bangkokDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function rewardContribution(userId: string) {
  const dateKey = bangkokDateKey();
  const rewardedUser = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { "contributionRewards.dateKey": { $ne: dateKey } },
        {
          "contributionRewards.dateKey": dateKey,
          "contributionRewards.count": { $lt: DAILY_CONTRIBUTION_TICKET_LIMIT },
        },
      ],
    },
    [
      {
        $set: {
          pendingGachaTickets: { $add: [{ $ifNull: ["$pendingGachaTickets", 0] }, 1] },
          contributionRewards: {
            dateKey,
            count: {
              $cond: [
                { $eq: [{ $ifNull: ["$contributionRewards.dateKey", ""] }, dateKey] },
                { $add: [{ $ifNull: ["$contributionRewards.count", 0] }, 1] },
                1,
              ],
            },
          },
        },
      },
    ],
    { new: true, updatePipeline: true },
  ).select("contributionRewards");

  return {
    awarded: Boolean(rewardedUser),
    dailyRewardCount: rewardedUser?.contributionRewards?.count ?? DAILY_CONTRIBUTION_TICKET_LIMIT,
    dailyLimit: DAILY_CONTRIBUTION_TICKET_LIMIT,
  };
}
