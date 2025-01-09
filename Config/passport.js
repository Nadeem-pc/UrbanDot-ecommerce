const passport = require('passport')
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require('../Models/userSchema')
const env = require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID :  process.env.GOOGLE_CLIENT_ID,
    clientSecret : process.env.GOOGLE_CLIENT_SECRET,
    callbackURL : '/google/callback'
},  

async (accessToken,refreshToken,profile,done) => {
    try {
        let googleUser = await User.findOne({ googleId: profile.id })
        if(googleUser){
            return done(null,googleUser)
        }
        let user = await User.findOne({ email: profile.emails[0].value })
        if(user){
            return done(null,user)
        }
        user = new User({
            username : profile.displayName,
            email : profile.emails[0].value,
            googleId : profile.id,
        })
        await user.save()
        return done(null,user)
        
    } catch (err) {
        console.log("error occured",err.message);
        return done(err,null)
    }
}
));

passport.serializeUser((user,done) => {
    done(null,user._id)
})


passport.deserializeUser((id,done) => {
    User.findById(id)
    .then(user => {
        done(null,user)
    })
    .catch(err => {
        done(err,null)
    })
})
 
module.exports = passport