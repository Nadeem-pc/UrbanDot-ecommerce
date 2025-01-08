const User = require("../../Models/userSchema") 
const Product = require("../../Models/productSchema")
const Offer = require("../../Models/offerSchema")

const bcrypt = require('bcrypt')
const crypto = require('crypto');
const passport = require("passport");
const nodemailer = require('nodemailer');

const express = require("express");
const mongoose = require('mongoose')
const env = require("dotenv").config();
const user = require("../../Routes/user")
const session = require('express-session');
const { isBlocked, userAuth } = require("../../Middlewares/User/userAuth");

 
const loadHomePage = async (req, res) => {
    try {
        const now = new Date();
        const offers = await Offer.find({ isActive: true });

        for (let offer of offers) {
            if (new Date(offer.expiresOn) < now) {
                if (offer.appliedTo === "Product") {
                    await Product.findByIdAndUpdate(offer.productId, { $set: { offerPrice: null } });
                } else if (offer.appliedTo === "Category") {
                    const categoryId = offer.categoryId
                    const productsInCategory = await Product.find({ category: categoryId })
                    for (let product of productsInCategory) {
                        product.offerPrice = null
                        await product.save();
                    }  
                }
                await Offer.deleteOne({ _id: offer._id });
            }
        }

        const products = await Product.find({ isBlocked: false });
        return res.render("home", { products, user: req.session.user || null });

    } catch (error) {
        console.log("Something Went Wrong");
        res.redirect('/pageNotFound');
    }
};

const pageNotFound = async (req,res) => {
    try{
        return res.render("page-error")
    } 
    catch(error){
        res.redirect('/pageNotFound')
    }
}

const loadLogin = async (req,res) => {
    try{
        return res.render('login')
    }
    catch(error){
        console.log("Something Went Wrong");   
        res.redirect('/pageNotFound')
    }
}

const logout = async (req,res) => {
    try {
        req.session.user = null
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.log("Something went wrong",error);
        return res.status(500).json({ success: false, message: 'Failed to log out' });
    }
}

const verifyLogin = async (req,res) => { 
    try {
        const {email,password} = req.body
        const findUser = await User.findOne({email:email})

        if(!findUser){
            return res.json({status:false,message : "User not found"})
        }
        if(findUser.isBlocked){
            return res.json({status:false,message : "You are blocked by admin"}) 
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.json({status:false, message : "Incorrect Password"}) 
        }

        req.session.user = findUser._id
        req.session.userBlocked = false
        
        return res.json({status:true, message:"Welcome back! Let’s get started."})

    } catch (error) {
        console.log("Error while login",error);
        res.json({status:false, message : "Login failed. Please try agian later"})    
    }
}

const loadSignUp = async (req,res) => {
    try{
        return res.render('signUp')
    }
    catch(error){
        console.log("Something Went Wrong");    
    }
}

function generateOtp () {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOtpViaEmail (email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service : 'gmail',
            port : 587,
            secure : false,
            requireTLS : true,
            auth : {
                user : process.env.NODEMAILER_EMAIL,
                pass : process.env.NODEMAILER_PASSWORD
            }
        })
 
        const info = await transporter.sendMail({
            from : `UrbanDot <${process.env.NODEMAILER_EMAIL}>`,
            to : email,
            subject : "Verify Your Email for Account Activation",
            text : `Your Otp is : ${otp}`,
            html : `<b>Hello,<br><br>
            Thank you for signing up with UrbanDot! To complete your registration, please use the otp below to verify your email address.<br><br>
            <h2> ${otp} </h2> <br> 
            This code is valid for the next 1 minute.<br><br> Please enter it on the verification page to activate your account.</b>`,
        })

        return info.accepted.length > 0
    }
    catch (error) {
        console.error("Error while sending email",error.message);
        return false
    }
}

