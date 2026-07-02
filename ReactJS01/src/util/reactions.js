export const REACTIONS = [
  { type: "like", emoji: "👍", label: "Thích", color: "#1877f2" },
  { type: "love", emoji: "❤️", label: "Yêu thích", color: "#f33e58" },
  { type: "haha", emoji: "😆", label: "Haha", color: "#f7b125" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#f7b125" },
  { type: "sad", emoji: "😢", label: "Buồn", color: "#f7b125" },
  { type: "angry", emoji: "😡", label: "Phẫn nộ", color: "#e9710f" },
];

export const REACTION_MAP = REACTIONS.reduce((acc, reaction) => {
  acc[reaction.type] = reaction;
  return acc;
}, {});

const getUserId = (user) => user?._id || user?.id || user;

const compactCounts = (counts) =>
  Object.fromEntries(
    Object.entries(counts || {}).filter(([, count]) => Number(count) > 0),
  );

export const getReactionCount = (post, type) => Number(post?.reactionTypes?.[type] || 0);

export const getReactionTotal = (post) => {
  if (typeof post?.stats?.reactions === "number") return post.stats.reactions;
  if (typeof post?.reactionDetails?.total === "number") return post.reactionDetails.total;
  return Object.values(post?.reactionTypes || {}).reduce((sum, count) => sum + Number(count || 0), 0);
};

export const applyPostReaction = (post, nextType, actor) => {
  const previousType = post?.myReaction || null;
  const counts = { ...(post?.reactionTypes || {}) };

  if (previousType) counts[previousType] = Math.max(Number(counts[previousType] || 0) - 1, 0);
  if (nextType) counts[nextType] = Number(counts[nextType] || 0) + 1;

  const currentTotal = getReactionTotal(post);
  const totalDelta = nextType && !previousType ? 1 : !nextType && previousType ? -1 : 0;
  const nextTotal = Math.max(currentTotal + totalDelta, 0);
  const actorId = getUserId(actor);
  const usersByType = Object.fromEntries(
    Object.entries(post?.reactionDetails?.usersByType || {}).map(([type, users]) => [
      type,
      Array.isArray(users) ? users.filter((user) => String(getUserId(user)) !== String(actorId)) : [],
    ]),
  );

  if (nextType && actorId) {
    usersByType[nextType] = usersByType[nextType] || [];
    usersByType[nextType].push({
      _id: actorId,
      name: actor?.name,
      email: actor?.email,
      avatar: actor?.avatar,
    });
  }

  return {
    ...post,
    myReaction: nextType || null,
    reactionTypes: compactCounts(counts),
    reactionDetails: {
      ...(post?.reactionDetails || {}),
      total: nextTotal,
      usersByType,
    },
    stats: {
      ...(post?.stats || {}),
      reactions: nextTotal,
    },
  };
};
