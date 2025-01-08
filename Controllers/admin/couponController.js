const Coupon = require('../../Models/couponSchema')
const cron = require('node-cron');


const loadCoupons = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const limit = 7 
        const skip = (page - 1) * limit

        const totalCoupons = await Coupon.countDocuments();

        const coupons = await Coupon.find()
        .skip(skip)
        .limit(limit)

        const now = new Date();

        const updatedCoupons = coupons.map(coupon => {
            if (new Date(coupon.expiresOn) < now) {
                coupon.status = 'Expired'; 
            }
            return coupon;
        });

        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('coupons', { 
            coupons: updatedCoupons,
            currentPage: parseInt(page),
            totalPages
        })
        
    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageNotFound')
    }
};

const createCoupon = async (req,res) => {
    try {
        const{couponName,couponCode,discount,minPurchase,startDate,expiryDate} = req.body
        
        const newCoupon = new Coupon({
            name: couponName,
            code: couponCode,
            discount,
            minPurchase,
            createdOn: new Date(startDate),
            expiresOn: new Date(expiryDate)
        });

        const savedCoupon = await newCoupon.save();

        return res.status(201).json({ success: true, message: "Coupon created successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const deleteCoupon = async (req,res) => {
    try {
        const{ id } = req.body
        const deleteCoupon = await Coupon.deleteOne({ _id: id })

        if(!deleteCoupon){
            return res.json({success: false, message: "Coupon deletion failed. Please try again"})
        }
        res.json({success: true, message: "Coupon unlisted successfully"})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}


module.exports = { loadCoupons, createCoupon, deleteCoupon }