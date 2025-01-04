const Order = require('../../Models/orderSchema')
const Product = require('../../Models/productSchema')
const Category = require('../../Models/categorySchema')


const loadHome = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();

        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]);
        const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

        // Monthly Earnings
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const monthlyEarnings = await Order.aggregate([
            {
                $match: {
                    orderDate: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]);
        const monthlyRevenue = monthlyEarnings.length > 0 ? monthlyEarnings[0].total : 0;

        const totalProducts = await Product.countDocuments();

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
        ])
        .sort({ createdAt: -1 })
        .limit(10);

        // Best-Selling Products
        const bestSellingProducts = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { 
                $group: { 
                    _id: "$orderedItems.product",
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { 
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    name: {
                        $reduce: {
                            input: { $slice: [{ $split: ["$productDetails.productName", " "] }, 3] }, // Get the first 3 words
                            initialValue: "",
                            in: {
                                $concat: ["$$value", { $cond: [{ $eq: ["$$value", ""] }, "", " "] }, "$$this"]
                            }
                        }
                    },
                    totalSold: 1
                }
            }
            
        ]);
        
        // Best-Selling Categories with Percentages
        const bestSellingCategories = await Order.aggregate([
            { $unwind: "$orderedItems" }, 
            { 
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" }, 
            { 
                $group: { 
                    _id: "$categoryDetails.name",
                    totalSold: { $sum: "$orderedItems.quantity" } 
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$totalSold" },
                    categories: { $push: { name: "$_id", totalSold: "$totalSold" } }
                }
            },
            { $unwind: "$categories" },
            {
                $project: {
                    _id: 0,
                    categoryName: "$categories.name", 
                    totalSold: "$categories.totalSold",
                    percentage: {
                        $multiply: [
                            { $divide: ["$categories.totalSold", "$totalSales"] },
                            100
                        ]
                    }
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        return res.render("dashboard", {
            totalOrders,
            revenue,
            monthlyRevenue,
            totalProducts,
            orders,
            bestSellingProducts,
            bestSellingCategories,
        });
    } catch (error) {
        console.log("Something Went Wrong", error);
        res.redirect('/admin/pageNotFound')
    }
};

const getFilteredData = async (req, res) => {
    try {
        const { timeFilter, startDate, endDate } = req.query;
        let filter = {};

        const currentDate = new Date();

        // Define date ranges based on timeFilter
        if (timeFilter === 'weekly') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - 7); // Go back 7 days
            filter.orderDate = { $gte: startOfWeek, $lte: currentDate };
        } else if (timeFilter === 'monthly') {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            filter.orderDate = { $gte: startOfMonth, $lte: currentDate };
        } else if (timeFilter === 'yearly') {
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
            filter.orderDate = { $gte: startOfYear, $lte: currentDate };
        } else if (timeFilter === 'custom' && startDate && endDate) {
            filter.orderDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Fetch data based on the filter
        const bestSellingProducts = await Order.aggregate([
            { $match: filter },
            { $unwind: "$orderedItems" },
            {
                $group: {
                    _id: "$orderedItems.product",
                    totalSold: { $sum: "$orderedItems.quantity" },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    name: {
                        $reduce: {
                            input: { $slice: [{ $split: ["$productDetails.productName", " "] }, 3] }, // Get the first 3 words
                            initialValue: "",
                            in: {
                                $concat: ["$$value", { $cond: [{ $eq: ["$$value", ""] }, "", " "] }, "$$this"]
                            }
                        }
                    },
                    totalSold: 1
                }
            }
        ]);

        const bestSellingCategories = await Order.aggregate([
            { $match: filter },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails.name",
                    totalSold: { $sum: "$orderedItems.quantity" },
                },
            },
            { $sort: { totalSold: -1 } },
        ]);

        return res.json({ bestSellingProducts, bestSellingCategories });
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        res.status(500).send("Error fetching data.");
    }
};

  

module.exports = { loadHome, getFilteredData }