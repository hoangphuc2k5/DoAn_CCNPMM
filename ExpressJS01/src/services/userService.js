require("dotenv").config();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;

const createUserService = async (name, email, password) => {
  try {
    //check user exist
    const user = await User.findOne({ email });
    if (user) {
      console.log(`>>> user exist, chon 1 email khac: ${email}`);
      return null;
    }

    //hash user password
    const hashPassword = await bcrypt.hash(password, saltRounds);
    //save user to database
    let result = await User.create({
      name: name,
      email: email,
      password: hashPassword,
      role: "User",
    });
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const loginService = async (email1, password) => {
  try {
    //fetch user by email
    const user = await User.findOne({ email: email1 });
    if (user) {
      //compare password
      const isMatchPassword = await bcrypt.compare(password, user.password);
      if (!isMatchPassword) {
        return {
          EC: 2,
          EM: "Email/Password khong hop le",
        };
      } else {
        //create an access token
        const payload = {
          _id: user._id,
          email: user.email,
          name: user.name,
        };

        const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE,
        });
        return {
          EC: 0,
          access_token,
          user: {
            email: user.email,
            name: user.name,
          },
        };
      }
    } else {
      return {
        EC: 1,
        EM: "Email/Password khong hop le",
      };
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getUserService = async () => {
  try {
    let result = await User.find({}).select("-password");
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getProfileService = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return {
        EC: 1,
        EM: "User not found",
      };
    }
    return {
      EC: 0,
      data: user,
    };
  } catch (error) {
    console.log(error);
    return {
      EC: 1,
      EM: "Error fetching profile",
    };
  }
};

const updateProfileService = async (userId, updateData) => {
  try {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");
    if (!user) {
      return {
        EC: 1,
        EM: "User not found",
      };
    }
    return {
      EC: 0,
      EM: "Profile updated successfully",
      data: user,
    };
  } catch (error) {
    console.log(error);
    return {
      EC: 1,
      EM: "Error updating profile",
    };
  }
};

const forgotPasswordService = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return {
                EC: 1,
                EM: "Email khong ton tai"
            };
        }
        return {
            EC: 0,
            EM: "Yeu cau khoi phuc da duoc ghi nhan"
        };
    } catch (error) {
        console.log(error);
        return {
            EC: 2,
            EM: "Co loi xay ra"
        };
    }
}

module.exports = {
  createUserService,
  loginService,
  getUserService,
  getProfileService,
  updateProfileService,
};
    createUserService, loginService, getUserService, forgotPasswordService
}
