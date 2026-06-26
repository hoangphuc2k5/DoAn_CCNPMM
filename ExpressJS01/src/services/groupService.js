const Group = require("../models/group");
const GroupEvent = require("../models/groupEvent");
const Comment = require("../models/comment");
const Post = require("../models/post");
const Report = require("../models/report");
const { processPostMediaFiles } = require("./mediaService");
const { decoratePosts } = require("./socialService");

const idOf = (value) => String(value?._id || value);

const extractHashtags = (content = "") => {
  const matches = content.match(/#[A-Za-z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
};

const isSameId = (a, b) => idOf(a) === idOf(b);

const isGroupMember = (group, userId) =>
  group.members.some((memberId) => isSameId(memberId, userId));

const isGroupAdmin = (group, userId) =>
  isSameId(group.createdBy, userId) ||
  group.admins.some((adminId) => isSameId(adminId, userId));

const isGroupModerator = (group, userId) =>
  group.moderators.some((moderatorId) => isSameId(moderatorId, userId));

const canModerate = (group, userId) =>
  isGroupAdmin(group, userId) || isGroupModerator(group, userId);

const publishedPostFilter = {
  $or: [{ approvalStatus: "published" }, { approvalStatus: { $exists: false } }],
};

const getJoinRequestStatus = (group, userId) => {
  const myRequests =
    group.joinRequests?.filter((request) => isSameId(request.user, userId)) || [];
  const pendingRequest = myRequests.find((request) => request.status === "pending");
  if (pendingRequest) return "pending";

  return (
    myRequests
      .sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0))[0]
      ?.status || null
  );
};

const normalizeMediaItem = (item, postId, createdAt, author) => {
  if (!item) return null;
  if (typeof item === "string") {
    return {
      url: item,
      type: /\.(mp4|mov|avi|mkv|webm)$/i.test(item) ? "video" : "image",
      postId,
      createdAt,
      author,
    };
  }

  return {
    ...item,
    postId,
    createdAt,
    author,
    type: item.type || (item.mimeType?.startsWith("video/") ? "video" : "image"),
  };
};

const decorateGroup = async (group, userId) => {
  const groupObject = group.toObject ? group.toObject() : group;
  const isMember = isGroupMember(group, userId);
  const isAdmin = isGroupAdmin(group, userId);
  const isModerator = isGroupModerator(group, userId);
  const canSeeMembership = group.privacy !== "private" || isMember;
  const canSeeRequests = isAdmin || isModerator;
  const [postCount, eventCount, pendingPostCount, openReportCount] = await Promise.all([
    Post.countDocuments({ group: group._id, ...publishedPostFilter }),
    GroupEvent.countDocuments({ group: group._id }),
    Post.countDocuments({ group: group._id, approvalStatus: "pending" }),
    Post.find({ group: group._id }).distinct("_id").then((postIds) =>
      Report.countDocuments({
        targetType: "post",
        targetId: { $in: postIds },
        status: { $in: ["open", "reviewing"] },
      }),
    ),
  ]);
  const {
    joinRequests,
    members,
    admins,
    moderators,
    ...safeGroupObject
  } = groupObject;

  return {
    ...safeGroupObject,
    members: canSeeMembership ? members || [] : [],
    admins: canSeeMembership ? admins || [] : [],
    moderators: canSeeMembership ? moderators || [] : [],
    joinRequests: canSeeRequests ? joinRequests || [] : [],
    memberCount: group.members?.length || 0,
    pendingRequestCount:
      canSeeRequests
        ? group.joinRequests?.filter((request) => request.status === "pending").length || 0
        : 0,
    myJoinRequestStatus: getJoinRequestStatus(group, userId),
    postCount,
    eventCount,
    pendingPostCount: canSeeRequests ? pendingPostCount : 0,
    openReportCount: canSeeRequests ? openReportCount : 0,
    myRole: isAdmin
      ? "admin"
      : isModerator
        ? "moderator"
        : isMember
          ? "member"
          : "guest",
    isMember,
  };
};

const listGroups = async (userId, query = {}) => {
  const filter = {};
  if (query.mine === "true") {
    filter.members = userId;
  }

  if (query.q?.trim()) {
    const pattern = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { description: pattern }];
  }

  const groups = await Group.find(filter)
    .sort({ updatedAt: -1 })
    .limit(30)
    .populate("createdBy", "name avatar email");

  const data = await Promise.all(groups.map((group) => decorateGroup(group, userId)));
  return { EC: 0, data };
};

