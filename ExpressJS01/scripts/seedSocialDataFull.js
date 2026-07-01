require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const AuditLog = require("../src/models/auditLog");
const Block = require("../src/models/block");
const Comment = require("../src/models/comment");
const Conversation = require("../src/models/conversation");
const DeviceSession = require("../src/models/deviceSession");
const Follow = require("../src/models/follow");
const Friendship = require("../src/models/friendship");
const Group = require("../src/models/group");
const GroupEvent = require("../src/models/groupEvent");
const HiddenItem = require("../src/models/hiddenItem");
const Message = require("../src/models/message");
const Notification = require("../src/models/notification");
const Post = require("../src/models/post");
const PushSubscription = require("../src/models/pushSubscription");
const Reaction = require("../src/models/reaction");
const Report = require("../src/models/report");
const Restriction = require("../src/models/restriction");
const SavedPost = require("../src/models/savedPost");
const User = require("../src/models/user");

const password = "123456";
const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(now.getTime() - days * dayMs);
const daysFromNow = (days) => new Date(now.getTime() + days * dayMs);

const seedUsers = [
  {
    key: "castrol",
    name: "Trần Nguyễn Castrol",
    email: "castrol.demo@social.test",
    role: "user",
    gender: "male",
    phone: "0901000001",
    address: "Quận 1, Thành phố Hồ Chí Minh",
    bio: "Sinh viên phụ trách tương tác xã hội, news feed, thông báo và kiểm thử luồng người dùng.",
    avatar: "https://i.pravatar.cc/150?img=12",
    coverPhoto: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
    dateOfBirth: new Date("2002-03-15"),
  },
  {
    key: "mai",
    name: "Nguyễn Mai Anh",
    email: "mai.demo@social.test",
    role: "user",
    gender: "female",
    phone: "0901000002",
    address: "Thủ Đức, Thành phố Hồ Chí Minh",
    bio: "Thích chia sẻ kinh nghiệm học tập, tài liệu Công nghệ phần mềm và mẹo làm việc nhóm.",
    avatar: "https://i.pravatar.cc/150?img=32",
    coverPhoto: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200",
    dateOfBirth: new Date("2002-08-20"),
  },
  {
    key: "nam",
    name: "Lê Minh Nam",
    email: "nam.demo@social.test",
    role: "user",
    gender: "male",
    phone: "0901000003",
    address: "Quận Bình Thạnh, Thành phố Hồ Chí Minh",
    bio: "Quan tâm đến thiết kế giao diện, trải nghiệm người dùng và tối ưu hiệu năng frontend.",
    avatar: "https://i.pravatar.cc/150?img=15",
    coverPhoto: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=1200",
    dateOfBirth: new Date("2001-12-02"),
  },
  {
    key: "linh",
    name: "Phạm Gia Linh",
    email: "linh.demo@social.test",
    role: "user",
    gender: "female",
    phone: "0901000004",
    address: "Đà Nẵng",
    bio: "Theo dõi các chủ đề trending về học tập, đời sống sinh viên và kỹ năng mềm.",
    avatar: "https://i.pravatar.cc/150?img=47",
    coverPhoto: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
    dateOfBirth: new Date("2003-01-11"),
  },
  {
    key: "bao",
    name: "Trần Quốc Bảo",
    email: "bao.demo@social.test",
    role: "user",
    status: "suspended",
    banReason: "Tài khoản mẫu dùng để kiểm thử báo cáo, chặn và trạng thái bị hạn chế.",
    gender: "male",
    phone: "0901000005",
    address: "Cần Thơ",
    bio: "Tài khoản mẫu dùng để test block, restrict và report.",
    avatar: "https://i.pravatar.cc/150?img=8",
    coverPhoto: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
    dateOfBirth: new Date("2000-09-09"),
  },
  {
    key: "admin",
    name: "Quản trị viên Demo",
    email: "admin.demo@social.test",
    role: "admin",
    gender: "other",
    phone: "0901000006",
    address: "Phòng quản trị hệ thống",
    bio: "Tài khoản quản trị mẫu để kiểm thử dashboard, người dùng, bài viết, báo cáo và nhật ký.",
    avatar: "https://i.pravatar.cc/150?img=5",
    coverPhoto: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200",
    dateOfBirth: new Date("1998-05-30"),
  },
];

