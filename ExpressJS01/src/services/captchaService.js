const jwt = require("jsonwebtoken");

const createCaptchaChallenge = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = String(a + b);
  const challengeToken = jwt.sign(
    {
      purpose: "captcha",
      answer,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  return {
    EC: 0,
    data: {
      question: `${a} + ${b} = ?`,
      challengeToken,
    },
  };
};

const verifyCaptchaChallenge = (challengeToken, answer) => {
  if (!challengeToken) return false;

  try {
    const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
    return decoded.purpose === "captcha" && String(decoded.answer) === String(answer || "").trim();
  } catch (error) {
    return false;
  }
};

module.exports = {
  createCaptchaChallenge,
  verifyCaptchaChallenge,
};
