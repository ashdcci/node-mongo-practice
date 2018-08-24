var express = require('express')
var router = express.Router()
var mongojs = require('mongojs')
db = require('../config/db');
upload = require('../services/multer-s3')
moment = require('moment');
mailer = require('../services/mailer')
const _= require('lodash');

var crypto = require('crypto')
jwt = require('jsonwebtoken')
superSecret = 'b1N3xXrpwNPrsLZH2GmCa95TbuU6hvvKQYVDcKSKrg4PfiOCm_X8A5G_hpLvTmD_'


router.post('/login', function(req, res, next) {
  // check if user exist

  var tomodel = {};
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.json({
      'status': 0,
      "msg": "Not authenticate to Login"
    });

    return

  }

  pwd = crypto.createHash("md5")
    .update(req.body.password)
    .digest('hex');


  db.users.findAndModify({
    query: {
      email: req.body.email,
      password: pwd
    },
    update: {
      $set: {
        token: createToken(req.body.email)
      }
    },
    new: false
  }, function(err, doc, lastErrorObject) {
    // doc.tag === 'maintainer'
    if (err) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "problam in fetch data"
      });
    }

    if (doc === null) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "Wrong Creds or data not found"
      });
      return
    }


    /**
     * Way One
     */





    /**
     * Way 2
     */
    db.user_profile.findOne({
      user_id: doc._id
    }, {
      phone: 1,
      address: 1,
      age: 1,
      gender: 1,
      profie_pic: 1
    }, function(err_profile, doc_profile) {
      if (err_profile) {
        res.status(500);
        res.json({
          'status': 0,
          "msg": "problam in fetch user profile"
        });
      }

      profile_data = (doc_profile == null) ? {} : doc_profile

      res.status(200).json({
        'status': 1,
        "msg": "Login successfully",
        "data": {
          _id: doc._id,
          email: doc.email,
          username: doc.username,
          token: doc.token,
          profile_data: profile_data
        }
      });


    })

  })

  return




})




router.post('/register', function(req, res, next) {
  if (!req.body.email || !req.body.password) {
    res.status(400).json({
      'status': 0,
      'msg': 'not authenticate to register on platform'
    })
    return
  }

  pwd = crypto.createHash("md5")
    .update(req.body.password)
    .digest('hex');


  db.users.count({
    email: req.body.email
  }, function(err, doc) {
    if (err) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "problam in fetch data"
      });
    }


    if (doc === 0) { // email not exist
      db.users.save({
        email: req.body.email,
        password: pwd,
        username: '',
        token: createToken(req.body.email)
      }, function(err1, doc1) {
        if (err1) {
          res.status(500);
          res.json({
            'status': 0,
            "msg": "problam in fetch data"
          });
        }

        res.status(200).json({
          'status': 1,
          "msg": "Register successfully",
          "data": {
            _id: doc1._id,
            email: doc1.email,
            username: doc1.username,
            token: doc1.token,
            profile_data: {}
          }
        });


      });

      return
    }

    res.status(200).json({
      'status': 0,
      "msg": "Email Already registered",
      "data": {}
    });

    return
  })


})


createToken = function(id) {

  var exp_time = Math.floor(Date.now() / 1000) + (3600 * 3600);
  var token = jwt.sign({
    exp: exp_time,
    data: Math.floor((Math.random() * 1000000000) + 1).toString()
  }, superSecret);
  return token;

}






/**
 * Forgot password
 */

router.post('/forgot-password', function(req, res, next) {
  if (!req.body.email) {
    res.status(400).json({
      'status': 0,
      'msg': 'Email field is required'
    })
    return
  }


  token = crypto.createHash("md5")
    .update(Math.floor((Math.random() * 1000000000) + 1).toString())
    .digest('hex');

  db.users.count({
    email: req.body.email
  }, function(err, doc) {
    if (err) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "problam in fetch data"
      });
      return
    }


    if (doc === 0) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "Email is not exist into system"
      });
      return
    }

    /**
     * delete previous token to user email
     * insert current email's attach token
     */
    updateForgotPasswordToken(req.body.email, req, res, next);

    return
  })



})

/**
 * Delete previous token attach to that email
 */
updateForgotPasswordToken = function(email, req, res, next) {
  token = createToken(email)
  db.password_reset.findAndModify({
    query: {
      email: req.body.email
    },
    update: {
      $set: {
        token: token,
        exp_time: moment().add(1, 'days').format('YYYY-MM-DD HH:mm:ss')
      }
    },
    new: true,
    upsert: true
  }, function(err, doc, lastErrorObject) {
    if (err) {
      res.status(500);
      res.json({
        'status': 0,
        "msg": "problam in update token"
      });
      return
    }


    res.status(200);
    res.json({
      'status': 1,
      "msg": "Token generated Successfully"
    });
    // sendMail(email,token,req,res,next);
    return
  })

}

/**
 * send email to user
 */
sendMail = function(email, token, req, res, next) {
  return
}

router.post('/sendDemoEmail', function(req, res, next) {
  req.app.mailer.send('sendForgotMail.ejs', {
    to: req.body.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
    subject: 'project subject', // REQUIRED.
    token: createToken(req.body.email),
    headers: {
      "content-type": "text/html; charset=UTF-8"
    },
    otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
  }, function(err) {
    if (err) {
      return next(err);
    }
    res.status(200);
    res.json({
      'status': 1,
      "msg": "Mail sent"
    });

    return
  });
})



