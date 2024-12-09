const Category = require('../Models/categorySchema')


const loadCategories = async (req,res) => {
    try{
        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page-1)*limit

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments()
        const totalPages = Math.ceil(totalCategories/limit)
        res.render("category",{
            cat : categoryData,
            currentPage : page,
            totalPages : totalPages,
            totalCategories : totalCategories
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
}

const loadAddCategory = async (req,res) => {
    try {
        return res.render('addCategory')
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
}

const addCategory = async (req,res) => {
    try { 
        const {name, description} = req.body
        const existingCategory = await Category.findOne({name})
    
        if(existingCategory){
            return res.status(400).json({status:false, message:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save();
        return res.status(201).json({status:true, message:"Category Added Successfully"})
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const listCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect('/admin/category');
    } catch (error) {
        console.log("Something went wrong");
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const unlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect('/admin/category');
    } catch (error) {
        console.log("Something went wrong");
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const loadEditCategory = async (req,res) => {
    try {
        let id = req.params.id
        req.session.userId = id
        let data = await Category.findOne({_id:id})
        return res.render('editCategory',{data})    
    }
    catch (error) {
        console.log("Something went wrong");
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const editCategory = async (req,res) => {
    try {
        const {name,description} = req.body
        const id = req.session.userId

        const existingCategory = await Category.findOne({name:name})
    
        if(existingCategory){
            return res.status(400).json({status:false, message:"Category already exists"})
        }

        const updatedCategory = await Category.findByIdAndUpdate(id,{
            name : name,
            description : description
        },{new:true})

        if(updatedCategory){
        return res.status(201).json({status:true, message:"Category Edited Successfully"})
        }
     }
    catch (error) {
        console.log("Something went wrong",error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}


module.exports = {
    loadCategories,
    loadAddCategory,
    addCategory,
    listCategory,
    unlistCategory,
    loadEditCategory,
    editCategory
}
