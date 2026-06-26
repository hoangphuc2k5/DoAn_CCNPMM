const searchService = require("../services/searchService");

const currentUserId = (req) => (req.user ? req.user._id : null);

const search = async (req, res) => {
  try {
    const data = await searchService.search(currentUserId(req), req.query.q || "");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ EC: 1, EM: error.message });
  }
};

module.exports = {
  search,
};
