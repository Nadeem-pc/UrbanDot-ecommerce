const Admin = require('../Models/adminSchema')
const User = require('../Models/userSchema')
const bcrypt = require('bcrypt')
const session = require('express-session')


const loadAdminLogin = async (req,res) => {
    try{
        res.render('admin-login')
    }
    catch(error){
        console.log("Something Went Wrong",error);
    }
}

const verifyLogin = async (req,res) => {

    try{
        const {email, password} = req.body
        let isAdmin = await Admin.findOne({email:email})

        if(!isAdmin){
            res.render('admin-login',{message: "Admin does not exist"})
        }

        const passwordMatch = await bcrypt.compare(password, isAdmin.password)
        if(!passwordMatch){
            res.render('admin-login',{message: "Incorrect Password"})
        }
        req.session.admin = isAdmin._id
        res.redirect('/admin/dashboard');

    }
    catch(error){
        console.log("Error while login",error);    
    }

}

const loadHome = async (req,res) => {
    try {
        res.render('dashboard')
    } catch (error) {
        console.log("Something Went Wrong",error);
    }
}

const listUsers = async (req,res) => {
    try {
        let searchInput = ""
        if(req.query.searchInput){
            searchInput = req.query.searchInput
        }

        let page = 1 
        if(req.query.page){
            page = req.query.page
        }

        const limit = 6
        const userData = await User.find({
            $or:[
                {username:{$regex:".*"+searchInput+".*"}},
                {email:{$regex:".*"+searchInput+".*"}}
            ],
        })
        .limit((limit*1))
        .skip((page-1)*limit)
        .exec();

        const count = await User.find({
            $or:[
                {username:{$regex:".*"+searchInput+".*"}},
                {email:{$regex:".*"+searchInput+".*"}}
            ],
        }).countDocuments();

        res.render('listUsers',{
            data : userData,
            totalPages : Math.ceil(count/limit),
            currentPage : page,
        })
    }
    catch (error) {
        console.log("Error while listing users",error.message);
    }
}

const blockUser = async (req,res) => {
    try {
        let {id, blockStatus} = req.body;
        let data = await User.updateOne({_id:id},{$set:{isBlocked:blockStatus}})
        req.session.userBlocked = blockStatus
        res.status(200).json({status: true, message: `user ${blockStatus ? 'blocked' : "unblocked"} successfuly`, userInfo: data})
    }
    catch (error) {
        console.log("Error while blocking user",error);
        res.status(500).json({status: false, message: "internal error"})
    }
}



module.exports = {
    loadAdminLogin,
    verifyLogin,
    loadHome,
    listUsers,
    blockUser,   
}
    
