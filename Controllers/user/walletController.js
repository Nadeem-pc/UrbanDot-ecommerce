const Wallet = require('../../Models/walletSchema')

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        let wallet = await Wallet.findOne({ userId }).populate('userId');

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balanceAmount: 0
            });

            await wallet.save();
        }

        return res.render('wallet', { wallet, transactions: wallet.transactions });

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
};


module.exports = { loadWallet }