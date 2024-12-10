const bcrypt = require('bcrypt')
const session = require('express-session')
const Admin = require('../../Models/adminSchema')


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


module.exports = { loadAdminLogin, verifyLogin, loadHome }