const createGroup = async (userId, payload) => {
  const name = payload.name?.trim();
  if (!name) return { EC: 1, EM: "Ten nhom khong duoc de trong" };
  const privacy = payload.privacy || "public";
  if (!["public", "private"].includes(privacy)) {
    return { EC: 2, EM: "Che do nhom khong hop le" };
  }

  const group = await Group.create({
    name,
    description: payload.description?.trim() || "",
    privacy,
    postApprovalEnabled: Boolean(payload.postApprovalEnabled),
    defaultPostVisibility: ["public", "group"].includes(payload.defaultPostVisibility)
      ? payload.defaultPostVisibility
      : "group",
    avatar: payload.avatar || "",
    coverPhoto: payload.coverPhoto || "",
    createdBy: userId,
    members: [userId],
    admins: [userId],
    moderators: [],
  });

  const data = await Group.findById(group._id)
    .populate("createdBy", "name avatar email")
    .populate("members", "name avatar email");

  return { EC: 0, EM: "Tao nhom thanh cong", data: await decorateGroup(data, userId) };
};

const updateGroup = async (userId, groupId, payload) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupAdmin(group, userId)) return { EC: 2, EM: "Chi admin moi duoc cap nhat nhom" };

  const allowedFields = [
    "name",
    "description",
    "privacy",
    "avatar",
    "coverPhoto",
    "postApprovalEnabled",
    "defaultPostVisibility",
  ];
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      group[field] =
        typeof payload[field] === "string" && field !== "defaultPostVisibility"
          ? payload[field].trim()
          : payload[field];
    }
  });

  if (!group.name) return { EC: 3, EM: "Ten nhom khong duoc de trong" };
  if (!["public", "private"].includes(group.privacy)) {
    return { EC: 4, EM: "Che do nhom khong hop le" };
  }
  if (group.privacy === "private") {
    group.defaultPostVisibility = "group";
  }
  if (!["public", "group"].includes(group.defaultPostVisibility)) {
    return { EC: 5, EM: "Che do hien thi bai viet khong hop le" };
  }

  await group.save();
  return { EC: 0, EM: "Da cap nhat nhom", data: await decorateGroup(group, userId) };
};

const updateGroupImage = async (userId, groupId, field, filePath) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupAdmin(group, userId)) return { EC: 2, EM: "Chi admin moi duoc cap nhat anh nhom" };
  if (!["avatar", "coverPhoto"].includes(field)) {
    return { EC: 3, EM: "Loai anh nhom khong hop le" };
  }
  if (!filePath) return { EC: 4, EM: "Vui long chon file anh" };

  group[field] = filePath;
  await group.save();
  return { EC: 0, EM: "Da cap nhat anh nhom", data: await decorateGroup(group, userId) };
};

const getGroupById = async (userId, groupId) => {
  const group = await Group.findById(groupId)
    .populate("createdBy", "name avatar email")
    .populate("members", "name avatar email")
    .populate("admins", "name avatar email")
    .populate("moderators", "name avatar email");

  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  return { EC: 0, data: await decorateGroup(group, userId) };
};

const joinGroup = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };

  if (isGroupMember(group, userId)) {
    return { EC: 0, EM: "Ban da la thanh vien", data: await decorateGroup(group, userId) };
  }

  const existingRequest = group.joinRequests.find(
    (request) => isSameId(request.user, userId) && request.status === "pending",
  );

  if (group.privacy === "private") {
    if (!existingRequest) {
      group.joinRequests.push({ user: userId });
      await group.save();
    }

    return {
      EC: 0,
      EM: "Da gui yeu cau tham gia nhom",
      data: await decorateGroup(group, userId),
    };
  }

  if (!isGroupMember(group, userId)) {
    group.members.push(userId);
    await group.save();
  }

  return { EC: 0, EM: "Da tham gia nhom", data: await decorateGroup(group, userId) };
};

const leaveGroup = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (isSameId(group.createdBy, userId)) {
    return { EC: 2, EM: "Chu nhom khong the roi nhom" };
  }

  group.members = group.members.filter((memberId) => !isSameId(memberId, userId));
  group.admins = group.admins.filter((adminId) => !isSameId(adminId, userId));
  group.moderators = group.moderators.filter((moderatorId) => !isSameId(moderatorId, userId));
  group.joinRequests = group.joinRequests.filter((request) => !isSameId(request.user, userId));
  await group.save();

  return { EC: 0, EM: "Da roi nhom", data: await decorateGroup(group, userId) };
};

