var aws = require('./aws.js')
var config      = require('config')

var s3 = new aws.S3({
  region: config.get('ng-mongo.aws.region'),
  accessKeyId: config.get('ng-mongo.aws.key'),
  secretAccessKey: config.get('ng-mongo.aws.secret')
})

module.exports = s3
