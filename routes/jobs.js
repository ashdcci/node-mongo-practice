var express = require('express')
var router = express.Router()
db = require('../config/db');
upload = require('../services/multer-s3')
multer = require('multer')
moment = require('moment');
var async = require('async');
var mongoose = require('mongoose');
storage = require('../services/multer')
var upload_multi = require('../services/multer')
var upload_file = upload_multi.array('image', 12)
var stripe = require('../services/stripe')

mailer = require('../services/mailer')
const _ = require('lodash');
JobSchema = require('../schema/jobSchema')
UserSchema = require('../schema/userSchema')

// model defination
User = db.model('User', UserSchema.userSchema)
Job = db.model('Job', JobSchema.jobSchema)
jobDetailsSchema = db.model('jobDetails', JobSchema.jobDetailsSchema)
jobDetails = db.model('jobDetails', JobSchema.jobDetailsSchema)

jobAttachmant = db.model('jobAttachmant', JobSchema.jobAttachmantSchema)
jobCommentSchema = db.model('jobComment', JobSchema.jobCommentSchema)
jobPaymentSchema = db.model('jobPayment', JobSchema.jobPaymentSchema)


router.post('/create-job', authToken, function(req, res, next) {

  /**
   * 1. get user id from token
   * 2. save job data
   */


  if (!req.body.job_id || !req.body.business_id || !req.body.invoice_no || !req.body.job_value) {
    return res.status(400).json({
      status: 0,
      msg: "required fields are missing"
    })
  }

  User.findOne({
    access_token: req.headers['x-access-token']
  }).exec().then(function(doc) {
    if (doc == null) {
      return res.status(500).json({
        status: 0,
        msg: "user not exist on system"
      })
    }

    tomodel = {}
    tomodel.job_id = req.body.job_id
    tomodel.business_id = req.body.business_id
    tomodel.customer_id = doc._id
    tomodel.invoice_no = req.body.invoice_no
    tomodel.job_value = req.body.job_value
    var job_data = new Job(tomodel)
    return job_data.save()



  }).then(function(job_doc) {
    if (job_doc == null) {
      throw ({
        err_obj: 2
      })
    }


    tomodel = {}

    tomodel.job_id = mongoose.Types.ObjectId(job_doc._id)
    tomodel.job_note = (typeof req.body.job_note !== 'undefined' && req.body.job_note != '') ? req.body.job_note : ''
    tomodel.name = (typeof req.body.name !== 'undefined' && req.body.name != '') ? req.body.name : ''
    tomodel.email = (typeof req.body.email !== 'undefined' && req.body.email != '') ? req.body.email : ''
    tomodel.phone = (typeof req.body.phone !== 'undefined' && req.body.phone != '') ? req.body.phone : ''
    tomodel.site_address = (typeof req.body.site_address !== 'undefined' && req.body.site_address != '') ? req.body.site_address : ''
    tomodel.payment_date = (typeof req.body.payment_date !== 'undefined' && req.body.payment_date != '') ? moment(req.body.payment_date).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss')


    return jobDetailsSchema.update({
      job_id: mongoose.Types.ObjectId(job_doc._id)
    }, tomodel, {
      upsert: true
    })

  }).then(function(job_details_doc) {
    if (job_details_doc == null) {
      throw ({
        err_obj: 3
      })
    }
    return res.status(200).json({
      status: 0,
      mag: 'job created successfully'
    })
  }).catch(function(err) {
    if (err.err_obj) {

      msg = (err.err_obj == 2) ? 'Problam in creation of JOB' : 'problam in job details creation'
      return res.status(503).json({
        status: 0,
        msg: msg
      });

    } else {

      return res.status(500).json({
        status: 0,
        msg: "problam in fetch data"
      })

    }
  })

  return
})



