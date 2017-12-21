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


function authToken(req,res, next){


  // check header or url parameters or post parameters for token
var token = req.body.token || req.query.token || req.headers['x-access-token'];

// decode token
if (token) {

  // verifies secret and checks exp
  jwt.verify(token, superSecret, function(err, decoded) {
    if (err) {
      return res.status(400).json({ success: 0, message: 'Failed to authenticate token.' });
    } else {
      // if everything is good, save to request for use in other routes
      req.decoded = decoded;
      User.findOne({access_token:token},function(err1,doc){

          if(err1){
            return res.status(400).json({ success: 0, message: 'Failed to authenticate token.' });
          }else if(doc==null){
            return res.status(400).json({ success: 0, message: 'Failed to authenticate token.' });
          }
          next();

      })
      return
    }
  });

} else {

  // if there is no token
  // return an error
  return res.status(403).json({
      success: 0,
      message: 'No token provided.'
  });

}



}


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

   if(!req.body.email){
     return res.status(400).json({
       status:0,
       msg:'required field are missing'
     })
   }






  User.findOne({email:req.body.email}).exec()
    .then(function(user) {

      if(user!=null){

        var conditions = { email: req.body.email}
          , update = {
                  token: createToken(req.body.email),
                  expired_at: moment().add(1, 'days').format('YYYY-MM-DD HH:mm:ss'),
                  created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                }
          , options = {upsert:true};

      return Password.update(conditions, update, options);


      }else{
        throw({err_obj:2})
      }

    })
    .then(function(user_data){

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

        return res.status(500).json({
          status:0,
          msg: "problam in fetch data"
        })

      }

    })

   return


 })


router.post('/reset-password',function(req, res, next){

   if(!req.body.token || !req.body.password || !req.body.cpassword){
     return res.status(400).json({
       status:0,
       msg:'required field are missing'
     })
   }

  //  console.log(ISODate(''))

  password = (typeof req.body.password!==undefined) ? req.body.password : ''
  cpassword = (typeof req.body.cpassword!==undefined) ? req.body.cpassword : ''

  if(password != cpassword){
    return res.status(500).json({
      status:0,
      msg: 'password and confirm password is not same'
    })
  }

  Password.
  find({ token: req.body.token }).
  where('token').equals(req.body.token).
  where('expired_at').gte(moment().format('YYYY-MM-DD HH:mm:ss')).exec().
  then(function(doc){
    if(doc!=null && doc.length > 0){

      pwd = crypto.createHash("md5")
        .update(req.body.cpassword)
        .digest('hex');

      return User.update({email:doc[0].email},{password:pwd},{})
    }else{
      throw({err_obj:2})
    }



  }).then(function(user_data){


    if(user_data.nModified>0){
      return Password.remove({token: req.body.token})
    }else{
      throw({err_obj:3})
    }

  }).then(function(pass_data){

    return res.status(200).json({
      status: 0,
      msg: 'password saved successfully'
    });

  }).catch(function(err){

    if(err.err_obj){

      msg = (err.err_obj==2) ? 'Token expired or not exist' : 'problam in password updation'
      return res.status(503).json({
        status: 0,
        msg: msg
      });

    }else{

      return res.status(500).json({
        status:0,
        msg: "problam in fetch data"
      })

    }

  })




})


/**
 * User Profile APIs
 */

 router.put('/user-profile',authToken,function(req, res, next){

   if(!req.body.token){
     return res.status(403).send({
         success: 0,
         message: 'No token provided.'
     });
   }

   return res.status(200).send({
       success: 1,
       message: 'token provided',
       token: req.body.token
   });


   User.findOne({access_token:req.body})


 })







module.exports = router
