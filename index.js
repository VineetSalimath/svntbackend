const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Candidate = require('./model/CandidatesModel');
const JobModel = require('./model/JobModel');
const adminRoutes = require('./routes/AdminRoutes');
const candidateRoutes = require('./routes/CandidateRoutes');
const jobRoutes = require('./routes/JobRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", adminRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/admin/api/jobs', jobRoutes);

// Database
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB connected successfully');
    } catch (err) {
        console.error('Database connection error:', err);
    }
}
connectDB();

// File upload config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Email config
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Email route
app.post('/api/auth/send-email', (req, res) => {
    const { senderName, senderEmail, subject, text, phoneNumber } = req.body;

    if (!senderName || senderName.length < 4) {
        return res.status(400).json({ error: "Name should be greater than 3 characters" });
    }
    if (!subject || !text) {
        return res.status(400).json({ error: 'Subject and text are required' });
    }
    if (!senderEmail || !validateEmail(senderEmail)) {
        return res.status(400).json({ error: 'Invalid sender email' });
    }
    if (!phoneNumber || !validatePhone(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: process.env.RECEIVER_EMAIL,
        subject: subject,
        text: `Sender: ${senderName} <${senderEmail}>\n\n${text}\nPhone Number: ${phoneNumber}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error sending email' });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'Email sent successfully' });
    });
});

// Form submission route
app.post('/careers/api/submitForm', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, totalExperience, relevantExperience } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Resume file is required' });
        }

        const candidate = new Candidate({
            name,
            email,
            phone,
            totalExperience,
            relevantExperience,
            resume: {
                data: file.buffer,
                contentType: file.mimetype,
                filename: file.originalname,
            }
        });

        await candidate.save();

        res.status(201).json({ message: 'Candidate saved successfully', id: candidate._id });
    } catch (error) {
        console.error('Error saving candidate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Fetch all candidates
app.get('/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        res.status(200).json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Fetch all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await JobModel.find({});
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching jobs' });
    }
});

// Delete job
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        await JobModel.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting job' });
    }
});

// Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Download resume
app.get('/api/resume/:id', async (req, res) => {
    try {
        const candidateId = req.params.id.trim();
        const candidate = await Candidate.findById(candidateId);

        if (!candidate || !candidate.resume || !candidate.resume.data) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        res.set({
            'Content-Type': candidate.resume.contentType,
            'Content-Disposition': 'inline'
            // 'Content-Disposition': `attachment; filename="${candidate.resume.filename}"`,
        });

        res.send(candidate.resume.data);
    } catch (error) {
        console.error('Error fetching resume:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Helper validators
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}
