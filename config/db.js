config = require('config')
var mongoose = require('mongoose');

mongoose.connect('mongodb://'+config.get('ng-mongo.dbConfig.host')+'/'+config.get('ng-mongo.dbConfig.dbname'), { useMongoClient: true });
mongoose.Promise = global.Promise;

module.exports = mongoose
