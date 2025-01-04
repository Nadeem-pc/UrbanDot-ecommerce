const bcrypt = require('bcrypt')
const session = require('express-session')
const Admin = require('../../Models/adminSchema')
const { translate } = require('pdfkit')


const loadAdminLogin = async (req,res) => {
    try{
        res.render('admin-login')
    }
    catch(error){
        res.redirect('/admin/pageNotFound')
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

const logout = async (req,res) => {
    try {
        req.session.admin = null
        return res.redirect('/admin/login')

    } catch (error) {
        console.log("Something went wrong",error);
        return res.status(500).json({ success: false, message: 'Failed to log out' });
    }
}

const pageNotFound = async (req,res) => {
    try {
        return res.render('page-error-404')
    } catch (error) {
        res.redirect('/admin/pageNotFound')
    }
}


module.exports = { loadAdminLogin, verifyLogin, logout, pageNotFound }