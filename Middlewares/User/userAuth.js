const User = require('../../Models/userSchema')

const userAuth = (req,res,next) => {
    if(req.session.user){
        next()
    }
    else if(req.method === "POST"){
        res.status(409).json({message: "no user in session"})
    }
    else{
        res.redirect('/login')
    }
}

const isBlocked = (req,res,next) => {
    if(!req.session.userBlocked) return next()
    req.session.user = null
    res.redirect('/blocked')
}

const isLogout = (req,res,next) => {
    if(req.session.user){
        res.redirect('/')
    }
    else{
        next()
    }
}


module.exports = {
    userAuth,
    isLogout,
    isBlocked
}