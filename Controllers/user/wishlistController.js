const mongoose = require('mongoose')
const Wishlist = require('../../Models/wishlistSchema')
const Product = require('../../Models/productSchema')


const loadWishlist = async (req,res) => {
    const userId = req.session.user
    try {
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId')
        return res.render('wishlist', { wishlist: wishlist })

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const addToWishlist = async (req, res) => {
    try {
        const { id } = req.body;
        const userId = req.session.user;

        const product = await Product.findById(id);
        if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
        wishlist = new Wishlist({
            userId,
            items: [{ productId: id, addedOn: Date.now() }]
        });
        } else {
        const productInWishlist = wishlist.items.find(
            (item) => item.productId.toString() === id.toString()
        );

        if (productInWishlist) {
            return res.json({ success: false, message: "Product already exists in wishlist" });
        }

        wishlist.items.push({
            productId: id,
            addedOn: Date.now()
        });
        }

        await wishlist.save();
        res.json({ success: true, message: "Product added to Wishlist" });          

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const removeProduct = async (req,res) => {
    try {
        const userId = req.session.user
        const productId  = new mongoose.Types.ObjectId(req.params.productId);
        const productRemoved = await Wishlist.updateOne({ userId },{ $pull: { items: {productId }}})    

        if(!productRemoved){
            return res.json({status:false, message:'Something went wrong'})
        }
        res.json({status:true, message : "Item removed from wishlist"})

    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.status(500).send("Internal Server Error");
    }
}


module.exports = { loadWishlist, addToWishlist, removeProduct } 