const insertSignUp = async (req,res) => {
    try{
        const {username,email,phone} = req.body;
        let password = await bcrypt.hash(req.body.password, 10)
        let emailExist = await User.findOne({email})
        let phoneExist = await User.findOne({phone})

        if (emailExist || phoneExist) {
            return res.status(400).json({
                success: false,
                errors: {
                    email: emailExist ? "Email already exists" : null,
                    phone: phoneExist ? "Phone number already exists" : null
                }
            });
        }

        const otp = generateOtp()

        const sendEmail = await sendOtpViaEmail(email,otp)
        if(!sendEmail){
            return res.json("email-error")
        }
         
        req.session.userOtp = otp
        setTimeout(() => {
            req.session.userOtp = null
        },1000*60)
        
        req.session.userData = {username,phone,email,password}

        console.log("otp send",otp);
        return res.status(200).json({
            success: true,
        });
        
    }
    catch(error){
        console.error("Error While Saving User Details",error.message);
        res.status(500).send('Internal Server Error')
    }
}

const loadVerifyOtp = async (req,res) => {
    try {
        return res.render('verifyOtp')
    }
    catch(error){
        console.error("Something Went Wrong");
    }
}

const verifyOtp = async (req,res) => {
    try {
        const {otpStr} = req.body
        let isOtp = otpVerification(otpStr, req)
        if(!isOtp) return res.json({success: false, message: 'Invalid OTP. Please try again.'})

        const user = req.session.userData
        const saveUserData = new User({
            username : user.username,
            email : user.email,
            phone : user.phone,
            password : user.password
        });
        await saveUserData.save();
        req.session.user = saveUserData._id
        req.session.userBlocked = false
        res.json({success:true})
        
  
    } catch (error) {
        console.log("Error while verifying otp",error.message);
    }
}

const otpVerification=(otp, req)=>{
    if(req.session.userOtp == otp) return true
    return false
}

const resendOtp = async (req,res) => {
    try {
        const {email} = req.session.userData
        if(!email){
            return res.status(400).json({success:false,message:"Email not found"})
        }
        const otp = generateOtp()
        req.session.userOtp = otp
        const sendEmail = await sendOtpViaEmail(email,otp)

        if(sendEmail){
            console.log("resended otp is : ",otp);
            res.status(200).json({success:true})    
        }
        else{
            res.status(500).json({success:false,message:"Failed to resend otp, Please try again"})
        }
    }
    catch (error) {
        console.log("ERROR WHILE RESENDING OTP",error);
        res.status(500).send('Internal Server Error')
    }
}

const blockedUser = async (req,res) => {
    try {
        res.render('userBlocked')
    } 
    catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error')
    }
}

const changePassword = async (req,res) => {
    const{password,changedPassword} = req.body
    const id = req.session.user
    const user = await User.findOne({_id:id})

    try {
        const passwordMatch =  await bcrypt.compare(password, user.password)
        if(!passwordMatch){
            return res.json({status:false, message : "Current Password is Incorrect"}) 
        }

        let newPassword = await bcrypt.hash(changedPassword,10)
        
        const updatedUser = await User.updateOne({_id:id},{$set:{password:newPassword}})
        return res.status(200).json({status :true, message:"Password Changed Successfully"})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const loadForgotPassword = async (req,res) => {
    try {
        return res.render('forgotPassword')

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
} 

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'Email not found. Please try again.' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpire = Date.now() + 360000; 
        await user.save();

        // Configure nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        // Reset URL
        const resetUrl = `http://localhost:${process.env.PORT || 3000}/changePassword/${resetToken}`;
        const mailOptions = {
            from: `UrbanDot <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `<p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" target="_blank">${resetUrl}</a>
                <p>If you did not request this, please ignore this email.</p>`,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: `Password reset link has been sent to: ${email}` });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const loadChangePassword = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpire: { $gt: Date.now() }, // Ensure token hasn't expired
        });

        if (!user) {
            return res.send("The password reset link has expired or is invalid.");
        }

        return res.render('passwordChange', { token });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.json({ success: false, message: 'Session timeout. Please try again' });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = null; 
        user.resetTokenExpire = null; 
        await user.save();
        req.session.user = user

        return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    logout,
    resendOtp,
    verifyOtp,
    loadLogin,
    loadSignUp,
    verifyLogin,
    blockedUser,
    loadHomePage,
    pageNotFound,
    insertSignUp,
    loadVerifyOtp,
    changePassword,
    forgotPassword,
    updatePassword,
    loadForgotPassword,
    loadChangePassword,
}