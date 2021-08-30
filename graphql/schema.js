const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type AuthData {
        token: String!
        userId: String!
    }

    type Post {
        _id: ID!
        title: String!
        content: String!
        postStatus: String!
        imageUrl: String
        comments: [Comments]
        likes: [Likes]
        unlikes: [Likes]
        creator: User!
        createdAt: String
        updatedAt: String
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        imageUrl: String
        password: String
        role: String!
        posts: [Post]!
        favorites: [ID]
        passwordResetToken: String
        passwordResetExpires: String
    }

    type Comments {
        _id: ID!
        user: ID!
        text: String!
        date: String!
    }

    type Likes {
        _id: ID!
        user: ID!
    }

    type UserRole{
        userId: ID!
        role: String!
    }

    type PostStatus{
        postId: ID!
        status: String!
    }

    type AddCommentType {
        _id: ID!
        userId: ID!
        postId: ID!
        text: String
    }

    type DeleteCommentType {
        postId: ID!
        commentId: ID!
    }

    type LikePostType {
        _id: ID!
        postId: ID!
    }

    input postInputData {
        title: String!
        imageUrl: String
        content: String!
        postStatus: String!
    }

    input userInputData {
        email: String!
        name: String!
        file: String
        password: String!
        confirmPassword: String!
    }

    input commentInputData {
        postId: ID!
        text: String!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        currentUser: User!
        getAllPosts: [Post]!
        getPublicPosts: [Post]!
        getPrivatePosts: [Post]!
        getPost(id: ID!): Post!
        allUsers: [User]!
    }

    type RootMutation {
        createUser(userInput: userInputData): User!
        createPost(postInput: postInputData): Post!
        updatePost(postInput: postInputData, id: ID!): Post!
        updateUser(userInput: userInputData): User!
        updateUserRole(role: String!): UserRole!
        adminUpdateRoles(userId: ID!, role: String!): UserRole!
        updatePostStatus(id: ID!, status: String!): PostStatus!
        deletePost(id: ID!): ID!
        deleteUser(id: ID!): ID!
        forgotPassword(email: String!): String
        resetPassword(token: String!, password: String!, confirmPassword: String!): String
        addComment(commentInput: commentInputData): AddCommentType!
        deleteComment(postId: ID!, commentId: ID!): DeleteCommentType!
        likePost(postId: ID!): LikePostType!
        unlikePost(postId: ID!): LikePostType!
        favoritePost(postId: ID!): ID!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }

`);
