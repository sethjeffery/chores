interface RewardBadgeProps {
  reward: number | null;
}

export default function RewardBadge({ reward }: RewardBadgeProps) {
  // If reward is null, use 0 as default
  const rewardValue = reward ?? 0;
  const formattedReward =
    rewardValue < 1
      ? `${Math.round(rewardValue * 100)}p`
      : `£${rewardValue.toFixed(2)}`;

  return (
    <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
      {formattedReward}
    </span>
  );
}
