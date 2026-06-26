const {
  getFullProfileService,
  updateProfileService,
  uploadAvatarService,
  uploadCoverService,
  getUserPostsService,
  getUserFriendsService,
  getUserFollowersService,
  getUserMediaService,
  getUserMediaAlbumsService,
} = require("../services/profileService");

const getProfile = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;

  const data = await getFullProfileService(userId, currentUserId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const updateProfile = async (req, res) => {
  const userId = req.user._id;
  const data = await updateProfileService(userId, req.body);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ EC: 1, EM: "Vui lòng chọn file ảnh" });
    }

    const filePath = `/uploads/avatars/${req.file.filename}`;
    const data = await uploadAvatarService(req.user._id, filePath);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ EC: 2, EM: "Có lỗi xảy ra" });
  }
};

const uploadCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ EC: 1, EM: "Vui lòng chọn file ảnh" });
    }

    const filePath = `/uploads/covers/${req.file.filename}`;
    const data = await uploadCoverService(req.user._id, filePath);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ EC: 2, EM: "Có lỗi xảy ra" });
  }
};

const getUserPosts = async (req, res) => {
  const { userId } = req.params;
  const { cursor } = req.query;
  const currentUserId = req.user?._id;

  const data = await getUserPostsService(userId, currentUserId, cursor);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getUserFriends = async (req, res) => {
  const { userId } = req.params;
  const { limit = 10, skip = 0 } = req.query;

  const data = await getUserFriendsService(
    userId,
    parseInt(limit),
    parseInt(skip),
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getUserFollowers = async (req, res) => {
  const { userId } = req.params;
  const { limit = 10, skip = 0 } = req.query;

  const data = await getUserFollowersService(
    userId,
    parseInt(limit),
    parseInt(skip),
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getUserMedia = async (req, res) => {
  const { userId } = req.params;
  const { cursor } = req.query;
  const currentUserId = req.user?._id;

  const data = await getUserMediaService(userId, currentUserId, cursor);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getUserMediaAlbums = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;

  const data = await getUserMediaAlbumsService(userId, currentUserId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadCover,
  getUserPosts,
  getUserFriends,
  getUserFollowers,
  getUserMedia,
  getUserMediaAlbums,
};
