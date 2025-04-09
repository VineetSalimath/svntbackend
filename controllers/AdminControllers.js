const Admin = require('../model/AdminModel')
const bcrypt = require('bcrypt')
const saltRounds = 10;

module.exports.register = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        let emailCheck = await Admin.findOne({ email });
        if (emailCheck) {
            return res.status(400).json({ msg: "Email already used", status: false });
        }

        const hashedPassword = bcrypt.hashSync(password, saltRounds);
        const user = await Admin.create({
            email, 
            password: hashedPassword
        });

        return res.status(201).json({ status: true, user: { email: user.email, _id: user._id } });
    }
    catch (ex) {
        next(ex);
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
    }
    catch (ex) {
        next(ex);
    }
};