router.put('/reset-password', function(req, res, next) {
  if (!req.body.token || !req.body.password || !req.body.cpassword) {
    res.status(400).json({
      'status': 0,
      'msg': 'Required field are required'
    })
    return
  }

  password = (typeof req.body.password !== 'undefined') ? req.body.password : ''
  cpassword = (typeof req.body.cpassword !== 'undefined') ? req.body.cpassword : ''

  if (password != cpassword || password == '') {
    res.status(500).json({
      'status': 0,
      'msg': 'Password and confirm password data must be matched'
    })
    return
  }


  db1.password_reset.findOne({
    token: req.body.token,
    exp_time: {
      $gte: moment().format('YYYY-MM-DD HH:mm:ss')
    }
  }).then(function(result) {
    console.log(result)
    /**
     * update password related to email
     */
    if (result == null) {
      res.status(200).json({
        'status': 0,
        'msg': 'Token expired or not exist into system'
      })
      return
    }

    return db1.users.update({
      email: (result.email != null) ? result.email : ''
    }, {
    $set: { password: crypto.createHash("md5").update(password).digest('hex')}
    })

  }).then(function(updRes) {
    /**
     * delete token attached to password
     */
    return db1.password_reset.remove({
      token: req.body.token
    })

  }).then(function(delRes){

    res.status(200).json({
      status: 1,
      msg: "Password reset successfully"
    })

  }).catch(function(err) {
    console.log(err)
    res.status(500).json({
      status: 0,
      msg: "problam in performing opertions"
    })
  })

  return

})


/**
 * update user profile
 */


 function onlyNotEmpty(req, res, next) {
     const out = {};
     _(req.body).forEach((value, key) => {
         if (!_.isEmpty(value)) {
             out[key] = value;
         }
     });

     req.bodyNotEmpty = out;
     next();
 }



 router.put('/user-profile',function(req, res, next){

   if(!req.body.access_token){
     res.status(500).json({'status':0,'msg':"Required Field are Missing"})
     return
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


   const update = {
        $set: tomodel
    };

    db.users.findOne({
      token: req.body.access_token
    },function(err, result){
      if(err){
        return res.status(500).json({
          status: 0,
          msg: "problam in performing opertions"
        })
      }

      if (result == null) {
        res.status(200).json({
          'status': 0,
          'msg': 'User not exist into system'
        })

        return
      }

      tomodel.user_id = mongojs.ObjectId(result._id)
      console.log(tomodel)
      db.user_profile.findAndModify({
        query: {
          user_id: mongojs.ObjectId(result._id)
        },
        update: {
          $set: tomodel
        },
        new: true,
        upsert: true
      },function(err1,doc1){
        if(err1){
          return res.status(500).json({
            status: 0,
            msg: "problam in performing opertions"
          })
        }
        // result.profile_data = doc1
        result.about = doc1.about
        result.address = doc1.address
        result.gender = doc1.gender

        res.status(200).json({
          status: 1,
          msg: "User Profile Updated",
          "data1":result
        })
        return


      })

      return
    })



    return

 })


 router.get('/user-profile/:id',function(req, res, next){

   if(!req.params.id){
     return res.status(400).json({
       status:0,
       msg: "required fields are missing"
     })
   }

   db.users.findOne({
     _id: mongojs.ObjectId(req.params.id)
   },function(err, result){
     if(err){
       return res.status(500).json({
         status: 0,
         msg: "problam in performing opertions"
       })
     }

     if (result == null) {
       res.status(200).json({
         'status': 0,
         'msg': 'User not exist into system'
       })

       return
     }




     db.users.aggregate([
       {
         "$lookup": {
           "from": "user_profile",
           "localField": "_id",
           "foreignField": "user_id",
           "as": "user_profile"
         }
       },
       {
         "$match": {

           "_id":mongojs.ObjectId(req.params.id)
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
     ],function(err, post) {
       if (err) {
         res.status(500).send(err)
         return
       }
       res.status(200).json({
         'status': 1,
         'msg': 'User data',
         "data":post[0]
       })
     })


     return
   })


   return
 })


 router.post('/upload-image',checkToken,upload.array('image', 1),function(req, res, next){


   return

   db.user_profile.findAndModify({
     query: {
       user_id: mongojs.ObjectId()
     },
     update: {
       $set: {
         user_id : mongojs.ObjectId(result._id),
         filename: req.files.originalname
       }
     },
     new: true,
     upsert: true
   },function(err1,doc1){
     if(err1){
       return res.status(500).json({
         status: 0,
         msg: "problam in performing opertions"
       })
     }


     res.status(200).json({
       status: 1,
       msg: "User Image Updated",
       "filename":result
     })
     return


   })
     return
 })

 function checkToken(req,res, next){
   console.log(req.headers['access_token'])
   if(!req.headers['access_token']){
     return res.status(400).json({
       status:0,
       filename: "",
       msg: "required fields are missing"
     })
   }

   db.users.findOne({
     access_token: req.headers['access_token']
   },function(err, result){
     if(err){
       return res.status(500).json({
         status: 0,
         filename: "",
         msg: "problam in performing opertions"
       })
     }

     if (result == null) {
       res.status(500).json({
         'status': 0,
         filename: "",
         'msg': 'User not exist into system'
       })

       return
     }



   return result._id
   })


 }



module.exports = router
