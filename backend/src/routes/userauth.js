const express = require('express');
const router = express.Router();
const {
  sendAdminInvite,
  acceptAdminInvite,
  registerGlobalAdmin,
  registerUser,
  loginUser,
  socialLogin,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  updateRole,
  updateClg,
  createCollege
} = require("../controllers/userAuthen");
const userMiddleware = require("../middleware/userMiddleware");
const otpLimiter = require("../middleware/rateLimiter");






//register global admin
router.post('/register-global-admin',registerGlobalAdmin); //working properly
//invite admin
router.post("/invite", sendAdminInvite);
//accept admin invite AND register
router.post('/accept-invite',acceptAdminInvite);
//register user
router.post('/register-user',registerUser);  //working properly
//login
router.post('/login',loginUser);
//googlelogin or facebook login
router.post('/social-login',socialLogin);
//logout
router.post('/logout',userMiddleware,logout);
//create clg
router.post("/create-college", userMiddleware, createCollege);



//otp sender+ purpose(eg. register ,login,verifyemail,etc) skip for now 
// router.post('/request-otp',requestOTP);
// router.post('/verify-otp',verifyOTP);
// router.post('/resend-otp',resendOTP);
//logout all devices
// router.post('/logout-all-devices',logoutAllDevices);




//get user profile
router.get('/profile',userMiddleware,getProfile);
//update user profile
router.put('/profile',userMiddleware,updateProfile);


//forgot password
router.post('/forgot-password',forgotPassword);
//reset password
router.post('/reset-password',resetPassword);
//update role
router.put("/update-role", userMiddleware, updateRole);
//update clg
router.put("/update-clg", userMiddleware, updateClg);

// //block and unblock user
// router.post('/block-user',blockUser);
// //list role based users
// router.get('/list-users',listUsers);
// //delete user account
// router.delete('/delete-user',deleteUser);
// //search users
// router.get('/search-users',searchUsers);
// //update dob visibility
// router.put('/update-dob-visibility',updateDobVisibility);
// //update profile picture
// router.put('/update-profile-picture',updateProfilePicture);


module.exports = router
