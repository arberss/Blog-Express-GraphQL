const mongoose = require('mongoose');
const validator = require('validator');

const User = require('../../models/user');
const Post = require('../../models/post');

module.exports = {
  createPostRes: async function ({ postInput }, req) {
    const { title, imageUrl, content, postStatus } = postInput;

    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (
      validator.isEmpty(title) ||
      validator.isEmpty(content) ||
      validator.isEmpty(postStatus)
    ) {
      errors.push({ message: 'Please fill all inputs!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      const error = new Error('Invalid user.');
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title,
      content,
      postStatus,
      creator: user,
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  updatePostRes: async function ({ postInput, id }, req) {
    const { title, imageUrl, content, postStatus } = postInput;

    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (
      validator.isEmpty(title) ||
      validator.isEmpty(content) ||
      validator.isEmpty(postStatus)
    ) {
      errors.push({ message: 'Please fill all inputs!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const findPost = await Post.findById(id)
      .select('_id')
      .populate('creator', '_id');
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      const error = new Error('Invalid user.');
      error.code = 401;
      throw error;
    }

    if (findPost.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('You do NOT have access to update this post!');
      error.code = 401;
      throw error;
    }

    const postData = {
      title,
      content,
      postStatus,
      creator: user,
    };

    let post = await Post.findOneAndUpdate(
      { _id: id },
      { $set: postData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('creator', '_id');

    user.posts.pull(id);
    user.posts.push(post);
    await user.save();
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      creator: {
        _id: user._id.toString(),
        name: user.name.toString(),
        email: user.email.toString(),
        role: user.role.toString(),
      },
    };
  },
  getAllPostsRes: async function (args, req) {
    const posts = await Post.find().populate('creator', '-password');
    if (!posts) {
      const error = new Error('No post founded!');
      error.code = 404;
      throw error;
    }

    if (req.role.toLowerCase() !== 'admin' && !req.isAuth) {
      const error = new Error('You do not have access to all posts!');
      error.code = 401;
      throw error;
    }

    const newPost = posts.map((p) => {
      return {
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return newPost;
  },
  getPublicPostsRes: async function (args, req) {
    const posts = await Post.find(
      { postStatus: 'public' } || { postStatus: 'PUBLIC' } || {
          postStatus: 'Public',
        }
    ).populate('creator', '-password');
    if (!posts) {
      const error = new Error('No post founded!');
      error.code = 404;
      throw error;
    }

    const newPost = posts.map((p) => {
      return {
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return newPost;
  },
  getPrivatePostsRes: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId)
      .select('-password')
      .populate('posts');

    if (!user.posts) {
      const error = new Error('No post founded!');
      error.code = 404;
      throw error;
    }

    return user.posts.map((p) => {
      return {
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  },
  getPostRes: async function ({ id }, req) {
    const post = await Post.findById(id).populate('creator', 'name email');
    if (!post) {
      const error = new Error('No post founded!');
      error.code = 404;
      throw error;
    }
    if (post.postStatus === 'private' && !req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    return {
      ...post,
      _id: post._id.toString(),
      title: post.title.toString(),
      content: post.content.toString(),
      postStatus: post.postStatus.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      creator: {
        _id: post.creator._id.toString(),
        name: post.creator.name.toString(),
        email: post.creator.email.toString(),
      },
    };
  },
  deletePostRes: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate('creator', '_id');

    if (req.role.toLowerCase() === 'admin') {
      const user = await User.findById(post.creator._id).populate('posts');
      user.posts.pull(id);
      await user.save();
      await Post.findByIdAndDelete(id);
      return id;
    } else {
      const user = await User.findById(req.userId).populate('posts');
      if (post.creator._id.toString() !== req.userId.toString()) {
        const error = new Error('Not authorized!');
        error.code = 401;
        throw error;
      }
      user.posts.pull(id);
      await user.save();
      await Post.findByIdAndDelete(id);
      return id;
    }
  },
  updatePostStatusRes: async function ({ id, status }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate('creator', '_id');

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized!');
      error.code = 401;
      throw error;
    }

    await Post.findOneAndUpdate(
      { _id: id },
      { $set: { postStatus: status } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
      postId: id.toString(),
      status: status.toString(),
    };
  },
  addCommentRes: async function ({ commentInput }, req) {
    const { postId, text } = commentInput;

    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator', '_id');
    if (!post) {
      const error = new Error('Post does not exist!');
      error.code = 404;
      throw error;
    }

    const commentId = new mongoose.Types.ObjectId();

    post.comments.push({ _id: commentId, user: req.userId, text });
    const savedPost = await post.save();

    return {
      _id: commentId.toString(),
      userId: req.userId.toString(),
      postId: postId.toString(),
      text: text.toString(),
    };
  },
  deleteCommentRes: async function ({ postId, commentId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator', '_id');
    if (!post) {
      const error = new Error('Post does not exist!');
      error.code = 404;
      throw error;
    }

    const findComment = post.comments.find(
      (comment) => comment._id.toString() === commentId.toString()
    );
    if (!findComment) {
      const error = new Error('This comment does not exist!');
      error.code = 404;
      throw error;
    }

    if (findComment.user.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized.');
      error.code = 400;
      throw error;
    }

    post.comments.pull(commentId);
    await post.save();

    return {
      postId: postId.toString(),
      commentId: commentId.toString(),
    };
  },
  likePostRes: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator', '_id');
    if (!post) {
      const error = new Error('Post does not exist!');
      error.code = 404;
      throw error;
    }

    const checkIfLiked = post.likes.find(
      (p) => p.user.toString() === req.userId.toString()
    );
    const checkIfUnliked = post.unlikes.find(
      (p) => p.user.toString() === req.userId.toString()
    );

    if (checkIfLiked.user.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized.');
      error.code = 400;
      throw error;
    }

    // if is not liked
    if (!checkIfLiked) {
      const likeId = new mongoose.Types.ObjectId();
      if (checkIfUnliked) {
        await Post.findOneAndUpdate(
          { _id: postId },
          { $pull: { unlikes: { user: req.userId } } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      }
      post.likes.push({ _id: likeId, user: req.userId });
      await post.save();
      return {
        _id: likeId.toString(),
        postId: postId.toString(),
      };
    } else {
      // if is liked
      post.likes.pull(checkIfLiked._id);
      await post.save();
      return {
        _id: checkIfLiked._id.toString(),
        postId: postId.toString(),
      };
    }
  },
  unlikePostRes: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator', '_id');
    if (!post) {
      const error = new Error('Post does not exist!');
      error.code = 404;
      throw error;
    }

    const checkIfLiked = post.likes.find(
      (p) => p.user.toString() === req.userId.toString()
    );
    const checkIfUnliked = post.unlikes.find(
      (p) => p.user.toString() === req.userId.toString()
    );

    if (checkIfUnliked.user.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized.');
      error.code = 400;
      throw error;
    }

    // if is not unliked
    if (!checkIfUnliked) {
      const unlikeId = new mongoose.Types.ObjectId();
      if (checkIfLiked) {
        await Post.findOneAndUpdate(
          { _id: postId },
          { $pull: { likes: { user: req.userId } } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      }
      post.unlikes.push({ _id: unlikeId, user: req.userId });
      await post.save();
      return {
        _id: unlikeId.toString(),
        postId: postId.toString(),
      };
    } else {
      // if is unliked
      post.unlikes.pull(checkIfUnliked._id);
      await post.save();
      return {
        _id: checkIfUnliked._id.toString(),
        postId: postId.toString(),
      };
    }
  },
  favoritePostRes: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User does not exist!');
      error.code = 404;
      throw error;
    }

    if (user.favorites.toString().includes(postId.toString())) {
      user.favorites = user.favorites.filter((p) => p.toString() !== postId);
    } else {
      user.favorites.push(postId);
    }

    await user.save();

    return postId.toString();
  },
};