function authToken(req, res, next) {


  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, superSecret, function(err, decoded) {
      if (err) {
        return res.status(400).json({
          status: 0,
          msg: 'Failed to authenticate token.'
        });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        User.findOne({
          access_token: token
        }, function(err1, doc) {

          if (err1) {
            return res.status(400).json({
              status: 0,
              msg: 'Failed to authenticate token.'
            });
          } else if (doc == null) {
            return res.status(400).json({
              status: 0,
              msg: 'Failed to authenticate token.'
            });
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
      status: 0,
      msg: 'No token provided.'
    });

  }



}


router.put('/edit-job', authToken, function(req, res, next) {
  if (!req.body.id || !req.body.invoice_no || !req.body.job_value) {
    return res.status(400).json({
      status: 0,
      msg: "required fields are missing"
    })
  }

  User.findOne({
    access_token: req.headers['x-access-token']
  }).exec().then(function(doc) {
    if (doc == null) {
      throw ({
        err_obj: 1
      })
    }

    tomodel = {}

    tomodel.invoice_no = req.body.invoice_no
    tomodel.job_value = req.body.job_value

    return Job.update({
      _id: mongoose.Types.ObjectId(req.body.id),
      customer_id: mongoose.Types.ObjectId(doc._id)
    }, tomodel, {})

  }).then(function(job_doc) {

    if (job_doc == null) {
      throw ({
        err_obj: 2
      })
    }
    tomodel = {}


    tomodel.job_note = (typeof req.body.job_note !== 'undefined' && req.body.job_note != '') ? req.body.job_note : ''
    tomodel.name = (typeof req.body.name !== 'undefined' && req.body.name != '') ? req.body.name : ''
    tomodel.email = (typeof req.body.email !== 'undefined' && req.body.email != '') ? req.body.email : ''
    tomodel.phone = (typeof req.body.phone !== 'undefined' && req.body.phone != '') ? req.body.phone : ''
    tomodel.site_address = (typeof req.body.site_address !== 'undefined' && req.body.site_address != '') ? req.body.site_address : ''
    tomodel.payment_date = (typeof req.body.payment_date !== 'undefined' && req.body.payment_date != '') ? moment(req.body.payment_date).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss')


    return jobDetailsSchema.update({
      job_id: mongoose.Types.ObjectId(req.body.id)
    }, tomodel, {
      upsert: false
    })


  }).then(function(job_details_doc) {

    if (job_details_doc == null) {
      throw ({
        err_obj: 3
      })
    }
    return res.status(200).json({
      status: 0,
      mag: 'job updated successfully'
    })
  }).catch(function(err) {
    if (err.err_obj) {

      msg = (err.err_obj == 2) ? 'Problam in creation of JOB' : ((err.err_obj == 1) ? 'User not Exist in system' : 'problam in job details creation')
      return res.status(503).json({
        status: 0,
        msg: msg
      });

    } else {

      return res.status(500).json({
        status: 0,
        msg: "problam in fetch data"
      })

    }
  })


})


router.post('/job-attachment', authToken, function(req, res, next) {

  if (!req.headers['job_id']) {
    return res.status(400).json({
      status: 0,
      msg: 'required files are missing'
    })
  }

  Job.findOne({
    _id: mongoose.Types.ObjectId(req.headers['job_id'])
  }, function(err, doc) {
    if (err) {
      return res.status(500).json({
        status: 0,
        msg: 'problam in fetch data'
      })
    }

    if (doc == null) {
      return res.status(403).json({
        status: 0,
        msg: 'invalid job'
      })
    }


    upload_file(req, res, function(err1) {
      if (err1) {
        // An error occurred when uploading
        return res.status(500).json({
          status: 0,
          msg: 'problam in upload file'
        })

      }

      tomodel = {}
      tomodel.job_id = req.headers['job_id']
      tomodel.filename = (req.files) ? req.files[0].filename : ''
      tomodel.original_name = (req.files) ? req.files[0].originalname : ''



      var job_attachment = new jobAttachmant(tomodel)
      job_attachment.save(function(err2) {
        if (err2) {

          return res.status(500).json({
            status: 0,
            msg: 'problam in save data'
          })
        }

        return res.json({
          status: 1,
          filename: req.files[0].filename,
          msg: 'file attach successfully'
        })


      })


    })


  })

  return
})



router.delete('/delete_job', authToken, function(req, res, next) {





  if (!req.body.job_id) {
    return res.status(400).json({
      status: 0,
      msg: 'required fields are missing'
    })
  }

  User.findOne({
    access_token: req.headers['x-access-token']
  }, function(err1, doc1) {
    if (err1) {
      return res.status(500).json({
        status: 0,
        msg: 'problam in fetch user data'
      })
    }




    async.parallel([
      function(callback) {
        Job.update({
          _id: mongoose.Types.ObjectId(req.body.job_id),
          customer_id: mongoose.Types.ObjectId(doc1._id)
        }, {
          deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          isDeleted: 1
        }, {
          upsert: false
        }, function(err2, doc2) {
          callback(err2, doc2);
        })
      },
      function(callback) {
        jobDetailsSchema.update({
          job_id: mongoose.Types.ObjectId(req.body.job_id)
        }, {
          $set: {
            deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, {
          upsert: false
        }, function(err3, doc3) {
          callback(err3, doc3);
        })
      },
      function(callback) {
        jobAttachmant.update({
          job_id: mongoose.Types.ObjectId(req.body.job_id)
        }, {
          $set: {
            deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, {
          upsert: false
        } , function(err4, doc4) {
          callback(err4, doc4);
        })
      },
      function(callback) {
        jobCommentSchema.update({
          job_id: mongoose.Types.ObjectId(req.body.job_id)
        }, {
          $set: {
            deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, {
          upsert: false
        }, function(err5, doc5) {
          callback(err5, doc5);
        })
      },
      function(callback) {
        jobPaymentSchema.update({
          job_id: mongoose.Types.ObjectId(req.body.job_id)
        }, {
          $set: {
            deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, {
          upsert: false
        }, function(err6, doc6) {
          callback(err6, doc6);
        })
      }
    ], function(errs, results) {
      console.log(errs)
      if (errs) {
        return res.json({
          status: 0,
          msg: 'problam in delete data'
        });
      }
      console.log(results)
      return res.status(200).json({
        status: 1,
        msg: 'job deleted on system'
      })
    })

  })
  return
})


router.put('/cancel_job',authToken, function(req, res, next) {

  if (!req.body.job_id) {
    return res.status(400).json({
      status: 0,
      msg: 'required fields are missing'
    })
  }


  Job.aggregate([
    {
      "$lookup": {
        "from": "users",
        "localField": "customer_id",
        "foreignField": "_id",
        "as": "users"
      }
    },
    {
      "$match": {
        "_id":mongoose.Types.ObjectId(req.body.job_id),
         "users.access_token":req.headers['x-access-token']
      }
    },
    {$unwind: {'path': '$users',preserveNullAndEmptyArrays: true,includeArrayIndex: "arrayIndex"}},
    {
      "$project": {
        "_id": "$_id",
        "status":"$status",
        "customer_id":"$customer_id",
        email: { $ifNull: [ "$users.email", "" ] },

      }
    }
  ],function(err1,rows){

    if(err1){
      return res.status(500).json({
        status:0,
        msg:'problam in fetch data'
      })
    }


    if(rows.length > 0){


      if(rows[0].status===2){
        return res.json({ status: 0,msg:"Sorry "+rows[0].email+" has already accepted this job. Please refresh the screen and use 'CANCEL & REFUND' instead"});
      }else if(rows[0].status===6){
        return res.json({ status: 0,msg:"Sorry "+rows[0].email+" has already declined this job."});
      }else if(rows[0].status===4){
        return res.json({ status: 0,msg:"Sorry "+rows[0].email+" has already closed this job."});
      }else if(rows[0].status===5){
        return res.json({ status: 0,msg:"Sorry this job has already cancelled."});
      }else{
        Job.update({_id:mongoose.Types.ObjectId(rows[0]._id)},{status:5},{upsert:false},function(err2,doc2){
            if(err2){
              return res.status(500).json({
                status:0,
                msg:"problem in update job data"
              })
            }

            return res.status(500).json({
              status:1,
              msg:"Job Cancelled"
            })
        })
      }

    }else{
      return res.status(404).json({
        status:0,
        msg:' user is not associate with this job'
      })
    }

  })

  return
})




router.put('/decline_job',authToken, function(req, res, next) {

  if (!req.body.job_id || !req.body.comment) {
    return res.status(400).json({
      status: 0,
      msg: 'required fields are missing'
    })
  }


  Job.aggregate([
    {
      "$lookup": {
        "from": "users",
        "localField": "business_id",
        "foreignField": "_id",
        "as": "users"
      }
    },
    {
      "$match": {
        "_id":mongoose.Types.ObjectId(req.body.job_id),
         "users.access_token":req.headers['x-access-token']
      }
    },
    {$unwind: {'path': '$users',preserveNullAndEmptyArrays: true,includeArrayIndex: "arrayIndex"}},
    {
      "$project": {
        "_id": "$_id",
        "status":"$status",
        "business_id":"$business_id",
        email: { $ifNull: [ "$users.email", "" ] },

      }
    }
  ],function(err1,rows){

    if(err1){
      return res.status(500).json({
        status:0,
        msg:'problam in fetch data'
      })
    }


    if(rows.length > 0){


      if(rows[0].status===5){
        return res.json({ status: 0,msg:"Sorry this job has already cancelled."});
      }else{
        Job.update({_id:mongoose.Types.ObjectId(rows[0]._id)},{status:6},{upsert:false},function(err2,doc2){
            if(err2){
              return res.status(500).json({
                status:0,
                msg:"problem in update job data"
              })
            }

            tomodel = {}
            tomodel.comment = req.body.comment
            tomodel.job_id = rows[0]._id
            tomodel.user_id = rows[0].business_id
            tomodel.status = 6
            job_comment_data = new jobComment(tomodel)
            job_comment_data.save()

            return res.status(500).json({
              status:1,
              msg:"Job Cancelled"
            })
        })
      }

    }else{
      return res.status(404).json({
        status:0,
        msg:' user is not associate with this job'
      })
    }

  })

  return
})



router.put('/accept_pay_job',authToken, checkCardDetails,function(req, res, next){

  if (!req.body.job_id || !req.body.stripe_customer_id || !req.body.card_id || !req.body.amount) {
    return res.status(400).json({
      status: 0,
      msg: 'required fields are missing'
    })
  }


  Job.aggregate([
    {
      "$lookup": {
        "from": "users",
        "localField": "business_id",
        "foreignField": "_id",
        "as": "users"
      }
    },
    {
      "$match": {
        "_id":mongoose.Types.ObjectId(req.body.job_id),
         "users.access_token":req.headers['x-access-token']
      }
    },
    {$unwind: {'path': '$users',preserveNullAndEmptyArrays: true,includeArrayIndex: "arrayIndex"}},
    {
      "$project": {
        "_id": "$_id",
        "status":"$status",
        "business_id":"$business_id",
        email: { $ifNull: [ "$users.email", "" ] },

      }
    }
  ],function(err1,rows){

    if(err1){
      return res.status(500).json({
        status:0,
        msg:'problam in fetch data'
      })
    }


    if(rows.length > 0){


      if(rows[0].status===5 || rows[0].status===6 || rows[0].status===4 || rows[0].status===3 || rows[0].status===2){
        return res.json({ status: 0,msg:"Sorry this can`t accept job and pay."});
      }else{

        stripe.charges.create({
          amount: amount,
          currency: 'aud',
          customer: req.body.stripe_customer_id,
          card:req.body.card_id
        }).then(function(charge){
          console.log(charge)

          

        }).catch(function(stripe_err){
            console.log(stripe_err)
        });

        return
        Job.update({_id:mongoose.Types.ObjectId(rows[0]._id)},{status:2},{upsert:false},function(err2,doc2){
            if(err2){
              return res.status(500).json({
                status:0,
                msg:"problem in update job data"
              })
            }



            return res.status(500).json({
              status:1,
              msg:"Job accepted"
            })
        })
      }

    }else{
      return res.status(404).json({
        status:0,
        msg:' user is not associate with this job'
      })
    }

  })




    return
})


  function checkCardDetails(req, res, next){
    next()
  }




module.exports = router
