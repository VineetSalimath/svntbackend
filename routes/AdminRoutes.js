const{register,login, verifyOTP, getAllAdmins, sendOTP} = require("../controllers/AdminControllers")
const router = require('express').Router();
router.post("/register",register)
router.post("/login",login)
router.get('/all-admins/:id', getAllAdmins);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
module.exports = router;