var mongojs = require('mongojs')
db = mongojs('mongodb://root:core2duo@ds111622.mlab.com:11622/shared_test')

var PM = require('promise-mongo')
var pm = new PM()
var collectionNames = [ 'users', 'tasks','posts' ]
pm.initDb(collectionNames, 'mongodb://root:core2duo@ds111622.mlab.com:11622/shared_test')
.then(function(mdb) {

    //db connected
    //now we can do db operations

    //db collections reference
    global.db1 = pm.cols

    //cursor functions reference
    global.cur = pm.cur
    console.log('Mongo Connection established');

}).catch(function(err){
  console.log(err)
})


module.exports = db
