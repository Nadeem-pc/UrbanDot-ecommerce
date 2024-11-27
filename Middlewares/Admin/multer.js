const multer = require('multer');
const path = require('path')

const storage = multer.diskStorage({
    destination:(req,file,cb) => {
        cb(null,("/Users/nadeempopzz/Downloads/UrbanDot/Public/uploads/re-image"))
    },
    filename:(req,file,cb) => {
        cb(null,Date.now() + "-" + file.originalname)
    }
})

module.exports = storage
