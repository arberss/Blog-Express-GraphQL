const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const User = require('../../models/user');
const Post = require('../../models/post');

module.exports = {
  createUserRes: async ({ userInput }, req) => {
    const { email, name, file, password, confirmPassword } = userInput;

    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: 'E-Mail is invalid.' });
    }
    if (validator.isEmpty(name)) {
      errors.push({ message: 'Name can not be empty!' });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email }).select('-password');
    if (existingUser) {
      const error = new Error('User exists already!');
      error.code = 409;
      throw error;
    }
    if (password !== confirmPassword) {
      const error = new Error('Password does NOT match!');
      throw error;
    }

    const hashedPw = await bcrypt.hash(password, 12);

    const user = new User({
      email,
      name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  currentUserRes: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId).select('-password');

    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  },
  loginRes: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('This user does not exist');
      error.status = 404;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password is incorrect.');
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      `${process.env.LOGIN_TOKEN}`,
      { expiresIn: '1h' }
    );
    return { token, userId: user._id.toString() };
  },
  updateUserRes: async function ({ userInput }, req) {
    const { email, name, password, confirmPassword } = userInput;

    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: 'E-Mail is invalid.' });
    }
    if (validator.isEmpty(name)) {
      errors.push({ message: 'Name can not be empty!' });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error('Password does NOT match!');
      throw error;
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const userData = {
      email,
      name,
      password: hashedPw,
    };

    let user = await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: userData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('posts');

    return {
      ...user._doc,
      _id: user._id.toString(),
      name: user.name.toString(),
      email: user.email.toString(),
      posts: user.posts,
    };
  },
  adminUpdateRolesRes: async function ({ userId, role }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    if (req.role.toLowerCase() === 'admin') {
      const newRole = await User.findByIdAndUpdate(
        { _id: userId },
        { $set: { role: role.toUpperCase() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return {
        userId: newRole._id.toString(),
        role: newRole.role.toString(),
      };
    }

    const error = new Error('Not authorized!');
    error.code = 401;
    throw error;
  },
  updateUserRoleRes: async function ({ role }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const newRole = await User.findByIdAndUpdate(
      { _id: req.userId },
      { $set: { role: role.toUpperCase() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
      userId: newRole._id.toString(),
      role: newRole.role,
    };
  },
  deleteUserRes: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    if (req.role.toLowerCase() === 'admin') {
      await Promise.all([
        Post.deleteMany({ creator: { _id: id } }),
        User.findByIdAndDelete(id),
      ]);
      return id;
    } else {
      const user = await User.findById(id);
      if (user._id.toString() !== req.userId.toString()) {
        const error = new Error('Not authorized!');
        error.code = 401;
        throw error;
      }

      await Promise.all([
        Post.deleteMany({ creator: { _id: id } }),
        User.findByIdAndDelete(id),
      ]);
      return id;
    }
  },
  forgotPasswordRes: async function ({ email }, req) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('This user does not exist');
      error.status = 404;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      `${process.env.FORGOT_EMAIL_SECRET}`,
      { expiresIn: 60 * 15 }
    );

    const expiresDate = new Date() * 60 * 15;

    user.passwordResetToken = token;
    user.passwordResetExpires = expiresDate.valueOf().toString();
    await user.save();

     // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: `${process.env.SEND_MAIL_USER}`,
        pass: `${process.env.SEND_MAIL_PASS}`, 
      },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: 'BlogExpress', // sender address
      to: email, // list of receivers
      subject: 'Reset Password - BlogExpress', // Subject line
      text: `Blog Express`, // plain text body
      html: `<h1>Link:</h1> http://localhost:8080/api/user/reset-password/${token}`, // html body
    });


    return email.toString();
  },
  resetPasswordRes: async function ({ token, password, confirmPassword }, req) {
    const decodedToken = jwt.verify(token, `${process.env.FORGOT_EMAIL_SECRET}`);
    if (!decodedToken) {
      const error = new Error('Token is invalid or has expired!');
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date().valueOf().toString() },
    });
    if (!user) {
      const error = new Error('Token is invalid or has expired!');
      error.status = 400;
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error('Password does NOT match!');
      throw error;
    }

    const hashedPw = await bcrypt.hash(password, 12);

    user.password = hashedPw;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user.email.toString();
  },
  allUsersRes: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const users = await User.find().select('-password');

    return users.map((user) => {
      return {
        ...user._doc,
        _id: user._id.toString(),
      };
    });
  },
};
