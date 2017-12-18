var express = require('express')
var router = express.Router()
db = require('../config/db');
upload = require('../services/multer-s3')
moment = require('moment');
var mongoose = require('mongoose');

mailer = require('../services/mailer')
const _ = require('lodash');
Schema = require('../schema/userSchema')

// model defination
var User = db.model('User', Schema.userSchema)
var Password = db.model('Password',Schema.PasswordResetSchema)


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

      tomodel = {}

    User.findOne({email:req.body.email}).exec()
      .then(function(user) {

        if(user!=null){

          throw({err_obj:2})

        }else{

          tomodel.email =  req.body.email
          tomodel.password =  pwd
          tomodel.access_token= createToken(req.body.email)

          var user_data = new User(tomodel)
          return user_data.save()

        }

      })
      .then(function(user_data){
          return res.status(200).json({
            status : 1,
            msg : 'register process done',
            user_data: user_data
          })
      })
      .catch(function(err){

        if(err.err_obj){

          return res.status(503).json({
            status: 0,
            msg: 'user already exist'
          });

        }else{

          return res.status(500).json({
            status:0,
            msg: "problam in fetch data"
          })

        }

      })

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



 router.post('/forgot-password',function(req, res, next){

   if(!req.body.email || !req.body.password || !req.body.cpassword){
     return res.status(400).json({
       status:0,
       msg:'required field are missing'
     })
   }

  password = (typeof req.body.password!==undefined) ? req.body.password : ''
  cpassword = (typeof req.body.cpassword!==undefined) ? req.body.cpassword : ''

  if(password != cpassword){
    return res.status(500).json({
      status:0,
      msg: 'password and confirm password is not same'
    })
  }



  User.findOne({email:req.body.email}).exec()
    .then(function(user) {

      if(user!=null){

        return Password.update({email: req.body.email},{
          token: createToken(req.body.email),
          expired_at: moment().add(1, 'days').format('YYYY-MM-DD HH:mm:ss')
        },{new:true},{upsert:true})


      }else{
        throw({err_obj:2})
      }

    })
    .then(function(user_data){
      console.log(user_data)
        return res.status(200).json({
          status : 1,
          msg : 'Reset Password Token generated'
        })
    })
    .catch(function(err){

      if(err.err_obj){

        return res.status(503).json({
          status: 0,
          msg: 'user not exist'
        });

      }else{
        console.log(err)
        return res.status(500).json({
          status:0,
          msg: "problam in fetch data"
        })

      }

    })

   return


 })


module.exports = router
