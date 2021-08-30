const PostResolvers = require('./postRes');
const UserResolvers = require('./userRes');

module.exports = {
  // USER RESOLVERS
  createUser: UserResolvers.createUserRes,
  login: UserResolvers.loginRes,
  allUsers: UserResolvers.allUsersRes,
  currentUser: UserResolvers.currentUserRes,
  updateUser: UserResolvers.updateUserRes,
  updateUserRole: UserResolvers.updateUserRoleRes,
  adminUpdateRoles: UserResolvers.adminUpdateRolesRes,
  forgotPassword: UserResolvers.forgotPasswordRes,
  resetPassword: UserResolvers.resetPasswordRes,
  deleteUser: UserResolvers.deleteUserRes,

  // POST RESOLVERS
  createPost: PostResolvers.createPostRes,
  getPost: PostResolvers.getPostRes,
  updatePost: PostResolvers.updatePostRes,
  getAllPosts: PostResolvers.getAllPostsRes,
  getPublicPosts: PostResolvers.getPublicPostsRes,
  getPrivatePosts: PostResolvers.getPrivatePostsRes,
  updatePostStatus: PostResolvers.updatePostStatusRes,
  addComment: PostResolvers.addCommentRes,
  deleteComment: PostResolvers.deleteCommentRes,
  likePost: PostResolvers.likePostRes,
  unlikePost: PostResolvers.unlikePostRes,
  favoritePost: PostResolvers.favoritePostRes,
  deletePost: PostResolvers.deletePostRes,
};
