const Offer = require('../../Models/offerSchema')
const Category = require('../../Models/categorySchema')
const Product = require('../../Models/productSchema');


const loadOffer = async (req, res) => {
    try {
        const { page = 1 } = req.query; 
        const limit = 7; 
        const skip = (page - 1) * limit;

        const products = await Product.find();
        const category = await Category.find();
        const now = new Date();

        await Offer.deleteMany({ expiresOn: { $lt: now } });
        const totalOffers = await Offer.countDocuments();

        const offers = await Offer.find()
            .populate({
                path: 'productId',
                select: 'productName', 
            })
            .populate({
                path: 'categoryId',
                select: 'name', 
            })
            .skip(skip)
            .limit(limit);

            const totalPages = Math.ceil(totalOffers / limit)

        return res.render('offer', { category, products, offer: offers, currentPage: parseInt(page), totalPages});
    } catch (error) {
        console.error('Error loading offers:', error);
        res.redirect('/admin/pageNotFound')
    }
};

const addOffer = async (req, res) => {
    try {
        const { title, discount, applyTo, productOrCategoryName, startDate, expiryDate } = req.body;

        if (discount <= 0 || discount > 90) {
            return res.status(400).json({ success: false, message: 'Discount must be between 1 and 90' });
        }
        let targetField = {};
        if (applyTo === 'Product') {

            const product = await Product.findOne({ productName: productOrCategoryName });
            targetField = { productId: product._id };

            const offerPrice = product.regularPrice - (discount / 100) * product.regularPrice
            await Product.findByIdAndUpdate( product._id, { offerPrice })        

        } else if (applyTo === 'Category') {
            const category = await Category.findOne({ name: productOrCategoryName });
            targetField = { categoryId: category._id };

            const productsInCategory = await Product.find({ category: category._id })  
            for (const product of productsInCategory) {
                const newOfferPrice = product.regularPrice - (discount / 100) * product.regularPrice;
                await Product.findByIdAndUpdate(product._id, { offerPrice: newOfferPrice });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid applyTo value. Must be "Product" or "Category".' });
        }

        const newOffer = new Offer({
            title: title.trim(),
            discount,
            appliedTo: applyTo,
            ...targetField, 
            isActive: true,
            activateOn: new Date(startDate),
            expiresOn: new Date(expiryDate),
        });

        const savedOffer = await newOffer.save();

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            offer: savedOffer,
        });
    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteOffer = async (req,res) => {
    try {
        const { offerId } = req.body
        const offer = await Offer.findOne({ _id: offerId })
        const appliedTo = offer.appliedTo

        if(appliedTo === 'Category'){
            const categoryId = offer.categoryId
            const productsInCategory = await Product.find({ category: categoryId })

            for (let product of productsInCategory) {
                product.offerPrice = null
                await product.save();
            }            
        } else if (appliedTo === 'Product') {
            const productId = offer.productId;
            const product = await Product.findOne({ _id: productId });

            product.offerPrice = null
            await product.save();
        }

        const deleteOffer = await Offer.deleteOne({ _id: offerId }) 
        
        if(!deleteOffer){
            return res.json({success: false, message: "Offer deletion failed. Please try again"})
        }
        res.json({success: true, message: "Offer deleted successfully"})
        
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = { loadOffer, deleteOffer, addOffer }