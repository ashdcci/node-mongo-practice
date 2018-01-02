var express = require('express')
var router = express.Router()
db = require('../config/db');
upload = require('../services/multer-s3')
multer = require('multer')
moment = require('moment');
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

    if(doc==null){
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
        job_attachment.save(function(err2){
            if(err2){

              return res.status(500).json({
                status: 0,
                msg: 'problam in save data'
              })
            }

            return res.json({
              status: 1,
              filename:req.files[0].filename,
              msg: 'file attach successfully'
            })


        })


    })


  })

  return
})



router.put('/accept_pay_job',function(req,res,next){



  return
})


module.exports = router
