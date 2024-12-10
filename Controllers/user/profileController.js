const User = require("../../Models/userSchema") 
const Order = require("../../Models/orderSchema")
const Address = require("../../Models/addressSchema")

const express = require("express");
const mongoose = require('mongoose')
const session = require('express-session');


const loadProfilePage = async (req,res) => {
    try {
        let userId = req.session.user
        
        let user = await User.findOne({_id:userId})
        const address = await Address.findOne({user:userId})
        let orders = await Order.find({ userId }).populate('orderedItems.product')
              
        return res.render('userProfile',{user, address, orders})
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


module.exports = { loadProfilePage, editUserProfile }