const listJoinRequests = async (userId, groupId) => {
  const group = await Group.findById(groupId).populate("joinRequests.user", "name avatar email");
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) return { EC: 2, EM: "Chi admin/mod moi xem duoc yeu cau" };

  return {
    EC: 0,
    data: group.joinRequests.filter((request) => request.status === "pending"),
  };
};

const respondJoinRequest = async (userId, groupId, requestId, action) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) return { EC: 2, EM: "Chi admin/mod moi duyet yeu cau" };

  const request = group.joinRequests.id(requestId);
  if (!request || request.status !== "pending") {
    return { EC: 3, EM: "Khong tim thay yeu cau dang cho" };
  }

  if (!["approve", "reject"].includes(action)) {
    return { EC: 4, EM: "Hanh dong khong hop le" };
  }

  request.status = action === "approve" ? "approved" : "rejected";
  request.reviewedAt = new Date();
  request.reviewedBy = userId;

  if (action === "approve" && !isGroupMember(group, request.user)) {
    group.members.push(request.user);
  }

  await group.save();
  return { EC: 0, EM: action === "approve" ? "Da duyet thanh vien" : "Da tu choi yeu cau" };
};

const removeMember = async (userId, groupId, memberId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) return { EC: 2, EM: "Chi admin/mod moi duoc xoa thanh vien" };
  if (isSameId(group.createdBy, memberId)) return { EC: 3, EM: "Khong the xoa chu nhom" };
  if (isGroupModerator(group, userId) && isGroupAdmin(group, memberId)) {
    return { EC: 4, EM: "Mod khong the xoa admin" };
  }

  group.members = group.members.filter((item) => !isSameId(item, memberId));
  group.admins = group.admins.filter((item) => !isSameId(item, memberId));
  group.moderators = group.moderators.filter((item) => !isSameId(item, memberId));
  group.joinRequests = group.joinRequests.filter((request) => !isSameId(request.user, memberId));
  await group.save();

  return { EC: 0, EM: "Da xoa thanh vien", data: await decorateGroup(group, userId) };
};

const updateMemberRole = async (userId, groupId, memberId, role) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupAdmin(group, userId)) return { EC: 2, EM: "Chi admin moi duoc doi quyen" };
  if (!isGroupMember(group, memberId)) return { EC: 3, EM: "Nguoi dung chua tham gia nhom" };
  if (isSameId(group.createdBy, memberId)) return { EC: 4, EM: "Khong the doi quyen chu nhom" };

  group.admins = group.admins.filter((adminId) => !isSameId(adminId, memberId));
  group.moderators = group.moderators.filter((moderatorId) => !isSameId(moderatorId, memberId));

  if (role === "admin") {
    group.admins.push(memberId);
  } else if (role === "moderator") {
    group.moderators.push(memberId);
  } else if (role !== "member") {
    return { EC: 5, EM: "Quyen khong hop le" };
  }

  await group.save();
  return { EC: 0, EM: "Da cap nhat quyen thanh vien", data: await decorateGroup(group, userId) };
};

const getGroupPosts = async (userId, groupId, query = {}) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  const member = isGroupMember(group, userId);
  if (group.privacy === "private" && !member) {
    return { EC: 2, EM: "Ban can tham gia nhom de xem bai viet" };
  }

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 30);
  const postFilter = { group: groupId, ...publishedPostFilter };
  if (!member) postFilter.visibility = "public";

  const posts = await Post.find(postFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("author", "name avatar email");

  const data = await decoratePosts(posts, userId);

  return {
    EC: 0,
    data,
    pagination: { page, limit, hasMore: posts.length === limit },
  };
};

const getGroupMedia = async (userId, groupId, query = {}) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  const member = isGroupMember(group, userId);
  if (group.privacy === "private" && !member) {
    return { EC: 2, EM: "Ban can tham gia nhom de xem media" };
  }

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 24), 1), 60);
  const mediaFilter = {
    group: groupId,
    media: { $exists: true, $ne: [] },
    ...publishedPostFilter,
  };
  if (!member) mediaFilter.visibility = "public";
  const posts = await Post.find(mediaFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select("author media createdAt")
    .populate("author", "name avatar email");

  const data = posts.flatMap((post) =>
    post.media
      .map((item) => normalizeMediaItem(item, post._id, post.createdAt, post.author))
      .filter(Boolean),
  );

  return {
    EC: 0,
    data,
    pagination: { page, limit, hasMore: posts.length === limit },
  };
};

