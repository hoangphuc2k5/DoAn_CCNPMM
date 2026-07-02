const callService = require("../services/callService");

const currentUserId = (req) => req.user._id;

const getCallHistory = async (req, res) => {
  const { conversationId } = req.params;
  const { limit, skip } = req.query;
  const data = await callService.getCallHistory(
    conversationId,
    currentUserId(req),
    limit ? parseInt(limit, 10) : 50,
    skip ? parseInt(skip, 10) : 0
  );
  return res.status(200).json(data);
};

const startCall = async (req, res) => {
  const { conversationId } = req.params;
  const { type } = req.body;
  const data = await callService.createCall(conversationId, currentUserId(req), type);
  return res.status(200).json(data);
};

const getCallById = async (req, res) => {
  const { callId } = req.params;
  const data = await callService.getCallById(callId, currentUserId(req));
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const acceptCall = async (req, res) => {
  const { callId } = req.params;
  const data = await callService.acceptCall(callId, currentUserId(req));
  return res.status(200).json(data);
};

const declineCall = async (req, res) => {
  const { callId } = req.params;
  const data = await callService.declineCall(callId, currentUserId(req));
  return res.status(200).json(data);
};

const endCall = async (req, res) => {
  const { callId } = req.params;
  const data = await callService.endCall(callId, currentUserId(req));
  return res.status(200).json(data);
};

module.exports = {
  getCallHistory,
  getCallById,
  startCall,
  acceptCall,
  declineCall,
  endCall,
};
