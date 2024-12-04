const User = require("../Models/userSchema") 
const Product = require("../Models/productSchema")
const Category = require("../Models/categorySchema")
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer');
const passport = require("passport");
const env = require("dotenv").config();
const session = require('express-session');
const mongoose = require('mongoose')
const express = require("express");
const { isBlocked } = require("../Middlewares/User/userAuth");

 
const loadHomePage = async (req,res) => {
    try{    
        const products = await Product.find({isBlocked:false})
        return res.render("home",{products})
    }
    catch(error){
        console.log("Something Went Wrong");
        res.redirect('/pageNotFound')       
    }
}

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
            from : process.env.NODEMAILER_EMAIL,
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

const loadShop = async (req,res) => {
    try {
        const limit = 6
        const page = parseInt(req.query.page) || 1
        const skip = (page - 1) * limit

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find({isBlocked:false}).skip(skip).limit(limit)

        return res.render('shop',{
            products,
            currentPage : page,
            totalPages
        })
    }
    catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const loadProductDetail = async (req,res) => {
    const {id} = req.params  
    try {
        const product = await Product.findOne({_id:id,isBlocked:false})
        const recommendedProducts = await Product.find({
            category : product.category,
            _id : {$ne:id}
        }).limit(4)
        res.render('productDetail',{product, recommendedProducts})
    }
    catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const loadProfilePage = async (req,res) => {
    try {
        let id = req.session.user
        let user = await User.findOne({_id:id})
        res.render('userProfile',{user})
    }
    catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const editUserProfile = async (req,res) => {
    const {name,phone} = req.body
    const id = new mongoose.Types.ObjectId(req.session.user)
    
    try {
        let phoneExist = await User.findOne({_id:{$ne:id},phone:phone})
        
        if(phoneExist){
            return res.status(400).json({status:false, message:"Phone already exists"})
        }
        const updatedUser = await User.updateOne({_id:id},{$set:{username:name,phone}})
        return res.status(200).json({status:true, message:"Profile updated successfully"})

    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const changePassword = async (req,res) => {
    const{password,changedPassword} = req.body
    const id = req.session.user
    const user = await User.findOne({_id:id})

    try {
        const passwordMatch =  await bcrypt.compare(password, user.password)
        if(!passwordMatch){
            return res.json({status:false, message : "Incorrect Password"}) 
        }

        let newPassword = await bcrypt.hash(changedPassword,10)
        
        const updatedUser = await User.updateOne({_id:id},{$set:{password:newPassword}})
        return res.status(200).json({status :true, message:"Password Changed Successfully"})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}


module.exports = {
    loadHomePage,
    pageNotFound,
    loadLogin,
    verifyLogin,
    loadSignUp,
    insertSignUp,
    loadVerifyOtp,
    verifyOtp,
    resendOtp,
    blockedUser,
    loadShop,
    loadProductDetail,
    loadProfilePage,
    editUserProfile,
    changePassword
}
