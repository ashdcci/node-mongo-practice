var multer = require('multer')
var multerS3 = require('multer-s3')
var config = require('config')
var aws_s3 = require('../config/aws_s3')


var upload = multer({
  storage: multerS3({
    s3: aws_s3,
    bucket: config.get('ng-mongo.aws.bucket'),
    acl: config.get('ng-mongo.aws.acl'),
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString()+file.originalname)
    }
  })
})


module.exports = upload
