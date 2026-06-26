const Group = require("../models/group");
const GroupEvent = require("../models/groupEvent");
const Post = require("../models/post");
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

const decorateGroup = async (group, userId) => {
  const groupObject = group.toObject ? group.toObject() : group;
  const [postCount, eventCount] = await Promise.all([
    Post.countDocuments({ group: group._id }),
    GroupEvent.countDocuments({ group: group._id }),
  ]);

  return {
    ...groupObject,
    memberCount: group.members?.length || 0,
    pendingRequestCount:
      group.joinRequests?.filter((request) => request.status === "pending").length || 0,
    myJoinRequestStatus:
      group.joinRequests?.find((request) => isSameId(request.user, userId))?.status || null,
    postCount,
    eventCount,
    myRole: isGroupAdmin(group, userId)
      ? "admin"
      : isGroupModerator(group, userId)
        ? "moderator"
        : isGroupMember(group, userId)
          ? "member"
          : "guest",
    isMember: isGroupMember(group, userId),
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

  const group = await Group.create({
    name,
    description: payload.description?.trim() || "",
    privacy: payload.privacy || "public",
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

  const allowedFields = ["name", "description", "privacy", "avatar", "coverPhoto"];
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      group[field] = typeof payload[field] === "string" ? payload[field].trim() : payload[field];
    }
  });

  if (!group.name) return { EC: 3, EM: "Ten nhom khong duoc de trong" };
  if (!["public", "private"].includes(group.privacy)) {
    return { EC: 4, EM: "Che do nhom khong hop le" };
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
  if (group.privacy === "private" && !isGroupMember(group, userId)) {
    return { EC: 2, EM: "Ban can tham gia nhom de xem bai viet" };
  }

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 30);
  const posts = await Post.find({ group: groupId })
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

const createGroupPost = async (userId, groupId, payload, files = []) => {
  const group = await Group.findById(groupId);
  if (!group) return { EC: 1, EM: "Khong tim thay nhom" };
  if (!isGroupMember(group, userId)) return { EC: 2, EM: "Ban can tham gia nhom de dang bai" };

  const content = payload.content?.trim() || (files.length ? "" : "");
  if (!content && !files.length) return { EC: 3, EM: "Bai viet can co noi dung hoac media" };

  const media = await processPostMediaFiles(files, userId);
  const post = await Post.create({
    author: userId,
    group: groupId,
    content,
    visibility: "public",
    hashtags: extractHashtags(content),
    media,
  });

  group.updatedAt = new Date();
  await group.save();

  const data = await Post.findById(post._id).populate("author", "name avatar email");
  return { EC: 0, EM: "Da dang bai trong nhom", data };
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
  if (!payload.startAt || Number.isNaN(new Date(payload.startAt).getTime())) {
    return { EC: 4, EM: "Thoi gian bat dau khong hop le" };
  }

  const data = await GroupEvent.create({
    group: groupId,
    title,
    description: payload.description?.trim() || "",
    startAt: new Date(payload.startAt),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
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
  const event = await GroupEvent.findOne({ _id: eventId, group: groupId });
  if (!event) return { EC: 1, EM: "Khong tim thay su kien" };

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
  getGroupPosts,
  joinGroup,
  leaveGroup,
  leaveEvent,
  listJoinRequests,
  listEvents,
  listGroups,
  removeMember,
  respondJoinRequest,
  updateGroup,
  updateGroupImage,
  updateMemberRole,
};
