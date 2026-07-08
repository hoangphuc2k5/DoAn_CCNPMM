require("./seedSocialDataFull");
/*

const password = "123456";
const seedEmails = [
  "castrol.demo@social.test",
  "mai.demo@social.test",
  "nam.demo@social.test",
  "linh.demo@social.test",
  "bao.demo@social.test",
];

const users = [
  {
    key: "castrol",
    name: "Trần Nguyễn Castrol",
    email: "castrol.demo@social.test",
    bio: "Sinh viên phụ trách tương tác xã hội, news feed và thông báo.",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    key: "mai",
    name: "Nguyễn Mai Anh",
    email: "mai.demo@social.test",
    bio: "Thích chia sẻ kinh nghiệm học tập và các chủ đề công nghệ.",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    key: "nam",
    name: "Lê Minh Nam",
    email: "nam.demo@social.test",
    bio: "Quan tâm đến thiết kế giao diện và trải nghiệm người dùng.",
    avatar: "https://i.pravatar.cc/150?img=15",
  },
  {
    key: "linh",
    name: "Phạm Gia Linh",
    email: "linh.demo@social.test",
    bio: "Hay theo dõi các topic trending về học tập và đời sống.",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
  {
    key: "bao",
    name: "Trần Quốc Bảo",
    email: "bao.demo@social.test",
    bio: "Tài khoản mẫu dùng để test block và report.",
    avatar: "https://i.pravatar.cc/150?img=8",
  },
];

const createNotification = (
  recipient,
  actor,
  type,
  post = null,
  comment = null,
  metadata = {},
) => ({
  recipient,
  actor,
  type,
  post,
  comment,
  metadata,
});

const run = async () => {
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB:", process.env.MONGO_DB_URL);

  const oldUsers = await User.find({ email: { $in: seedEmails } }).select("_id");
  const oldUserIds = oldUsers.map((user) => user._id);
  const oldPosts = await Post.find({ author: { $in: oldUserIds } }).select("_id");
  const oldPostIds = oldPosts.map((post) => post._id);
  const oldComments = await Comment.find({ post: { $in: oldPostIds } }).select("_id");
  const oldCommentIds = oldComments.map((comment) => comment._id);

  await Promise.all([
    Reaction.deleteMany({ $or: [{ user: { $in: oldUserIds } }, { post: { $in: oldPostIds } }] }),
    Comment.deleteMany({
      $or: [
        { author: { $in: oldUserIds } },
        { post: { $in: oldPostIds } },
        { parentComment: { $in: oldCommentIds } },
      ],
    }),
    Notification.deleteMany({
      $or: [
        { recipient: { $in: oldUserIds } },
        { actor: { $in: oldUserIds } },
        { post: { $in: oldPostIds } },
        { comment: { $in: oldCommentIds } },
      ],
    }),
    Follow.deleteMany({
      $or: [{ follower: { $in: oldUserIds } }, { following: { $in: oldUserIds } }],
    }),
    Friendship.deleteMany({
      $or: [{ requester: { $in: oldUserIds } }, { recipient: { $in: oldUserIds } }],
    }),
    Block.deleteMany({ $or: [{ blocker: { $in: oldUserIds } }, { blocked: { $in: oldUserIds } }] }),
    Report.deleteMany({
      $or: [{ reporter: { $in: oldUserIds } }, { targetId: { $in: [...oldUserIds, ...oldPostIds] } }],
    }),
    Post.deleteMany({ author: { $in: oldUserIds } }),
    Group.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash(password, 10);
  const userMap = {};

  for (const item of users) {
    const user = await User.findOneAndUpdate(
      { email: item.email },
      {
        name: item.name,
        email: item.email,
        password: hashedPassword,
        role: "User",
        bio: item.bio,
        avatar: item.avatar,
        phone: "0900000000",
        address: "TP. Hồ Chí Minh",
        gender: "other",
        isEmailVerified: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    userMap[item.key] = user;
  }

  await Group.create([
    {
      name: "Cộng đồng Lập trình JavaScript",
      description: "Nơi chia sẻ kiến thức về Node.js, ReactJS và JavaScript toàn tập. Hãy thảo luận tích cực!",
      createdBy: userMap.castrol._id,
      members: [userMap.castrol._id, userMap.mai._id, userMap.nam._id],
      admins: [userMap.castrol._id],
      moderators: [],
      avatar: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=150",
    },
    {
      name: "Học tập & Chia sẻ tài liệu CNPM",
      description: "Nhóm trao đổi bài tập lớn, tài liệu môn học Công nghệ phần mềm mới nhất.",
      createdBy: userMap.mai._id,
      members: [userMap.mai._id, userMap.nam._id, userMap.linh._id],
      admins: [userMap.mai._id],
      moderators: [],
      avatar: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=150",
    },
    {
      name: "Hội UI/UX Designer Việt Nam",
      description: "Thảo luận về thiết kế giao diện, trải nghiệm người dùng, Figma và thiết kế CSS/Antd.",
      createdBy: userMap.nam._id,
      members: [userMap.nam._id, userMap.castrol._id],
      admins: [userMap.nam._id],
      moderators: [],
      avatar: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=150",
    },
  ]);

  const postCastrol = await Post.create({
    author: userMap.castrol._id,
    content:
      "Mình đang hoàn thiện module tương tác xã hội: like/react, comment, reply, share, mention @mai.demo và notification. #cnpm #social",
    visibility: "public",
    mentions: [userMap.mai._id],
    hashtags: ["cnpm", "social"],
    stats: { reactions: 3, comments: 3, shares: 1 },
  });

  const postMai = await Post.create({
    author: userMap.mai._id,
    content:
      "Feed gợi ý nên ưu tiên bài mới, bài có nhiều bình luận và các bài từ bạn bè. #feed #algorithm",
    visibility: "public",
    mentions: [],
    hashtags: ["feed", "algorithm"],
    stats: { reactions: 2, comments: 1, shares: 0 },
  });

  const postNam = await Post.create({
    author: userMap.nam._id,
    content:
      "Giao diện kiểu social feed sẽ dễ test hơn: composer, reaction bar, comment thread và sidebar trending. #ui #social",
    visibility: "friends",
    mentions: [],
    hashtags: ["ui", "social"],
    stats: { reactions: 1, comments: 1, shares: 0 },
  });

  const postLinh = await Post.create({
    author: userMap.linh._id,
    content:
      "Ai đang làm đồ án CNPM thì thử mention @castrol.demo và dùng hashtag để topic lên trending nhé. #cnpm #testing",
    visibility: "public",
    mentions: [userMap.castrol._id],
    hashtags: ["cnpm", "testing"],
    stats: { reactions: 2, comments: 1, shares: 1 },
  });

  const sharedPost = await Post.create({
    author: userMap.castrol._id,
    content: "Mình chia sẻ lại ý tưởng feed gợi ý của Mai để cả nhóm cùng góp ý. #feed",
    visibility: "public",
    sharedPost: postMai._id,
    hashtags: ["feed"],
    stats: { reactions: 1, comments: 0, shares: 0 },
  });

  await Reaction.insertMany([
    { post: postCastrol._id, user: userMap.mai._id, type: "love" },
    { post: postCastrol._id, user: userMap.nam._id, type: "like" },
    { post: postCastrol._id, user: userMap.linh._id, type: "wow" },
    { post: postMai._id, user: userMap.castrol._id, type: "like" },
    { post: postMai._id, user: userMap.nam._id, type: "love" },
    { post: postNam._id, user: userMap.castrol._id, type: "like" },
    { post: postLinh._id, user: userMap.castrol._id, type: "like" },
    { post: postLinh._id, user: userMap.mai._id, type: "haha" },
    { post: sharedPost._id, user: userMap.mai._id, type: "like" },
  ]);

  const c1 = await Comment.create({
    post: postCastrol._id,
    author: userMap.mai._id,
    content: "Phần notification nên hiện ngay khi có người react hoặc comment.",
  });
  const c2 = await Comment.create({
    post: postCastrol._id,
    author: userMap.nam._id,
    content: "Mình sẽ test reply comment và share bài này.",
  });
  await Comment.create({
    post: postCastrol._id,
    author: userMap.castrol._id,
    parentComment: c1._id,
    content: "Đúng rồi, mình đã seed sẵn để test luồng đó.",
  });
  await Comment.create({
    post: postMai._id,
    author: userMap.castrol._id,
    content: "Mình đã đưa bài này vào feed gợi ý.",
  });
  await Comment.create({
    post: postNam._id,
    author: userMap.mai._id,
    content: "Card bài viết nhìn rõ hơn nhiều.",
  });
  await Comment.create({
    post: postLinh._id,
    author: userMap.castrol._id,
    content: "Mình đã nhận mention và notification.",
  });

  await Follow.insertMany([
    { follower: userMap.castrol._id, following: userMap.mai._id },
    { follower: userMap.castrol._id, following: userMap.nam._id },
    { follower: userMap.mai._id, following: userMap.castrol._id },
    { follower: userMap.linh._id, following: userMap.castrol._id },
  ]);

  await Friendship.insertMany([
    { requester: userMap.castrol._id, recipient: userMap.mai._id, status: "accepted" },
    { requester: userMap.nam._id, recipient: userMap.castrol._id, status: "pending" },
    { requester: userMap.linh._id, recipient: userMap.castrol._id, status: "accepted" },
  ]);

  await Block.create({
    blocker: userMap.castrol._id,
    blocked: userMap.bao._id,
  });

  await Report.insertMany([
    {
      reporter: userMap.castrol._id,
      targetType: "user",
      targetId: userMap.bao._id,
      reason: "Tài khoản mẫu dùng để kiểm tra report người dùng.",
    },
    {
      reporter: userMap.mai._id,
      targetType: "post",
      targetId: postLinh._id,
      reason: "Báo cáo mẫu để kiểm tra report bài viết.",
    },
  ]);

  await Notification.insertMany([
    createNotification(userMap.castrol._id, userMap.mai._id, "post_reaction", postCastrol._id),
    createNotification(userMap.castrol._id, userMap.mai._id, "post_comment", postCastrol._id, c1._id),
    createNotification(userMap.castrol._id, userMap.nam._id, "post_comment", postCastrol._id, c2._id),
    createNotification(userMap.castrol._id, userMap.linh._id, "post_mention", postLinh._id),
    createNotification(userMap.castrol._id, userMap.nam._id, "friend_request", null, null, {
      requestId: "seed-pending-request",
    }),
    createNotification(userMap.mai._id, userMap.castrol._id, "follow"),
    createNotification(userMap.mai._id, userMap.castrol._id, "post_share", postMai._id),
  ]);

  console.log("Seed completed.");
  console.table(
    users.map((item) => ({
      name: item.name,
      email: item.email,
      password,
    })),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
*/
