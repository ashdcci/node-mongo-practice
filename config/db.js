var mongojs = require('mongojs')
config = require('config')
db = mongojs('mongodb://'+config.get('ng-mongo.dbConfig.host')+':'+config.get('ng-mongo.dbConfig.port')+'/'+config.get('ng-mongo.dbConfig.dbname'))
// +config.get('ng-mongo.dbConfig.user')+':'+config.get('ng-mongo.dbConfig.password')+'@'
var PM = require('promise-mongo')
var pm = new PM()
var collectionNames = [ 'users', 'tasks','posts','password_reset','user_profile' ]
pm.initDb(collectionNames, 'mongodb://'+config.get('ng-mongo.dbConfig.host')+':'+config.get('ng-mongo.dbConfig.port')+'/'+config.get('ng-mongo.dbConfig.dbname'))
.then(function(mdb) {

    //db connected
    //now we can do db operations

    //db collections reference
    global.db1 = pm.cols

    //cursor functions reference
    global.cur = pm.cur
    if(config.get('ng-mongo.site.env')=='dev'){
      console.log('Mongo Connection established');
    }

}).catch(function(err){
  if(config.get('ng-mongo.site.env')=='dev'){
    console.log(err)
  }
})


module.exports = db
