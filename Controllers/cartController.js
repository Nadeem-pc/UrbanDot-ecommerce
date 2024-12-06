const Product = require('../Models/productSchema')
const Cart = require('../Models/cartSchema')


const loadCart = async (req,res) => {
    try {
       return res.render('cart')

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const addToCart = async (req,res) => {
    const{id} = req.params
    console.log(id);
    
    try {
        
    } catch (error) {
        
    }
}


module.exports = {
    loadCart,
    addToCart
}