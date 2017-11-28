var express = require('express')
var router = express.Router()
var mongojs = require('mongojs')
db = require('../config/db');
upload = require('../services/multer-s3')

var crypto = require('crypto')
jwt = require('jsonwebtoken')
superSecret = 'b1N3xXrpwNPrsLZH2GmCa95TbuU6hvvKQYVDcKSKrg4PfiOCm_X8A5G_hpLvTmD_'


router.post('/login', function(req, res, next) {
  // check if user exist

  var tomodel = {};
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.json({
      'status':0,
      "msg": "Not authenticate to Login"
    });

    return

  } else {

    pwd = crypto.createHash("md5")
      .update(req.body.password)
      .digest('hex');


      db.users.findAndModify({
          query: { email: req.body.email,password: pwd },
          update: { $set: { token: createToken(req.body.email)  } },
          new: false
      }, function (err, doc, lastErrorObject) {
          // doc.tag === 'maintainer'
            if(err){
              res.status(500);
              res.json({
                'status':0,
                "msg": "problam in fetch data"
              });
            }

            if(doc === null){
              res.status(500);
              res.json({
                'status':0,
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
            db.user_profile.findOne({user_id:doc._id},{ phone: 1, address: 1,age:1,gender:1,profie_pic:1 },function(err_profile,doc_profile){
              if(err_profile){
                res.status(500);
                res.json({
                  'status':0,
                  "msg": "problam in fetch user profile"
                });
              }

              profile_data  = (doc_profile==null) ? {} : doc_profile

              res.status(200).json({
                'status':1,
                "msg": "Login successfully",
                "data":{
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
  }



  })




  router.post('/register',function(req,res,next){
    if(!req.body.email || !req.body.password){
      res.status(400).json({
        'status':0,
        'msg':'not authenticate to register on platform'
      })
      return
    }

    pwd = crypto.createHash("md5")
      .update(req.body.password)
      .digest('hex');


      db.users.count({ email: req.body.email },function(err,doc){
        if(err){
          res.status(500);
          res.json({
            'status':0,
            "msg": "problam in fetch data"
          });
        }


        if(doc === 0){ // email not exist
          db.users.save({
            email:req.body.email,
            password: pwd,
            username: '',
            token: createToken(req.body.email)
          }, function(err1, doc1) {
            if (err1) {
              res.status(500);
              res.json({
                'status':0,
                "msg": "problam in fetch data"
              });
            }

            res.status(200).json({
              'status':1,
              "msg": "Register successfully",
              "data":{
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
          'status':0,
          "msg": "Email Already registered",
          "data":{}
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

module.exports = router
