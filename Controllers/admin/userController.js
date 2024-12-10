const session = require('express-session')
const User = require('../../Models/userSchema')


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


module.exports = { listUsers, blockUser }