const Product = require('../../Models/productSchema')


const getStockDetails = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 8
        const products = await Product.find()
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec(); 

        const count = await Product.countDocuments();

        return res.render('stockDetail', {
            products,
            currentPage : page,
            totalPages : Math.ceil(count/limit),
        })

    } catch (error) {
        console.log(error);
        res.redirect('/admin/pageNotFound')
    }
}

const updateProductStock = async (req,res) => {
    const{ productId, stockIncrease } = req.body
    
    try {
        let updateStock = await Product.updateOne({_id:productId},{$set:{stock:stockIncrease}})

        if(!updateStock){
            return res.json({success:false,message:'Stock updation failed, Please try again'})
        }
        return res.json({success:true,message:"Stock updated successfully"})
        
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
}

module.exports = { getStockDetails, updateProductStock }