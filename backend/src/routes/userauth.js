const express = require('express');
const router = express.Router();
const sendAdminInvite = require('../controllers/userAuthen')
const acceptAdminInvite = require('../controllers/userAuthen')
const registerGlobalAdmin = require('../controllers/userAuthen')
const registerUser = require('../controllers/userAuthen')
const loginUser = require('../controllers/userAuthen')
const socialLogin = require('../controllers/userAuthen')



//register global admin
router.post('/register-global-admin',registerGlobalAdmin);
//invite admin
router.post("/invite", sendAdminInvite);
//accept admin invite AND register
router.post('/accept-invite',acceptAdminInvite);
//register user
router.post('/register-user',registerUser);
//login
router.post('/login',loginUser);
//googlelogin or facebook login
router.post('/social-login',socialLogin);
//get user profile
router.get('/profile',getProfile);
//update user profile
router.put('/profile',updateProfile);
//logout
router.post('/logout',logout);
//logout all devices
router.post('/logout-all-devices',logoutAllDevices);
//forgot password
router.post('/forgot-password',forgotPassword);
//reset password
router.post('/reset-password',resetPassword);
//request OTP
router.post('/request-otp',requestOTP);
//verify OTP
router.post('/verify-otp',verifyOTP);
//resend OTP
router.post('/resend-otp',resendOTP);
//block and unblock user
router.post('/block-user',blockUser);
//list role based users
router.get('/list-users',listUsers);
//delete user account
router.delete('/delete-user',deleteUser);
//update role
router.put('/update-role',updateRole);
//update clg
router.put('/update-clg',updateClg);
//search users
router.get('/search-users',searchUsers);
//update dob visibility
router.put('/update-dob-visibility',updateDobVisibility);
//update profile picture
router.put('/update-profile-picture',updateProfilePicture);