const seedEmails = seedUsers.map((user) => user.email);

const imageMedia = (name, width = 1280, height = 720) => ({
  url: `https://picsum.photos/seed/${encodeURIComponent(name)}/${width}/${height}`,
  storageKey: "",
  type: "image",
  originalName: `${name}.jpg`,
  mimeType: "image/jpeg",
  size: 245760,
  originalSize: 245760,
  width,
  height,
  storageProvider: "remote",
});

const videoMedia = (name) => ({
  url: `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4?seed=${encodeURIComponent(name)}`,
  storageKey: "",
  type: "video",
  originalName: `${name}.mp4`,
  mimeType: "video/mp4",
  size: 1048576,
  originalSize: 1048576,
  width: null,
  height: null,
  storageProvider: "remote",
});

const notify = (recipient, actor, type, post = null, comment = null, metadata = {}, readAt = null) => ({
  recipient,
  actor,
  type,
  post,
  comment,
  metadata,
  readAt,
});

const cleanupSeedData = async () => {
  const oldUsers = await User.find({ email: { $in: seedEmails } }).select("_id");
  const oldUserIds = oldUsers.map((user) => user._id);
  if (!oldUserIds.length) return;

  const oldPosts = await Post.find({
    $or: [{ author: { $in: oldUserIds } }, { reviewedBy: { $in: oldUserIds } }],
  }).select("_id");
  const oldPostIds = oldPosts.map((post) => post._id);

  const oldComments = await Comment.find({
    $or: [{ author: { $in: oldUserIds } }, { post: { $in: oldPostIds } }],
  }).select("_id");
  const oldCommentIds = oldComments.map((comment) => comment._id);

  const oldGroups = await Group.find({
    $or: [
      { createdBy: { $in: oldUserIds } },
      { members: { $in: oldUserIds } },
      { admins: { $in: oldUserIds } },
      { moderators: { $in: oldUserIds } },
      { "joinRequests.user": { $in: oldUserIds } },
    ],
  }).select("_id");
  const oldGroupIds = oldGroups.map((group) => group._id);

  const oldConversations = await Conversation.find({ participants: { $in: oldUserIds } }).select("_id");
  const oldConversationIds = oldConversations.map((conversation) => conversation._id);

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
    Follow.deleteMany({ $or: [{ follower: { $in: oldUserIds } }, { following: { $in: oldUserIds } }] }),
    Friendship.deleteMany({ $or: [{ requester: { $in: oldUserIds } }, { recipient: { $in: oldUserIds } }] }),
    Block.deleteMany({ $or: [{ blocker: { $in: oldUserIds } }, { blocked: { $in: oldUserIds } }] }),
    Restriction.deleteMany({ $or: [{ restrictor: { $in: oldUserIds } }, { restricted: { $in: oldUserIds } }] }),
    SavedPost.deleteMany({ $or: [{ user: { $in: oldUserIds } }, { post: { $in: oldPostIds } }] }),
    HiddenItem.deleteMany({
      $or: [
        { user: { $in: oldUserIds } },
        { targetId: { $in: [...oldPostIds, ...oldCommentIds] } },
      ],
    }),
    Report.deleteMany({
      $or: [
        { reporter: { $in: oldUserIds } },
        { resolvedBy: { $in: oldUserIds } },
        { targetId: { $in: [...oldUserIds, ...oldPostIds, ...oldCommentIds] } },
      ],
    }),
    GroupEvent.deleteMany({
      $or: [
        { group: { $in: oldGroupIds } },
        { createdBy: { $in: oldUserIds } },
        { attendees: { $in: oldUserIds } },
      ],
    }),
    Message.deleteMany({
      $or: [{ conversation: { $in: oldConversationIds } }, { sender: { $in: oldUserIds } }],
    }),
    Conversation.deleteMany({
      $or: [
        { _id: { $in: oldConversationIds } },
        { participants: { $in: oldUserIds } },
        { createdBy: { $in: oldUserIds } },
      ],
    }),
    DeviceSession.deleteMany({ user: { $in: oldUserIds } }),
    PushSubscription.deleteMany({ user: { $in: oldUserIds } }),
    AuditLog.deleteMany({ actor: { $in: oldUserIds } }),
    Post.deleteMany({
      $or: [
        { _id: { $in: oldPostIds } },
        { author: { $in: oldUserIds } },
        { reviewedBy: { $in: oldUserIds } },
        { group: { $in: oldGroupIds } },
      ],
    }),
    Group.deleteMany({ _id: { $in: oldGroupIds } }),
  ]);
};

