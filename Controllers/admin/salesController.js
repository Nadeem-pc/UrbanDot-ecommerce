const fs = require('fs');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit-table');
const Order = require('../../Models/orderSchema')


const loadSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate, page = 1, limit = 10 } = req.query;

        let matchConditions = {};

        if (filter === '1day') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0); 
            matchConditions.orderDate = { $gte: yesterday };
        }
        else if (filter === '1week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            oneWeekAgo.setHours(0, 0, 0, 0);
            matchConditions.orderDate = { $gte: oneWeekAgo };
        }
        else if (filter === '1month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            oneMonthAgo.setHours(0, 0, 0, 0);
            matchConditions.orderDate = { $gte: oneMonthAgo };
        }
        else if (filter === '1year') {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oneYearAgo.setHours(0, 0, 0, 0);
            matchConditions.orderDate = { $gte: oneYearAgo };
        }
        else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            matchConditions.orderDate = {
                $gte: start,
                $lte: end,
            };
        }

        // Pagination logic
        const currentPage = parseInt(page) || 1
        const ordersPerPage = parseInt(limit)
        const skip = (currentPage - 1) * ordersPerPage

        let orders = await Order.aggregate([
            {
                $match: matchConditions,
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $skip: skip, // Skip documents for pagination
            },
            {
                $limit: ordersPerPage, // Limit documents per page
            },
        ]);

        const totalRecords = await Order.countDocuments(matchConditions); // Total orders matching the filter
        const totalPages = Math.ceil(totalRecords / ordersPerPage);

        const stats = await Order.aggregate([
            {
                $match: matchConditions,
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: '$totalAmount' },
                    totalDiscount: { $sum: '$totalDiscountApplied' },
                },
            },
        ]);

        const { totalOrders, totalSales, totalDiscount } = stats[0] || {
            totalOrders: 0,
            totalSales: 0,
            totalDiscount: 0,
        };

        return res.render('salesReport', {
            orders,
            stats: {
                totalOrders,
                totalSales: totalSales.toFixed(2),
                totalDiscount: totalDiscount.toFixed(2),
            },
            noData: orders.length === 0,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.redirect('/admin/pageNotFound')
    }
};

const generatePDFReport = async (req, res) => {
    try {
        const orders = await Order.aggregate([
            { 
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true,
                }
            }
        ]);

        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
        doc.pipe(res);

        // Title
        doc.fontSize(16).text('SALES REPORT', { align: 'center' }).moveDown();

        // Prepare table data
        const table = {
            headers: ['No', 'OrderID', 'Customer', 'Date', 'Payment Method', 'Coupon Discount', 'Final Amount'],
            rows: orders.map((order, index) => [
                index + 1,
                order.orderId,
                order.userDetails ? order.userDetails.username : 'N/A',
                new Date(order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                order.paymentMethod,
                `${order.totalDiscountApplied}`,
                `${order.totalAmount}`
            ])
        };

        doc.table(table, {
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
            prepareRow: (row, indexColumn) => doc.font('Helvetica').fontSize(7),
            columnsSize: [30, 110, 100, 80, 80, 80, 80] ,
            x: 28
        });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const generateExcelReport = async (req, res) => {
    try {
        const orders = await Order.aggregate([
            { 
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true,
                }
            }
        ]);

        const orderData = orders.map((order, index) => ({
            No: index + 1, 
            OrderID: order.orderId,
            Customer: order.userDetails ? order.userDetails.username : 'N/A',
            Date: new Date(order.orderDate).toLocaleDateString(),
            PaymentMethod: order.paymentMethod,
            CouponDiscount: order.totalDiscountApplied,
            TotalAmount: `₹${order.totalAmount}`,
        }));

        const ws = XLSX.utils.json_to_sheet(orderData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = { loadSalesReport, generateExcelReport, generatePDFReport }