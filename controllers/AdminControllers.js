const Admin = require('../model/AdminModel');
const OTP = require('../model/OtpModel');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');


module.exports.register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email.endsWith('@gmail.com')) {
            return res.json({ msg: "Invalid email domain", status: false });
        }
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || !otpRecord.verified) {
            return res.json({ msg: "OTP not verified. Please verify first!", status: false });
        }
        await OTP.deleteOne({ email });

        let emailCheck = await Admin.findOne({ email });
        if (emailCheck) {
            return res.json({ msg: "Email already used", status: false });
        }
        const hashedPassword = bcrypt.hashSync(password, saltRounds);
        const user = await Admin.create({ email, password: hashedPassword });

        return res.json({ status: true, user });
    } catch (ex) {
        next(ex);
    }
};


module.exports.sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email.endsWith('@gmail.com')) {
            return res.json({ msg: "Invalid email domain", status: false });
        }

        const otp = otpGenerator.generate(6, { 
            digits: true, 
            lowerCaseAlphabets: false, 
            upperCaseAlphabets: false, 
            specialChars: false 
        });

        await OTP.findOneAndUpdate(
            { email },
            { otp, verified: false },
            { upsert: true, new: true }
        );

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'satvikrajan@gmail.com',
                pass: 'qwxw rffj spih mwtd'
            }
        });

        let mailOptions = {
            from: 'satvikrajan@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for a few minutes.`
        };

        await transporter.sendMail(mailOptions);

        return res.json({ msg: "OTP sent successfully", status: true });
    }
    catch (ex) {
        next(ex);
    }
};

module.exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord || otpRecord.otp !== otp) {
            return res.json({ status: false, msg: "Invalid OTP" });
        }
        await OTP.updateOne({ email }, { $set: { verified: true } });

        return res.json({ status: true, msg: "OTP verified successfully" });
    } catch (err) {
        console.error("Error verifying OTP:", err);
        return res.status(500).json({ status: false, msg: "Server error", error: err });
    }
};

module.exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await Admin.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Incorrect Email or Password", status: false });
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ msg: "Incorrect Email or Password", status: false });
        }

        return res.status(200).json({ status: true, user: { email: user.email, _id: user._id } });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getAllAdmins = async (req, res, next) => {
    try {
        const users = await Admin.find({ _id: { $ne: req.params.id } }).select(["email", "_id"]);
        return res.status(200).json(users);
    } catch (ex) {
        next(ex);
    }
};
