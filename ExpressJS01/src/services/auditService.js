const AuditLog = require("../models/auditLog");

const writeAuditLog = async ({
  actor = null,
  action,
  targetType = "",
  targetId = "",
  metadata = {},
  ipAddress = "",
  userAgent = "",
}) => {
  if (!action) return null;

  try {
    return await AuditLog.create({
      actor,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
    return null;
  }
};

module.exports = {
  writeAuditLog,
};
