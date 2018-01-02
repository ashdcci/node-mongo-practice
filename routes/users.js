var express = require('express')
var router = express.Router()
db = require('../config/db')
upload = require('../services/multer-s3')
moment = require('moment')
var mongoose = require('mongoose')
var stripe = require('../services/stripe')

mailer = require('../services/mailer')
const _ = require('lodash')
Schema = require('../schema/userSchema')

// model defination
var User = db.model('User', Schema.userSchema)
var Password = db.model('Password',Schema.PasswordResetSchema)
var Profile  = db.model('Profile',Schema.ProfileSchema)
var Card = db.model('Card',Schema.cardSchema)


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

      }).then(function(userData){
          return stripe.customers.create({
            email:req.body.email
          })
      })
      .then(function(stripe_data){

        return User.findOneAndUpdate({email:req.body.email},{ stripe_customer_id:stripe_data.id },{upsert:false})

      }).then(function(user_data){
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



   tomodel = {}
   if(typeof req.body.dob !== 'undefined' && req.body.dob!=''){
     tomodel.dob = req.body.dob
   }

   if(typeof req.body.address !== 'undefined' && req.body.address!=''){
     tomodel.address = req.body.address
   }

   if(typeof req.body.gender!=='undefined' && req.body.gender != ''){
     tomodel.gender = req.body.gender
   }

   if(typeof req.body.about!=='undefined' && req.body.about != ''){
     tomodel.about = req.body.about
   }


   user_doc = {}


   User.findOne({access_token:req.body.token},function(err, doc){
      if(err){
        return res.status(500).json({
          status:0,
          msg: "problam in fetch data1"
        })
      }

      if(doc==null){
        return res.status(400).json({
          status:0,
          msg: "User Data not found"
        })
      }


      tomodel.user_id = doc._id


      Profile.findOneAndUpdate({user_id: doc._id},{$set: tomodel},{upsert:true},function(err1,doc1){
          if(err1){
            return res.status(500).json({
              status:0,
              msg: "problam in fetch data23"
            })
          }

          doc = doc.toJSON()

          doc.about = (doc1.about!==undefined) ? ((doc1.about==tomodel.about) ? doc1.about : tomodel.about) : ''
          doc.address = (doc1.address!==undefined) ? ((doc1.address==tomodel.address) ? doc1.address : tomodel.address) : ''
          doc.gender = (doc1.gender!==undefined) ? ((doc1.gender==tomodel.gender) ? doc1.gender : tomodel.gender) : ''
          doc.dob = (doc1.dob!==undefined) ? ((doc1.dob==tomodel.dob) ? doc1.dob : tomodel.dob) : ''

          res.status(200).json({
            status: 1,
            msg: "User Profile Updated",
            "data":doc,
          })
          return
      })

   })


 })

 router.get('/profile/:id',function(req, res, next){
   if(!req.params.id){
     return res.status(403).send({
         success: 0,
         message: 'required fields are missing'
     });
   }


   User.aggregate([
     {
       "$lookup": {
         "from": "profiles",
         "localField": "_id",
         "foreignField": "user_id",
         "as": "user_profile"
       }
     },
     {
       "$match": {
         "_id":mongoose.Types.ObjectId(req.params.id)
       }
     },
     {$unwind: {'path': '$user_profile',preserveNullAndEmptyArrays: true,includeArrayIndex: "arrayIndex"}},
     {
       "$project": {
         "_id": "$_id",
         "email": "$email",
         "profile_data":{
           about: { $ifNull: [ "$user_profile.about", "" ] },
           address: { $ifNull: [ "$user_profile.address", "" ] },
           gender: { $ifNull: [ "$user_profile.gender", "" ] },
         },
       }
     }
   ],function(err, doc) {
     if (err) {
       return res.status(500).json({
         status:0,
         msg: "problam in fetch data1"
       })
     }

     if(doc==null){
       return res.status(400).json({
         status:0,
         msg: "User Data not found"
       })
     }

    return res.status(200).json({
       'status': 1,
       'msg': 'User data',
       "data":doc[0]
     })
   })


 })


 router.post('/card_details',authToken,checkcardNumber,function(req, res, next){


   if(!req.body.card_number || !req.body.exp_month || !req.body.exp_year || !req.body.cvv){
     return res.status(403).send({
         success: 0,
         message: 'required fields are missing'
     });
   }


   tomodel = {}
   email_field = ''

   user_doc = {}

   User.findOne({access_token:req.headers['x-access-token']}).exec().then(function(doc){
      if(doc==null){
        throw({err_obj:2})
      }


      user_doc = doc
      tomodel.user_id = doc._id
      tomodel.email = doc.email
      email_field = doc.email

    return stripe.tokens.create({
        card: {
          "number": req.body.card_number,
          "exp_month": req.body.exp_month,
          "exp_year": req.body.exp_year,
          "cvc": req.body.cvv
        }
      })

    }).then(function(token_number){

      tomodel.last_four = token_number.card.last4
      tomodel.card_id = token_number.card.id



      if(user_doc.stripe_customer_id!=""){
        return stripe.customers.createSource(user_doc.stripe_customer_id,{
                source: token_number.id,
              })
      }else{
        return stripe.customers.create({
                email: email_field,
                source: token_number.id,
              })
      }



    }).then(function(customer){

      tomodel.customer_id = (user_doc.stripe_customer_id!="") ? user_doc.stripe_customer_id : customer.id
      var card_data = new Card(tomodel)
      return card_data.save()

    }).then(function(card_user){

      return res.status(200).json({
        status:1,
        msg: "card data saved on stripe"
      })

    }).catch(function(err){

      return res.status(500).json({
        status:0,
        msg: "problam in fetch data1"
      })
    })


 })


 function checkcardNumber(req,res, next){

   if(req.body.check==0){
     if(!req.body.card_number || !req.body.exp_month || !req.body.exp_year || !req.body.cvv){
       return res.status(403).send({
           success: 0,
           message: 'required fields are missing'
       });
     }



   }else{
     if(!req.body.card_id){
       return res.status(403).send({
           success: 0,
           message: 'required fields are missing'
       });
     }

   }





    User.findOne({access_token:req.headers['x-access-token']}).exec().then(function(doc){
       if(doc==null){
         throw({err_obj:2})
       }

       if(req.body.check==0){
         query = {user_id:mongoose.Types.ObjectId(doc._id),last_four:req.body.card_number.substr(12,4),customer_id:doc.stripe_customer_id}
       }else{
         query = {user_id:mongoose.Types.ObjectId(doc._id),card_id:req.body.card_id}
       }


        return Card.findOne(query)
     }).then(function(card_data){
        if(card_data!=null){

          if(req.body.check==0){
            return res.status(400).json({
              status:0,
              msg:"card already exists"
            })
          }else{
            next();
          }


        }
        if(req.body.check==0){
          next();
        }else{
          return res.status(400).json({
            status:0,
            msg:"card details not exists"
          })
        }
     }).catch(function(err){
        return res.status(500).json({
          status:0,
          msg:"failed to retrived user card data"
        })
     })

 }

 router.delete('/delete_card',authToken,checkcardNumber,function(req, res, next){

      if(!req.body.card_id){
        return res.status(403).send({
            success: 0,
            message: 'required fields are missing'
        });
      }

    tomodel = {}
    User.findOne({access_token:req.headers['x-access-token']}).exec().then(function(doc){
        if(doc==null){
          throw({err_obj:2})
        }
        tomodel.user_id = doc._id
        return stripe.customers.deleteCard(doc.stripe_customer_id,req.body.card_id);
    }).then(function(delete_card_data){
        return Card.remove({user_id:mongoose.Types.ObjectId(tomodel.user_id),card_id:req.body.card_id})
    }).then(function(){
      return res.status(200).json({
        status:1,
        msg: "card data removed on system"
      })
    }).catch(function(err){
      console.log(err);
      return res.status(500).json({
        status:0,
        msg:"failed to delete user card data"
      })
    })
 })


module.exports = router