const syncPostStats = async (postIds) => {
  await Promise.all(
    postIds.map(async (postId) => {
      const [reactions, comments, shares] = await Promise.all([
        Reaction.countDocuments({ post: postId }),
        Comment.countDocuments({ post: postId, deletedAt: null }),
        Post.countDocuments({ sharedPost: postId }),
      ]);
      await Post.findByIdAndUpdate(postId, { stats: { reactions, comments, shares } });
    }),
  );
};

const run = async () => {
  if (!process.env.MONGO_DB_URL) {
    throw new Error("Thiếu biến môi trường MONGO_DB_URL.");
  }

  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB:", process.env.MONGO_DB_URL);

  await cleanupSeedData();

  const hashedPassword = await bcrypt.hash(password, 10);
  const userMap = {};

  for (const item of seedUsers) {
    userMap[item.key] = await User.findOneAndUpdate(
      { email: item.email },
      {
        name: item.name,
        email: item.email,
        password: hashedPassword,
        role: item.role,
        authProvider: "local",
        status: item.status || "active",
        banReason: item.banReason || "",
        bannedUntil: null,
        phone: item.phone,
        address: item.address,
        avatar: item.avatar,
        coverPhoto: item.coverPhoto,
        bio: item.bio,
        isEmailVerified: true,
        lastLoginAt: daysAgo(0.25),
        failedLoginAttempts: 0,
        deletedAt: null,
        dateOfBirth: item.dateOfBirth,
        gender: item.gender,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  const groupJs = await Group.create({
    name: "Cộng đồng Lập trình JavaScript",
    description: "Nơi chia sẻ kiến thức về Node.js, ReactJS, JavaScript toàn tập và kinh nghiệm làm đồ án.",
    createdBy: userMap.castrol._id,
    privacy: "public",
    postApprovalEnabled: false,
    defaultPostVisibility: "public",
    members: [userMap.castrol._id, userMap.mai._id, userMap.nam._id, userMap.linh._id],
    admins: [userMap.castrol._id],
    moderators: [userMap.nam._id],
    avatar: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300",
    coverPhoto: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200",
  });

  const groupCnpm = await Group.create({
    name: "Học tập & Chia sẻ tài liệu CNPM",
    description: "Nhóm trao đổi bài tập lớn, tài liệu môn Công nghệ phần mềm và lịch thuyết trình.",
    createdBy: userMap.mai._id,
    privacy: "private",
    postApprovalEnabled: true,
    defaultPostVisibility: "group",
    members: [userMap.mai._id, userMap.nam._id, userMap.linh._id],
    admins: [userMap.mai._id],
    moderators: [userMap.nam._id],
    joinRequests: [
      { user: userMap.castrol._id, status: "pending", requestedAt: daysAgo(1) },
      {
        user: userMap.bao._id,
        status: "rejected",
        requestedAt: daysAgo(4),
        reviewedAt: daysAgo(3),
        reviewedBy: userMap.mai._id,
      },
    ],
    avatar: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300",
    coverPhoto: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200",
  });

  const groupUx = await Group.create({
    name: "Hội UI/UX Designer Việt Nam",
    description: "Thảo luận về thiết kế giao diện, trải nghiệm người dùng, Figma, prototype và design system.",
    createdBy: userMap.nam._id,
    privacy: "public",
    postApprovalEnabled: true,
    defaultPostVisibility: "group",
    members: [userMap.nam._id, userMap.castrol._id, userMap.mai._id],
    admins: [userMap.nam._id],
    moderators: [userMap.mai._id],
    avatar: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=300",
    coverPhoto: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200",
  });

  const posts = {};
  posts.castrol = await Post.create({
    author: userMap.castrol._id,
    content:
      "Mình đang hoàn thiện module tương tác xã hội: reaction, bình luận, trả lời, chia sẻ, mention @mai.demo và thông báo thời gian thực. #cnpm #social",
    visibility: "public",
    mentions: [userMap.mai._id],
    hashtags: ["cnpm", "social"],
    isPinned: true,
    media: [imageMedia("social-feed-demo")],
    createdAt: daysAgo(0.4),
  });

  posts.mai = await Post.create({
    author: userMap.mai._id,
    content:
      "Feed gợi ý nên ưu tiên bài mới, bài có nhiều bình luận và bài từ bạn bè thân thiết. Mọi người góp ý thêm nhé. #feed #algorithm",
    visibility: "public",
    hashtags: ["feed", "algorithm"],
    media: [imageMedia("feed-algorithm")],
    createdAt: daysAgo(1),
  });

  posts.namFriends = await Post.create({
    author: userMap.nam._id,
    content: "Giao diện social feed sẽ dễ test hơn khi có composer, reaction bar, comment thread và sidebar trending. #ui #social",
    visibility: "friends",
    hashtags: ["ui", "social"],
    media: [imageMedia("ui-social-card", 900, 900)],
    createdAt: daysAgo(2),
  });

  posts.linh = await Post.create({
    author: userMap.linh._id,
    content: "Ai đang làm đồ án CNPM thì thử mention @castrol.demo và dùng hashtag để topic lên trending nhé. #cnpm #testing",
    visibility: "public",
    mentions: [userMap.castrol._id],
    hashtags: ["cnpm", "testing"],
    createdAt: daysAgo(1.5),
  });

  posts.privateNote = await Post.create({
    author: userMap.castrol._id,
    content: "Ghi chú riêng tư: checklist kiểm thử gồm đăng bài, cập nhật bài, xóa mềm bình luận, lưu bài và ẩn nội dung.",
    visibility: "private",
    hashtags: ["checklist"],
    createdAt: daysAgo(3),
  });

  posts.sharedMai = await Post.create({
    author: userMap.castrol._id,
    content: "Mình chia sẻ lại ý tưởng feed gợi ý của Mai để cả nhóm cùng góp ý. #feed",
    visibility: "public",
    sharedPost: posts.mai._id,
    hashtags: ["feed"],
    createdAt: daysAgo(0.8),
  });

  posts.groupJs = await Post.create({
    author: userMap.nam._id,
    group: groupJs._id,
    content: "Mình vừa cập nhật ví dụ Socket.IO cho thông báo reaction và tin nhắn mới trong nhóm JavaScript. #nodejs #socketio",
    visibility: "public",
    approvalStatus: "published",
    hashtags: ["nodejs", "socketio"],
    media: [imageMedia("socketio-workshop"), videoMedia("socketio-demo")],
    createdAt: daysAgo(0.7),
  });

  posts.groupPending = await Post.create({
    author: userMap.linh._id,
    group: groupCnpm._id,
    content: "Mình gửi tài liệu tổng hợp use case, sequence diagram và test case để admin duyệt trước khi đăng. #tailieu #usecase",
    visibility: "group",
    approvalStatus: "pending",
    hashtags: ["tailieu", "usecase"],
    media: [imageMedia("cnpm-document")],
    createdAt: daysAgo(0.6),
  });

  posts.groupRejected = await Post.create({
    author: userMap.bao._id,
    group: groupCnpm._id,
    content: "Bài mẫu bị từ chối để kiểm thử danh sách bài chờ duyệt và trạng thái rejected trong nhóm riêng tư.",
    visibility: "group",
    approvalStatus: "rejected",
    reviewedBy: userMap.mai._id,
    reviewedAt: daysAgo(1),
    hashtags: ["moderation"],
    createdAt: daysAgo(1.2),
  });

  posts.groupUx = await Post.create({
    author: userMap.mai._id,
    group: groupUx._id,
    content: "Prototype mới cần có trạng thái hover, empty, loading và lỗi để nhóm kiểm thử frontend không bị thiếu case. #ux #prototype",
    visibility: "group",
    approvalStatus: "published",
    hashtags: ["ux", "prototype"],
    media: [imageMedia("ux-prototype", 1280, 960)],
    createdAt: daysAgo(2.5),
  });

  await Reaction.insertMany([
    { post: posts.castrol._id, user: userMap.mai._id, type: "love" },
    { post: posts.castrol._id, user: userMap.nam._id, type: "like" },
    { post: posts.castrol._id, user: userMap.linh._id, type: "wow" },
    { post: posts.castrol._id, user: userMap.admin._id, type: "like" },
    { post: posts.mai._id, user: userMap.castrol._id, type: "like" },
    { post: posts.mai._id, user: userMap.nam._id, type: "love" },
    { post: posts.namFriends._id, user: userMap.castrol._id, type: "like" },
    { post: posts.linh._id, user: userMap.castrol._id, type: "like" },
    { post: posts.linh._id, user: userMap.mai._id, type: "haha" },
    { post: posts.sharedMai._id, user: userMap.mai._id, type: "like" },
    { post: posts.groupJs._id, user: userMap.castrol._id, type: "wow" },
    { post: posts.groupUx._id, user: userMap.nam._id, type: "love" },
  ]);

  const comments = {};
  comments.notify = await Comment.create({
    post: posts.castrol._id,
    author: userMap.mai._id,
    content: "Phần thông báo nên hiện ngay khi có người reaction hoặc bình luận.",
    mentions: [userMap.castrol._id],
  });
  comments.replyTest = await Comment.create({
    post: posts.castrol._id,
    author: userMap.nam._id,
    content: "Mình sẽ test reply comment, share bài và kiểm tra số liệu thống kê.",
  });
  comments.reply = await Comment.create({
    post: posts.castrol._id,
    author: userMap.castrol._id,
    parentComment: comments.notify._id,
    content: "Đúng rồi, mình đã seed sẵn để test luồng đó.",
    mentions: [userMap.mai._id],
  });
  comments.feed = await Comment.create({
    post: posts.mai._id,
    author: userMap.castrol._id,
    content: "Mình đã đưa bài này vào feed gợi ý và màn hình saved posts.",
  });
  comments.hidden = await Comment.create({
    post: posts.namFriends._id,
    author: userMap.mai._id,
    content: "Bình luận này dùng để kiểm thử chức năng ẩn bình luận.",
  });
  comments.deleted = await Comment.create({
    post: posts.linh._id,
    author: userMap.bao._id,
    content: "Bình luận đã xóa mềm để kiểm thử bộ lọc deletedAt.",
    deletedAt: daysAgo(0.9),
  });
  comments.groupReport = await Comment.create({
    post: posts.groupJs._id,
    author: userMap.bao._id,
    content: "Bình luận mẫu bị báo cáo trong nhóm để moderator xử lý.",
  });

  await Follow.insertMany([
    { follower: userMap.castrol._id, following: userMap.mai._id },
    { follower: userMap.castrol._id, following: userMap.nam._id },
    { follower: userMap.mai._id, following: userMap.castrol._id },
    { follower: userMap.mai._id, following: userMap.linh._id },
    { follower: userMap.nam._id, following: userMap.mai._id },
    { follower: userMap.linh._id, following: userMap.castrol._id },
  ]);

  const pendingFriend = await Friendship.create({
    requester: userMap.nam._id,
    recipient: userMap.castrol._id,
    status: "pending",
  });
  await Friendship.insertMany([
    { requester: userMap.castrol._id, recipient: userMap.mai._id, status: "accepted" },
    { requester: userMap.linh._id, recipient: userMap.castrol._id, status: "accepted" },
    { requester: userMap.mai._id, recipient: userMap.nam._id, status: "accepted" },
    { requester: userMap.bao._id, recipient: userMap.mai._id, status: "rejected" },
  ]);

  await Block.create({ blocker: userMap.castrol._id, blocked: userMap.bao._id });
  await Restriction.create({ restrictor: userMap.mai._id, restricted: userMap.bao._id });

  await SavedPost.insertMany([
    { user: userMap.castrol._id, post: posts.mai._id },
    { user: userMap.castrol._id, post: posts.groupJs._id },
    { user: userMap.mai._id, post: posts.castrol._id },
    { user: userMap.nam._id, post: posts.groupUx._id },
  ]);
  await HiddenItem.insertMany([
    { user: userMap.castrol._id, targetType: "post", targetId: posts.namFriends._id },
    { user: userMap.castrol._id, targetType: "comment", targetId: comments.hidden._id },
  ]);

  const reports = await Report.insertMany([
    {
      reporter: userMap.castrol._id,
      targetType: "user",
      targetId: userMap.bao._id,
      targetName: userMap.bao.name,
      targetEmail: userMap.bao.email,
      reason: "Tài khoản gửi nhiều nội dung thử nghiệm không phù hợp.",
      status: "open",
    },
    {
      reporter: userMap.mai._id,
      targetType: "post",
      targetId: posts.linh._id,
      targetName: "Bài viết có hashtag testing",
      reason: "Báo cáo mẫu để kiểm tra màn hình quản trị report bài viết.",
      status: "reviewing",
    },
    {
      reporter: userMap.nam._id,
      targetType: "comment",
      targetId: comments.groupReport._id,
      targetName: "Bình luận trong nhóm JavaScript",
      reason: "Bình luận mẫu để kiểm thử xử lý báo cáo trong nhóm.",
      status: "open",
    },
    {
      reporter: userMap.linh._id,
      targetType: "post",
      targetId: posts.groupRejected._id,
      targetName: "Bài viết đã bị từ chối",
      reason: "Báo cáo đã xử lý để kiểm thử trạng thái resolved.",
      status: "resolved",
      resolvedBy: userMap.admin._id,
      resolvedAt: daysAgo(0.5),
    },
  ]);

  await GroupEvent.insertMany([
    {
      group: groupJs._id,
      title: "Workshop Socket.IO cho mạng xã hội mini",
      description: "Thực hành thông báo realtime, trạng thái đã xem và cập nhật feed trực tiếp.",
      startAt: daysFromNow(3),
      endAt: daysFromNow(3.15),
      location: "Phòng Lab A1",
      createdBy: userMap.castrol._id,
      attendees: [userMap.castrol._id, userMap.nam._id, userMap.mai._id],
    },
    {
      group: groupCnpm._id,
      title: "Ôn tập bảo vệ đồ án CNPM",
      description: "Rà soát use case, ERD, API và checklist kiểm thử trước ngày demo.",
      startAt: daysFromNow(5),
      endAt: daysFromNow(5.1),
      location: "Google Meet",
      createdBy: userMap.mai._id,
      attendees: [userMap.mai._id, userMap.linh._id],
    },
    {
      group: groupUx._id,
      title: "Review prototype màn hình Profile",
      description: "Nhận xét layout media, album, danh sách bạn bè và trạng thái empty.",
      startAt: daysFromNow(7),
      endAt: daysFromNow(7.08),
      location: "Figma Jam",
      createdBy: userMap.nam._id,
      attendees: [userMap.nam._id, userMap.mai._id],
    },
  ]);

  const directConversation = await Conversation.create({
    isGroup: false,
    participants: [userMap.castrol._id, userMap.mai._id],
  });
  const teamConversation = await Conversation.create({
    isGroup: true,
    name: "Nhóm demo CNPM",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300",
    participants: [userMap.castrol._id, userMap.mai._id, userMap.nam._id, userMap.linh._id],
    createdBy: userMap.castrol._id,
    admins: [userMap.castrol._id, userMap.mai._id],
  });

  const directMessages = await Message.insertMany([
    {
      conversation: directConversation._id,
      sender: userMap.castrol._id,
      type: "text",
      content: "Mai ơi, bạn kiểm tra giúp mình luồng lưu bài và thông báo nhé.",
      seenBy: [{ user: userMap.castrol._id, seenAt: daysAgo(0.45) }],
    },
    {
      conversation: directConversation._id,
      sender: userMap.mai._id,
      type: "image",
      content: "Mình gửi ảnh màn hình lỗi empty state.",
      attachments: [{ url: "/uploads/chat/chat-seed-empty-state.png", filename: "empty-state.png", mimetype: "image/png" }],
      seenBy: [
        { user: userMap.mai._id, seenAt: daysAgo(0.4) },
        { user: userMap.castrol._id, seenAt: daysAgo(0.38) },
      ],
    },
  ]);
  const teamMessages = await Message.insertMany([
    {
      conversation: teamConversation._id,
      sender: userMap.nam._id,
      type: "file",
      content: "Mình đính kèm checklist UI cho buổi demo.",
      attachments: [{ url: "/uploads/chat/checklist-ui-demo.pdf", filename: "checklist-ui-demo.pdf", mimetype: "application/pdf" }],
      seenBy: [{ user: userMap.nam._id, seenAt: daysAgo(0.25) }],
    },
    {
      conversation: teamConversation._id,
      sender: userMap.linh._id,
      type: "sticker",
      sticker: "sparkles",
      seenBy: [
        { user: userMap.linh._id, seenAt: daysAgo(0.2) },
        { user: userMap.castrol._id, seenAt: daysAgo(0.18) },
      ],
    },
    {
      conversation: teamConversation._id,
      sender: userMap.castrol._id,
      type: "text",
      content: "Tin nhắn này đã được thu hồi để kiểm thử recall.",
      isRecalled: true,
      seenBy: [{ user: userMap.castrol._id, seenAt: daysAgo(0.15) }],
    },
  ]);

  directConversation.lastMessage = directMessages[directMessages.length - 1]._id;
  teamConversation.lastMessage = teamMessages[teamMessages.length - 1]._id;
  await Promise.all([directConversation.save(), teamConversation.save()]);

  await Notification.insertMany([
    notify(userMap.castrol._id, userMap.mai._id, "post_reaction", posts.castrol._id),
    notify(userMap.castrol._id, userMap.mai._id, "post_comment", posts.castrol._id, comments.notify._id),
    notify(userMap.castrol._id, userMap.nam._id, "post_comment", posts.castrol._id, comments.replyTest._id),
    notify(userMap.mai._id, userMap.castrol._id, "comment_reply", posts.castrol._id, comments.reply._id),
    notify(userMap.castrol._id, userMap.linh._id, "post_mention", posts.linh._id),
    notify(userMap.mai._id, userMap.castrol._id, "comment_mention", posts.castrol._id, comments.reply._id),
    notify(userMap.castrol._id, userMap.nam._id, "friend_request", null, null, { requestId: pendingFriend._id.toString() }),
    notify(userMap.mai._id, userMap.castrol._id, "follow"),
    notify(userMap.mai._id, userMap.castrol._id, "post_share", posts.mai._id, null, {}, daysAgo(0.3)),
    notify(userMap.castrol._id, userMap.mai._id, "new_message", null, null, {
      conversationId: directConversation._id.toString(),
      messageId: directMessages[1]._id.toString(),
    }),
    notify(userMap.admin._id, userMap.castrol._id, "report_received", null, null, {
      reportId: reports[0]._id.toString(),
      targetType: "user",
    }),
  ]);

  await DeviceSession.insertMany([
    {
      user: userMap.castrol._id,
      deviceId: "seed-castrol-laptop",
      ipAddress: "127.0.0.1",
      userAgent: "Chrome on Windows - seed",
      isActive: true,
      lastSeenAt: daysAgo(0.1),
    },
    {
      user: userMap.mai._id,
      deviceId: "seed-mai-mobile",
      ipAddress: "192.168.1.12",
      userAgent: "Mobile Safari - seed",
      isActive: true,
      lastSeenAt: daysAgo(0.6),
    },
    {
      user: userMap.bao._id,
      deviceId: "seed-bao-old-device",
      ipAddress: "10.0.0.8",
      userAgent: "Firefox - seed",
      isActive: false,
      lastSeenAt: daysAgo(9),
    },
  ]);

  await PushSubscription.create({
    user: userMap.castrol._id,
    endpoint: "https://push.example.test/seed/castrol",
    keys: { p256dh: "seed-p256dh-key-for-castrol", auth: "seed-auth-key" },
    userAgent: "Chrome on Windows - seed",
  });

  await AuditLog.insertMany([
    {
      actor: userMap.admin._id,
      action: "admin.dashboard.view",
      targetType: "dashboard",
      ipAddress: "127.0.0.1",
      userAgent: "Seed script",
      metadata: { note: "Dữ liệu mẫu cho dashboard quản trị" },
    },
    {
      actor: userMap.admin._id,
      action: "report.resolve",
      targetType: "report",
      targetId: reports[3]._id.toString(),
      ipAddress: "127.0.0.1",
      userAgent: "Seed script",
      metadata: { status: "resolved", reason: "Đã xử lý báo cáo mẫu" },
    },
    {
      actor: userMap.castrol._id,
      action: "post.create",
      targetType: "post",
      targetId: posts.castrol._id.toString(),
      ipAddress: "127.0.0.1",
      userAgent: "Seed script",
      metadata: { hashtags: ["cnpm", "social"] },
    },
  ]);

  await syncPostStats(Object.values(posts).map((post) => post._id));

  console.log("Seed completed.");
  console.table(seedUsers.map((item) => ({ name: item.name, email: item.email, role: item.role, password })));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
