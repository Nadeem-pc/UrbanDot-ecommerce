const User = require("../../Models/userSchema") 
const Address = require("../../Models/addressSchema")

const express = require("express");
const mongoose = require('mongoose')
const session = require('express-session');


const addAddress = async (req,res) => {
    const {name,phone,pincode,city,fullAddress,country,state,addressType} = req.body
    const userId = req.session.user

    try {
        const userData = await User.findOne({_id:userId})
        const userAddress = await Address.findOne({user:userData._id})

        if(!userAddress){
            const newAddress = new Address({
                user : userData._id,
                address : [{addressType,name,city,pincode,phone,country,state,fullAddress}]
            });

            await newAddress.save()
            return res.status(200).json({status:true, message:"Address added successfully"})
        }
        else{
            userAddress.address.push({addressType,name,city,pincode,phone,country,state,fullAddress})
            await userAddress.save()
            return res.status(200).json({status:true, message:"Address added successfully"})
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const deleteAddress = async (req,res) => {
    const{mainId,id} = req.params    
    
    try {
        await Address.updateOne(
            { _id: new mongoose.Types.ObjectId(mainId), 'address._id' : new mongoose.Types.ObjectId(id) }, 
            {$set:{'address.$.isDeleted' : true}}
        );
        return res.redirect('/profile')
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const loadEditAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.session.user;
        const addressToEdit = req.session.addressToEdit;

        const addressDoc = await Address.findOne({ user });

        if (!addressDoc) {
            return res.status(404).json({ error: "Address not found" });
        }

        const addressIndex = addressDoc.address.findIndex(p => p._id.toString() === id.toString());

        if (addressIndex === -1) {
            return res.status(404).json({ error: "Address not found" });
        }

        let ADDRESS;
        if (addressIndex !== -1) {
            ADDRESS = addressDoc.address[addressIndex];
        }

        req.session.addressToEdit = id;

        return res.render('editAddress', { ADDRESS });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const editAddress = async (req, res) => {
    try {
        const { name, phone, pincode, city, fullAddress, state, addressType } = req.body;
        const addressToEdit = req.session.addressToEdit;
        const user = req.session.user;

        const updatedAddress = await Address.findOneAndUpdate(
            { user, "address._id": addressToEdit },
            {
                $set: {
                    "address.$.name": name,
                    "address.$.phone": phone,
                    "address.$.pincode": pincode,
                    "address.$.city": city,
                    "address.$.fullAddress": fullAddress,
                    "address.$.state": state,
                    "address.$.addressType": addressType
                }
            },
            { new: true } 
        );

        if (!updatedAddress) {
            return res.status(404).json({ error: "Address not found or could not be updated" });
        }

        return res.status(200).json({status:true, message:"Address edited successfully"})
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


module.exports = { addAddress, loadEditAddress, editAddress, deleteAddress }