const createGroupPost = async (userId, groupId, payload, files = []) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupMember(group, userId)) return { EC: 2, EM: "Ban can tham gia nhom de dang bai" };

  const content = payload.content?.trim() || (files.length ? "" : "");
  if (!content && !files.length) return { EC: 3, EM: "Bai viet can co noi dung hoac media" };
  const visibility = ["public", "group"].includes(payload.visibility)
    ? payload.visibility
    : group.defaultPostVisibility || "group";
  const approvalStatus =
    group.postApprovalEnabled && !canModerate(group, userId) ? "pending" : "published";

  const media = await processPostMediaFiles(files, userId);
  const post = await Post.create({
    author: userId,
    group: groupId,
    content,
    visibility: group.privacy === "private" ? "group" : visibility,
    approvalStatus,
    hashtags: extractHashtags(content),
    media,
  });

  group.updatedAt = new Date();
  await group.save();

  const data = await Post.findById(post._id).populate("author", "name avatar email");
  return {
    EC: 0,
    EM:
      approvalStatus === "pending"
        ? "Bai viet dang cho quan tri vien phe duyet"
        : "Da dang bai trong nhom",
    data,
  };
};

const listPendingPosts = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) {
    return { EC: 2, EM: "Chi admin/mod moi xem duoc bai cho duyet" };
  }

  const posts = await Post.find({ group: groupId, approvalStatus: "pending" })
    .sort({ createdAt: -1 })
    .populate("author", "name avatar email");
  const data = await decoratePosts(posts, userId);
  return { EC: 0, data };
};

const reviewPendingPost = async (userId, groupId, postId, action) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) {
    return { EC: 2, EM: "Chi admin/mod moi duoc duyet bai" };
  }
  if (!["approve", "reject"].includes(action)) {
    return { EC: 3, EM: "Hanh dong khong hop le" };
  }

  const post = await Post.findOne({ _id: postId, group: groupId, approvalStatus: "pending" });
  if (!post) return { EC: 4, EM: "Khong tim thay bai dang cho duyet" };

  post.approvalStatus = action === "approve" ? "published" : "rejected";
  post.reviewedBy = userId;
  post.reviewedAt = new Date();
  await post.save();

  return { EC: 0, EM: action === "approve" ? "Da phe duyet bai viet" : "Da tu choi bai viet" };
};

const listGroupReports = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) {
    return { EC: 2, EM: "Chi admin/mod moi xem duoc to cao" };
  }

  const postIds = await Post.find({ group: groupId }).distinct("_id");
  const commentIds = await Comment.find({ post: { $in: postIds }, deletedAt: null }).distinct("_id");
  const reports = await Report.find({
    $or: [
      { targetType: "post", targetId: { $in: postIds } },
      { targetType: "comment", targetId: { $in: commentIds } },
    ],
    status: { $in: ["open", "reviewing"] },
  })
    .sort({ createdAt: -1 })
    .populate("reporter", "name avatar email")
    .populate("resolvedBy", "name avatar email")
    .lean();
  const reportPostIds = reports
    .filter((report) => report.targetType === "post")
    .map((report) => report.targetId);
  const reportedComments = await Comment.find({
    _id: {
      $in: reports
        .filter((report) => report.targetType === "comment")
        .map((report) => report.targetId),
    },
  })
    .populate("author", "name avatar email")
    .lean();
  const commentMap = reportedComments.reduce((acc, comment) => {
    acc[String(comment._id)] = comment;
    return acc;
  }, {});
  const commentPostIds = reportedComments.map((comment) => comment.post);
  const posts = await Post.find({ _id: { $in: [...reportPostIds, ...commentPostIds] } })
    .populate("author", "name avatar email")
    .lean();
  const postMap = posts.reduce((acc, post) => {
    acc[String(post._id)] = post;
    return acc;
  }, {});

  return {
    EC: 0,
    data: reports.map((report) => ({
      ...report,
      targetComment:
        report.targetType === "comment" ? commentMap[String(report.targetId)] || null : null,
      targetPost:
        report.targetType === "comment"
          ? postMap[String(commentMap[String(report.targetId)]?.post)] || null
          : postMap[String(report.targetId)] || null,
    })),
  };
};

