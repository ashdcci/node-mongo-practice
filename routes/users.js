var express = require('express')
var router = express.Router()
db = require('../config/db');
upload = require('../services/multer-s3')
moment = require('moment');
var mongoose = require('mongoose');

mailer = require('../services/mailer')
const _ = require('lodash');
userSchema = require('../schema/userSchema')

var User = db.model('User', userSchema)

var crypto = require('crypto')
jwt = require('jsonwebtoken')
superSecret = 'b1N3xXrpwNPrsLZH2GmCa95TbuU6hvvKQYVDcKSKrg4PfiOCm_X8A5G_hpLvTmD_'


router.get('/users/:id',function(req, res, next){
    if(!req.params.id){
        return res.status(500).json({
          status:0,
          msg:'required field are missing'
        })
    }

    User.findOne({'_id':mongoose.Schema.Types.ObjectId(req.params.id)},function(err, doc){
        if(err){
          console.log(err)
          return res.status(500).json({
            status:0,
            msg: "problam in fetch data"
          })
        }

        return res.status(200).json({
          status: 1,
          msg: '',
          data: doc
        })

    })

    return
});




router.post('/register',function(req, res, next){
    if(!req.body.email || !req.body.password){
      return res.status(400).json({
        status:0,
        msg:'required field are missing'
      })
    }


    pwd = crypto.createHash("md5")
      .update(req.body.password)
      .digest('hex');


      var promise = User.findOne({email:req.body.email}).exec();

      User.findOne({email:req.body.email}).exec()
      .then(function(user) {

        if(user!=null){
          throw(22)
          return res.send('user already exist')
        }

        // user.first_name = 'Robert Paulson';

        return User.save({first_name: 'usersss'}); // returns a promise
      })
      .then(function(user) {
        console.log('updated user: ' + user.name);
        // do something with updated user
      })
      .catch(function(err){
        // just need one of these
        console.log('error:', err);
      });

      return

    User.findOne({'email':req.body.email})
      .then(function(user) {
        console.log(user);
        if(user){

          return res.status(500).json({
            status: 0,
            msg: 'user already exist'
          });
        }else{

          // user.email = req.body.email;
          // user.password = pwd
          // access_token: createToken(req.body.email)
          // return user.save(); // returns a promise

          return User.save({
            email: req.body.email,
            password: pwd,
            access_token: createToken(req.body.email)
          })
        }
      })
      .then(function(user_data){
          return res.status(200).json({
            status : 1,
            msg : 'register process done',
            data: user_data
          })
      })
      .catch(function(err){
        // just need one of these
        console.log('error:', err);
      });


      return



    var Promise = User.findOne({'email':req.body.email}).exec();

      Promise.then(function(user) {
        console.log(user)
        if(user){
          res.status = 404;
          return Promise.reject('user already exist');
        }else{
          user.email = req.body.email
          user.password = pwd
          return user.findAndModify(); // returns a promise
        }


      })
      .then(function(user) {
        return res.status(200).json({
          status: 1,
          msg: 'register done',
          data: user
        });
        // do something with updated user
      })
      .catch(function(err){
        // just need one of these
        console.log('error:', err);
      });


    return

})

createToken = function(id) {

  var exp_time = Math.floor(Date.now() / 1000) + (3600 * 3600);
  var token = jwt.sign({
    exp: exp_time,
    data: Math.floor((Math.random() * 1000000000) + 1).toString()
  }, superSecret);
  return token;

}


module.exports = router