const resolveGroupReport = async (userId, groupId, reportId, action) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) {
    return { EC: 2, EM: "Chi admin/mod moi xu ly to cao" };
  }
  if (!["reviewing", "resolved", "rejected"].includes(action)) {
    return { EC: 3, EM: "Trang thai xu ly khong hop le" };
  }

  const postIds = await Post.find({ group: groupId }).distinct("_id");
  const commentIds = await Comment.find({ post: { $in: postIds } }).distinct("_id");
  const report = await Report.findOne({
    _id: reportId,
    $or: [
      { targetType: "post", targetId: { $in: postIds } },
      { targetType: "comment", targetId: { $in: commentIds } },
    ],
  });
  if (!report) return { EC: 4, EM: "Khong tim thay to cao trong nhom" };

  report.status = action;
  if (["resolved", "rejected"].includes(action)) {
    report.resolvedBy = userId;
    report.resolvedAt = new Date();
  }
  await report.save();

  return { EC: 0, EM: "Da cap nhat to cao", data: report };
};

const listEvents = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (group.privacy === "private" && !isGroupMember(group, userId)) {
    return { EC: 2, EM: "Ban can tham gia nhom de xem su kien" };
  }

  const data = await GroupEvent.find({ group: groupId })
    .sort({ startAt: 1 })
    .populate("createdBy", "name avatar email")
    .populate("attendees", "name avatar email");
  return {
    EC: 0,
    data: data.map((event) => {
      const eventObject = event.toObject();
      return {
        ...eventObject,
        attendeeCount: event.attendees.length,
        isAttending: event.attendees.some((attendee) => isSameId(attendee, userId)),
      };
    }),
  };
};

const createEvent = async (userId, groupId, payload) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!canModerate(group, userId)) {
    return { EC: 2, EM: "Chi admin hoac mod moi duoc tao su kien" };
  }

  const title = payload.title?.trim();
  if (!title) return { EC: 3, EM: "Ten su kien khong duoc de trong" };
  const startAt = new Date(payload.startAt);
  const endAt = payload.endAt ? new Date(payload.endAt) : null;
  if (!payload.startAt || Number.isNaN(startAt.getTime())) {
    return { EC: 4, EM: "Thoi gian bat dau khong hop le" };
  }
  if (endAt && Number.isNaN(endAt.getTime())) {
    return { EC: 5, EM: "Thoi gian ket thuc khong hop le" };
  }
  if (endAt && endAt <= startAt) {
    return { EC: 6, EM: "Thoi gian ket thuc phai sau thoi gian bat dau" };
  }

  const data = await GroupEvent.create({
    group: groupId,
    title,
    description: payload.description?.trim() || "",
    startAt,
    endAt,
    location: payload.location?.trim() || "",
    createdBy: userId,
    attendees: [userId],
  });

  return { EC: 0, EM: "Da tao su kien nhom", data };
};

const attendEvent = async (userId, groupId, eventId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupMember(group, userId)) {
    return { EC: 2, EM: "Ban can tham gia nhom de tham gia su kien" };
  }

  const event = await GroupEvent.findOne({ _id: eventId, group: groupId });
  if (!event) return { EC: 3, EM: "Khong tim thay su kien" };

  if (!event.attendees.some((attendeeId) => isSameId(attendeeId, userId))) {
    event.attendees.push(userId);
    await event.save();
  }

  return { EC: 0, EM: "Da tham gia su kien", data: event };
};

const leaveEvent = async (userId, groupId, eventId) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupMember(group, userId)) {
    return { EC: 2, EM: "Ban can tham gia nhom de huy tham gia su kien" };
  }

  const event = await GroupEvent.findOne({ _id: eventId, group: groupId });
  if (!event) return { EC: 3, EM: "Khong tim thay su kien" };

  event.attendees = event.attendees.filter((attendeeId) => !isSameId(attendeeId, userId));
  await event.save();

  return { EC: 0, EM: "Da huy tham gia su kien", data: event };
};

module.exports = {
  attendEvent,
  createEvent,
  createGroup,
  createGroupPost,
  getGroupById,
  getGroupMedia,
  getGroupPosts,
  joinGroup,
  leaveGroup,
  leaveEvent,
  listJoinRequests,
  listEvents,
  listGroups,
  listGroupReports,
  listPendingPosts,
  removeMember,
  resolveGroupReport,
  reviewPendingPost,
  respondJoinRequest,
  updateGroup,
  updateGroupImage,
  updateMemberRole,
};
