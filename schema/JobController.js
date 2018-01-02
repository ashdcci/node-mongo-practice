//Job controller
function job(app){
  data 	= {};
  tomodel = {};
  model 	= require('../models/job_model');
  mailer 	= require('../config/mail');
  promise = require('bluebird');
  session = require('express-session');
  crypto  = require('crypto');
  moment  = require('moment');
};

/* Declaration Start here */
var AWS = require('aws-sdk');
var config = require('config');
var async = require('async');
var multer  =   require('multer');
var json2csv = require('json2csv');
var fs = require('fs');
var stripe = require('stripe')(config.get('tpay.stripe.key'));
var gm = require('gm').subClass({ imageMagick: true });
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {

    callback(null, './public/');
  },
  filename: function (req, file, callback) {

    callback(null, file.fieldname + '-' + Date.now());
  }
});
var upload = multer({ storage : storage }).array('file',4);

job.prototype.constructor = job;
/* Declaration End Here */
/* handling socket io start */

// function io_operations(server,user_id){
//   // var io_handler = require('../config/io_manager')(server);
//
//   io.on('connection',function(socket){
//       console.log('We have user connected Again !');
//           // This event will be emitted from Client when some one add comments.
//       socket.on('unread_notif_'+user_id,function(data){
//                   console.log(data,user_id);
//       });
//   //
//   });
//   // console.log(global.io);
// }

/*
Notification Types
0->job_received,
1->job_accepted,
2->job_declined,
3->accept and deposit_into_escrow,
4->raise_dispute,
5->end_dispute,
6->authorise_realse_of_funds,
7->request_to_release_fund,
8->review_add,
9->review_edit,
10->cancel_job,
11->refund_job,
12->job_edited
*/

/* handling socket io end */

/* notification handler start */
function insert_notification(sender_id,recr_id,id,job_id,type,next){
  tomodel.sender_id = sender_id;
  tomodel.recr_id = recr_id;
  tomodel.id = id;
  tomodel.job_id = job_id;
  tomodel.type = type;
  model.insert_notification(tomodel,function(err,row){
    if(err) return next(err);
  });
}
/* notification handler end */

/* Routes start here */


job.prototype.upload_demo = function(req,res,next){
  res.json(req.files);
  upload(req,res,function(err) {

      if(err) {
          return next(err);
      }
      // res.end("File is uploaded");

  });
  return;
}

job.prototype.create_job = function(req, res, next){

  if(req.session.user_type==0){
    // get job id
    tomodel.user_id = req.session.user_id;
    model.getJobId(tomodel,function(err,rows){
      if(err) return next(err);
      if(rows.length > 0){
        job_id = parseInt(rows[0].job_id)+parseInt(rows[0].id);
      }else{
        job_id = 1000000001;
      }

      return res.render('dashboard/create_job',{job_id:job_id});
    });


  }else{
    return res.render('dashboard/index');
  }

}

job.prototype.notifications = function(req,res,next){
  return res.render('dashboard/notifications');
}



job.prototype.edit_job = function(req, res, next){

  if(req.session.user_type==0 && (req.body.id || req.query.id || req.headers['id'] || req.params.id)){
    // get job id
    var fromDraft = 0;
    tomodel.user_id = req.session.user_id;
    tomodel.job_id = req.body.id || req.query.id || req.headers['id'] || req.params.id;
    if(req.body.fromDraft || req.query.fromDraft || req.headers['fromDraft'] || req.params.fromDraft){
      fromDraft = 1;
    }else{
      fromDraft = 0;
    }
    tomodel.user_type = req.session.user_type;
    model.getJobDetailsById(tomodel,function(err,rows){
      if(err) return res.render('dashboard/index');
      if(rows.length > 0){
          return res.render('dashboard/edit_job',{job_data:rows,bank_details:[],fromDraft:fromDraft});
      }else{
        return res.render('dashboard/index');
      }

    });

  }else{
    return res.render('dashboard/index');
  }

}

job.prototype.check_mail = function(req,res,next){
  var schema = {
     'email': {
        in: 'body',
        notEmpty: {
          errorMessage:"Please enter a valid email address."
        },
        isEmail: {
          errorMessage: 'Please enter a valid email address.'
        },
      },
    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    tomodel.email = req.body.email;

    if(req.session.email===req.body.email){
      return res.json({ status: 0,param:'email','check':0 ,messages:{param:'email',msg:'you can`t share your email for job creation.'}});
    }else{
      model.check_mail(tomodel,function(err,rows){
        if(err) return next(err);
        if(rows.length===0){
          return res.json({ status: 2,param:'email','check':0 ,messages:{param:'email',msg:'User does not exists with this mail id.'}});
        }else if(parseInt(rows[0].first_time_user)===1){
          // return res.json({ status: 0,param:'email','check':0 ,messages:{param:'email',msg:'User does not exists with this mail id.'}});
          return res.json({ status: 1,param:'email','check':0 ,email:rows[0].email,name:rows[0].name,phone:rows[0].mobile_number,tpay_id:rows[0].tpay_id,user_id:rows[0].id});
        }else{
          return res.json({ status: 1,param:'email','check':0 ,email:rows[0].email,name:rows[0].name,phone:rows[0].mobile_number,tpay_id:rows[0].tpay_id,user_id:rows[0].id});
        }
      });
    }
  return;
}

job.prototype.checkValidation = function(schema,req,res,next){


    /*schema defined end */
      req.checkBody(schema);
      return req.validationErrors();

}

/* post create job start */
job.prototype.postCreateJob = function(req,res,next){

  //validation start
  var schema = {
    'email': {
       in: 'body',
       notEmpty: {
         errorMessage:"Email is required and must be in a valid format."
       },
       isEmail: {
         errorMessage: 'Email is required and must be in a valid format.'
       },
     },
     'name': {
       notEmpty: true,
       errorMessage: 'Please provide a valid name' // Error message for the parameter
     },
     'phone':{
       notEmpty: true,
       errorMessage: 'Please provide a valid phone number' // Error message for the parameter
     },
     'invoice_number':{
       notEmpty: true,
       errorMessage: 'Please provide a valid invoice number' // Error message for the parameter
     },
     'job_value':{
       notEmpty: true,
       errorMessage: 'Please provide a valid job value' // Error message for the parameter
     }

  };

  errors = job.prototype.checkValidation(schema,req,res,next);
  if(errors){
    return res.json({ status: 0, messages: errors[0] });
  }
  // validation end


  var newd = moment().format('YYYY-MM-DD HH:mm:ss');
  var fileName;
  // check if file exists
  var user_id = req.session.user_id;
  tomodel.my_id = user_id;
  tomodel.name = req.body.name;
  tomodel.email = req.body.email;
  tomodel.user_id = req.body.user_id;
  tomodel.phone = req.body.phone;
  tomodel.invoice_number = req.body.invoice_number;
  tomodel.job_value = req.body.job_value;
  tomodel.job_id = req.body.job_id;
  tomodel.draft = req.body.draft;
  tomodel.user_type = req.session.user_type;
  if( typeof req.body.note !== 'undefined' ) { tomodel.note =  req.body.note }else{ tomodel.note = ''; }
  if( typeof req.body.payment_date !== 'undefined' ) { tomodel.payment_date =  req.body.payment_date }else{ tomodel.payment_date = ''; }
  if( typeof req.body.site_address !== 'undefined' ) { tomodel.site_address =  req.body.site_address }else{ tomodel.site_address = ''; }

  // if file upload

  var file_attach = JSON.parse(req.body.file_attach);
  var original_name = JSON.parse(req.body.original_name);
  var base_name = JSON.parse(req.body.base_name);


  model.checkJobId(tomodel,function(err1,rows1){
    if(err1) return next(err1);

    if(rows1.length > 0){

      return res.json({ status: 0,param:'job_id','check':0 ,messages:{param:'job_id',msg:'This job can`t create with exisiting hubpay job id'}});
    }else{

    model.createJob(tomodel,function(err,rows){
      if(err) return next(err);
      var last_id = rows.insertId;
      tomodel.id = last_id;
      // insert notification,send mail,send socket signal notification
      if(tomodel.user_id > 0){
        model.getUserDetailsByJobId(tomodel,function(err1,rows1){
          if(err) return next(err);
          if(rows1[0].notif_job_received===1 && parseInt(req.body.draft)===0){ // if received notifcation enabled
            subject = req.session.user_name+' has sent you a quote';
            message  = req.session.user_name+' has sent you a quote. Job '+tomodel.job_id;
            type = 0;
            sendMail(tomodel.email,tomodel.name,subject,message,req,res,next);
            io_method(tomodel.user_id);
            insert_notification(tomodel.my_id,tomodel.user_id,tomodel.id,tomodel.job_id,type,next);
          }

        });
      }else{
        subject = req.session.user_name+' has sent you a quote';
        message  = req.session.user_name+' has sent you a quote. Job '+tomodel.job_id;
        type = 0;
        sendMail(tomodel.email,tomodel.name,subject,message,req,res,next);
      }





      if(file_attach.length > 0 && original_name.length > 0 && base_name.length > 0){
        var in_str = 'insert into jobs_attchments(job_id,filename,original_name,base_name,created_at,updated_at)values';

        for(i=0;i<file_attach.length;i++){
          if(i===file_attach.length - 1){
            in_str += '('+last_id+',"'+file_attach[i]+'","'+original_name[i]+'","'+base_name[i]+'","'+newd+'","'+newd+'");'
          }else{
            in_str += '('+last_id+',"'+file_attach[i]+'","'+original_name[i]+'","'+base_name[i]+'","'+newd+'","'+newd+'"),';
          }
        }



        model.insertJobsAttachments(in_str,function(err1,row){
          if(err1) return next(err1);
          req.flash('success','Job Created Successfully');
          req.session.flash = new Array("success","Job Created");
          return res.json({status:1,msg:'Job Created'});
        });



      }else{
        req.flash('success','Job Created Successfully');
        if(tomodel.draft==1){
          req.session.flash = new Array("success","Job Saved in Drafts");
        }else{
          req.session.flash = new Array("success","Job Created");
        }

        return res.json({status:1,msg:'Job Created'});

      }


    });
  }
  });

  return;
}
/* post create job end */

/* post edit job start */

job.prototype.postEditJob = function(req,res,next){

  //validation start
  var schema = {
    'email': {
       in: 'body',
       notEmpty: {
         errorMessage:"Email is required and must be in a valid format."
       },
       isEmail: {
         errorMessage: 'Email is required and must be in a valid format.'
       },
     },
     'name': {
       notEmpty: true,
       errorMessage: 'Please provide a valid name' // Error message for the parameter
     },
     'phone':{
       notEmpty: true,
       errorMessage: 'Please provide a valid phone number' // Error message for the parameter
     },
     'invoice_number':{
       notEmpty: true,
       errorMessage: 'Please provide a valid invoice number' // Error message for the parameter
     },
     'job_value':{
       notEmpty: true,
       errorMessage: 'Please provide a valid job value' // Error message for the parameter
     }

  };

  errors = job.prototype.checkValidation(schema,req,res,next);
  if(errors){
    return res.json({ status: 0, messages: errors[0] });
  }
  // validation end


  var newd = moment().format('YYYY-MM-DD HH:mm:ss');
  var fileName;
  var ckk = 0;
  // check if file exists
  var user_id = req.session.user_id;
  tomodel.my_id = user_id;
  tomodel.name = req.body.name;
  tomodel.email = req.body.email;
  tomodel.user_id = req.body.user_id;
  tomodel.phone = req.body.phone;
  tomodel.invoice_number = req.body.invoice_number;
  tomodel.job_value = req.body.job_value;
  tomodel.job_id = req.body.job_id;
  tomodel.draft = req.body.draft;
  tomodel.id = req.body.id;
  tomodel.user_type = req.session.user_type;
  if( typeof req.body.note !== 'undefined' ) { tomodel.note =  req.body.note }else{ tomodel.note = ''; }
  if( typeof req.body.payment_date !== 'undefined' ) { tomodel.payment_date =  req.body.payment_date }else{ tomodel.payment_date = ''; }
  if( typeof req.body.site_address !== 'undefined' ) { tomodel.site_address =  req.body.site_address }else{ tomodel.site_address = ''; }

  // if file upload

  var file_attach = JSON.parse(req.body.file_attach);
  var original_name = JSON.parse(req.body.original_name);
  var base_name = JSON.parse(req.body.base_name);
  model.getUserDetailsByJobId(tomodel,function(err1,rows1){
    if(err1) return next(err1);
    if(parseInt(rows1[0].status)===4){
      // closed case
      return res.json({ status: 2,chk:'closed',param:'id','comment':0 ,messages:{param:'file',msg:'Job closed by customer'}});
    }else if(parseInt(rows1[0].status)===3){
      // dispute case
      return res.json({ status: 2,chk:'dispute',param:'id','comment':0 ,messages:{param:'file',msg:'dispute raised by customer'}});
    }else if(parseInt(rows1[0].status)===6){
      // decline case
      return res.json({ status: 2,chk:'closed',param:'id','comment':0 ,messages:{param:'file',msg:'Job declined by customer'}});
    }else{

      if(parseInt(rows1[0].status)===2){
        ckk = 1;
      }else if(parseInt(rows1[0].status)===0){
        ckk = 0;
      }
    model.editJob(tomodel,function(err,rows){
      if(err) return next(err);
      var last_id = tomodel.id;
      // insert notification,send mail,send socket signal notification start
      // model.getUserDetailsByJobId(tomodel,function(err1,rows1){
      //   if(err) return next(err);
      //   if(rows1[0].notif_job_received===1){ // if received notifcation enabled
      //     subject = req.session.user_name+' has edited a quote';
      //     message  = req.session.user_name+' has edited a quote. Job '+tomodel.job_id;
      //     type = 12;
      //     sendMail(tomodel.email,tomodel.name,subject,message,req,res,next);
      //     io_method(tomodel.user_id);
      //     insert_notification(tomodel.my_id,tomodel.user_id,tomodel.id,tomodel.job_id,type,next);
      //   }
      //
      // });


      // insert notification,send mail,send socket signal notification end

      if(file_attach.length > 0 && original_name.length > 0 && base_name.length > 0){

        model.deleteJobAttachments(tomodel,function(err2,rows2){
          if(err2) return next(err2);



        var in_str = 'insert into jobs_attchments(job_id,filename,original_name,base_name,created_at,updated_at)values';

        for(i=0;i<file_attach.length;i++){
          if(i===file_attach.length - 1){
            in_str += '('+last_id+',"'+file_attach[i]+'","'+original_name[i]+'","'+base_name[i]+'","'+newd+'","'+newd+'");'
          }else{
            in_str += '('+last_id+',"'+file_attach[i]+'","'+original_name[i]+'","'+base_name[i]+'","'+newd+'","'+newd+'"),';
          }
        }

        model.insertJobsAttachments(in_str,function(err1,row){
          if(err1) return next(err1);
          req.flash('success','Job Created Successfully');
          req.session.flash = new Array("success","Job Updated");

          return res.json({status:1,msg:'Job Created Successfully'});
        });

        });

      }else{
        req.flash('success','Job Uodated');
        req.session.flash = new Array("success","Job Updated");
        return res.json({status:1,msg:'Job Created Successfully',chk:ckk});
      }


      });
    }// condition end
  }); // get job details end

  return;
}



/* Post edit job end */

function sendMail(mail,name,subject,message,access_token,req,res,next){
req.app.mailer.send('email/sendJobMail', {
to: mail, // REQUIRED. This can be a comma delimited string just like a normal email to field.
subject: subject, // REQUIRED.
name : name,
message:message,
headers:{"content-type":"text/html; charset=UTF-8"},
otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
}, function (err) {
if (err) {
  console.log(err);
return next(err);
}

});
}

job.prototype.getExtension = function(filename){
  var ext = filename.split('.');
  return ext[ext.length - 1];
}

/* Fetch Jobs start  */
job.prototype.fetchJobs = function(req,res,next){
  var param  = req.body.id || req.query.id || req.headers['id'] || req.params.id;
  var flash_msg = new Array();
  tomodel.user_id = req.session.user_id;
  if(param){
    if(req.session.user_type==0){
      if(param.toLowerCase()==='open' || param.toLowerCase()==='active' || param.toLowerCase()==='dispute' || param.toLowerCase()==='closed' || param.toLowerCase()==='drafts' || param.toLowerCase()==='all'){
          job_param = param;
      }else{
        job_param = '';
      }
    }else{
      if(param.toLowerCase()==='open' || param.toLowerCase()==='active' || param.toLowerCase()==='dispute' || param.toLowerCase()==='closed'){
          job_param = param;
      }else{
        job_param = '';
      }
    }
  }else{
    job_param = 'open';
  }
  if(job_param===''){
    return res.redirect('/dashboard');
  }else{
      if(req.session.flash){
        flash_msg = req.session.flash;
        req.session.flash = [];
      }
      if(req.session.user_type===1){
        model.fetchUserDetails(tomodel.user_id,function(err1,rows1){
          if(err1) return next(err1);
          return res.render('dashboard/jobs',{job_param:job_param,Base_Url:config.get('tpay.site.url'),flash:flash_msg,bank_details:rows1});
        });

      }else{
        // bank_details = new Array();
        model.fetchBusinessUserDetails(tomodel.user_id,function(err1,rows1){
          if(err1) return next(err1);
          return res.render('dashboard/jobs',{job_param:job_param,Base_Url:config.get('tpay.site.url'),flash:flash_msg,bank_details:rows1});
        });
        // return res.render('dashboard/jobs',{job_param:job_param,Base_Url:config.get('tpay.site.url'),flash:flash_msg,bank_details:bank_details});
      }

  }

}

job.prototype.get_jobs_json_data = function(req,res,next){
  var param  = req.body.id || req.query.id || req.headers['id'] || req.params.id;
  if(param){
    if(req.session.user_type==0){
      if(param==='open'){
          job_param = 1;
      }else if(param==='active'){
        job_param = 2;
      }else if(param==='dispute'){
        job_param = 3;
      }else if(param==='closed'){
        job_param = 4;
      }else if(param==='drafts'){
        job_param = 0;
      }else if(param==='all'){
        job_param = 5;
      }else{
        job_param = 1;
      }
    }else{
      if(param==='open'){
          job_param = 1;
      }else if(param==='active'){
        job_param = 2;
      }else if(param==='dispute'){
        job_param = 3;
      }else if(param==='closed'){
        job_param= 4;
      }else{
        job_param = 1;
      }
    }
  }else{
    if(req.session.user_type==0){
      if(param==='open' || param==='active' || param==='dispute' || param==='closed' || param==='drafts' || param==='all'){
          job_param = param;
      }else{
        job_param = '';
      }
    }else{
      if(param==='open' || param==='active' || param==='dispute' || param==='closed'){
          job_param = param;
      }else{
        job_param = '';
      }
    }
  }

  tomodel.user_id = req.session.user_id;
  tomodel.user_type = req.session.user_type;
  tomodel.job_type = job_param;
  var data = new Array();
  var order_cond,search_cond;
  search_cond = '';
  var search_cond11 = '';

  /* order start  */

  if(typeof req.body['order'][0].column!=='undefined'){
    if(job_param!=0 && job_param!=4){
      // order case except for job drafts and job closed

    if(req.body['order'][0].column &&  req.body['order'][0].column == 0){

      if(job_param===1 || job_param===5){
        // open and all jobs
        order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.created_at DESC':'a.created_at  ASC';
      }else if(job_param===2 || job_param===4){
        // active job and closed job
        order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.accepted_at DESC':'a.accepted_at  ASC';
      }else if(job_param===3){
        // dispute job
        order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.raised_at DESC':'a.raised_at  ASC';
      }else{
          order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.created_at DESC':'a.created_at  ASC';
      }

    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 1){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.name DESC':'b.name  ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 2){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.job_id DESC':'a.job_id ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 3){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.invoice_no DESC':'a.invoice_no ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 4){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.job_value DESC':'a.job_value ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 5){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.email DESC':'b.email ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 6){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.mobile_number DESC':'b.mobile_number ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 7){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.status DESC':'a.status ASC';
    }else{
        order_cond = 'a.created_at desc';
    }

  }else if(job_param===4){
    // job in closed case
    if(req.body['order'][0].column &&  req.body['order'][0].column == 0){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.accepted_at DESC':'a.accepted_at  ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 1){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.closed_at DESC':'a.closed_at  ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 2){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.name DESC':'b.name  ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 3){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.job_id DESC':'a.job_id ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 4){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.invoice_no DESC':'a.invoice_no ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 5){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.job_value DESC':'a.job_value ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 6){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.email DESC':'b.email ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 7){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'b.mobile_number DESC':'b.mobile_number ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 8){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.status DESC':'a.status ASC';
    }else{
        order_cond = 'a.created_at desc';
    }

  }else{
    // jobs in draft
    if(req.body['order'][0].column &&  req.body['order'][0].column == 0){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.created_at DESC':'a.created_at  ASC';
    }else if(req.body['order'][0].column &&  req.body['order'][0].column == 1){
      order_cond =(typeof req.body['order'][0].dir !== 'undefined' && req.body['order'][0].dir == 'desc')?'a.job_id DESC':'a.job_id  ASC';
    }

  }

  }else{
    order_cond = 'a.created_at desc';
  }


  tomodel.order = order_cond;

  /* order End */

  /* condition start */
  if( typeof req.body['columns'][0]['search']['value'] !=='undefined' && req.body['columns'][0]['search']['value']!='' ){

    // if(req.session.user_type==0){
      if(job_param==0 || job_param==1){
        // draft or open created_at
          search_cond += ' and date_format(a.created_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';

      }else if(job_param==2){
        // active accept_at
        search_cond += ' and date_format(a.accepted_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';
      }else if(job_param==3){
        // disputed at raised_at
        search_cond += ' and date_format(a.raised_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';
      }else if(job_param==4){
        // closed at
        search_cond += ' and date_format(a.accepted_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';
      }else{
        search_cond += ' and date_format(a.created_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';
      }

  }

    if(job_param!=0 ){
      // if not draft

      if( typeof req.body['columns'][1]['search']['value'] !=='undefined' && req.body['columns'][1]['search']['value']!='' ){
        search_cond += ' and b.name like "%'+req.body['columns'][1]['search']['value'].trim()+'%" ';
      }

      if( typeof req.body['columns'][2]['search']['value'] !=='undefined' && req.body['columns'][2]['search']['value']!='' ){
        search_cond += ' and a.job_id like "%'+req.body['columns'][2]['search']['value'].trim()+'%" ';
      }


      if( typeof req.body['columns'][3]['search']['value'] !=='undefined' && req.body['columns'][3]['search']['value']!='' ){
        search_cond += ' and a.invoice_no like "%'+req.body['columns'][3]['search']['value'].trim()+'%" ';
      }

      if( typeof req.body['columns'][4]['search']['value'] !=='undefined' && req.body['columns'][4]['search']['value']!='' ){
        search_cond += ' and concat("$",a.job_value) like "%'+req.body['columns'][4]['search']['value'].trim()+'%" ';
      }

      if(job_param===4 && req.session.user_type===1){
        if( typeof req.body['columns'][5]['search']['value'] !=='undefined' && req.body['columns'][5]['search']['value']!='' ){
          search_cond += ' and b.mobile_number like "%'+req.body['columns'][5]['search']['value'].trim()+'%" ';
        }

        if( typeof req.body['columns'][6]['search']['value'] !=='undefined' && req.body['columns'][6]['search']['value']!='' ){
          // search_cond += ' and b.mobile_number like "%'+req.body['columns'][6]['search']['value'].trim()+'%" ';

          var val1 = req.body['columns'][6]['search']['value'].toLowerCase();
          // var re = /^open.*$/;

          if( 'open'.startsWith(val1)===true ){
            search_cond += ' and a.status = '+job_param;
          }else if('draft'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('active'.startsWith(val1)===true){
              search_cond +=' and a.status = '+job_param;
          }else if('in dispute'.startsWith(val1)===true || 'supplier dispute'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('closed'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('canceled'.startsWith(val1)===true){
              search_cond += ' and a.status = 5';
          }else if('declined'.startsWith(val1)===true){
              search_cond += ' and a.status = 6';
          }else{
            search_cond += ' and a.status = 7';
          }


        }
      }else{
        if( typeof req.body['columns'][5]['search']['value'] !=='undefined' && req.body['columns'][5]['search']['value']!='' ){
          search_cond += ' and b.email like "%'+req.body['columns'][5]['search']['value'].trim()+'%" ';
        }

        if( typeof req.body['columns'][6]['search']['value'] !=='undefined' && req.body['columns'][6]['search']['value']!='' ){
          search_cond += ' and b.mobile_number like "%'+req.body['columns'][6]['search']['value'].trim()+'%" ';
        }
      }

      if(req.session.user_type===0){



      if( typeof req.body['columns'][7]['search']['value'] !=='undefined' && req.body['columns'][7]['search']['value']!='' ){

        var val1 = req.body['columns'][7]['search']['value'].toLowerCase();
        // var re = /^open.*$/;

        if(job_param!=5){
          if('open'.startsWith(val1)===true){
            search_cond += ' and a.status = '+job_param;
          }else if('draft'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('active'.startsWith(val1)===true){
              search_cond +=' and a.status = '+job_param;
          }else if('in dispute'.startsWith(val1)===true || 'customer dispute'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('closed'.startsWith(val1)===true){
              search_cond += ' and a.status = '+job_param;
          }else if('canceled'.startsWith(val1)===true){
              search_cond += ' and a.status = 5';
          }else if('declined'.startsWith(val1)===true){
              search_cond += ' and a.status = 6';
          }else{
            search_cond += ' and a.status = 7';
          }
        }else{
          if('open'.startsWith(val1)===true){
            search_cond += ' and a.status = 1';
          }else if('draft'.startsWith(val1)===true){
              search_cond += ' and a.status = 0';
          }else if('active'.startsWith(val1)===true){
              search_cond += ' and a.status = 2';
          }else if('in dispute'.startsWith(val1)===true || 'customer dispute'.startsWith(val1)===true){
              search_cond += ' and a.status = 3';
          }else if('closed'.startsWith(val1)===true){
              search_cond += ' and a.status = 4';
          }else if('canceled'.startsWith(val1)===true){
              search_cond += ' and a.status = 5';
          }else if('declined'.startsWith(val1)===true){
              search_cond += ' and a.status = 6';
          }else{
            search_cond += ' and a.status = 7';
          }
        }


        // return;
      }
    }




      if( typeof req.body['columns'][8]['search']['value'] !=='undefined' && req.body['columns'][8]['search']['value']!='' ){
        var val1 = req.body['columns'][8]['search']['value'];
        if(job_param!=5){
          if( 'open'.startsWith(val1)===true ){
            search_cond11 = ' a.status = '+job_param;
          }else if('draft'.startsWith(val1)===true){
              search_cond11 = ' a.status = '+job_param;
          }else if('active'.startsWith(val1)===true){
              search_cond11 =' a.status = '+job_param;
          }else if('in dispute'.startsWith(val1)===true || 'customer dispute'.startsWith(val1)===true){
              search_cond11 = ' a.status = '+job_param;
          }else if('closed'.startsWith(val1)===true){
              search_cond11 = ' a.status = '+job_param;
          }else if('canceled'.startsWith(val1)===true){
              search_cond11 = ' a.status = 5';
          }else if('declined'.startsWith(val1)===true){
              search_cond11 = ' a.status = 6';
          }else{
            search_cond11 = ' a.status = 7';
          }
        }else{
          if('open'.startsWith(val1)===true){
            search_cond11 = ' a.status = 1';
          }else if('draft'.startsWith(val1)===true){
              search_cond11 = ' a.status = 0';
          }else if('active'.startsWith(val1)===true){
              search_cond11 = ' a.status = 2';
          }else if('in dispute'.startsWith(val1)===true || 'customer dispute'.startsWith(val1)===true){
              search_cond11 = ' a.status = 3';
          }else if('closed'.startsWith(val1)===true){
              search_cond11 = ' a.status = 4';
          }else if('canceled'.startsWith(val1)===true){
              search_cond11 = ' a.status = 5';
          }else if('declined'.startsWith(val1)===true){
              search_cond11 = ' a.status = 6';
          }else{
            search_cond11 = ' a.status = 7';
          }
        }


        search_cond = ' and ((date_format(a.created_at,"%d/%m/%Y") like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (b.name like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (a.job_id like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (a.invoice_no like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (concat("$",a.job_value) like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (b.email like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (b.email like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or (b.mobile_number like "%'+req.body['columns'][8]['search']['value'].trim()+'%") or ('+search_cond11+') )';
      }
      // date closed
      if(job_param==4 && req.session.user_type===0){
        if( typeof req.body['columns'][9]['search']['value'] !=='undefined' && req.body['columns'][9]['search']['value']!='' ){
          search_cond += ' and date_format(a.closed_at,"%d/%m/%Y") like "%'+req.body['columns'][9]['search']['value'].trim()+'%" ';
        }
      }else if(job_param==4 && req.session.user_type===1){
        if( typeof req.body['columns'][7]['search']['value'] !=='undefined' && req.body['columns'][7]['search']['value']!='' ){
          search_cond += ' and date_format(a.closed_at,"%d/%m/%Y") like "%'+req.body['columns'][7]['search']['value'].trim()+'%" ';
        }
      }

  }else{
    if( typeof req.body['columns'][0]['search']['value'] !=='undefined' && req.body['columns'][0]['search']['value']!='' ){
      search_cond += ' and date_format(a.created_at,"%d/%m/%Y") like "%'+req.body['columns'][0]['search']['value'].trim()+'%" ';
    }
    if( typeof req.body['columns'][1]['search']['value'] !=='undefined' && req.body['columns'][1]['search']['value']!='' ){
      search_cond += ' and a.job_id like "%'+req.body['columns'][1]['search']['value'].trim()+'%" ';
    }

  }


  tomodel.search_cond = search_cond;
  tomodel.start = req.body.start;
  tomodel.length = req.body.length;
  var json_data = new Array();
  // console.log(search_cond);

  /* condition end */

  model.fetchJobsData(tomodel,function(err,rows){
    if(err) return next(err);
    if(rows.length > 0){

        for(i = 0;i<rows.length;i++){
          var nestedData = new Array();
          if(job_param!=0){
            if(job_param==0 || job_param==1){
              nestedData.push(rows[i].created_at);
            }else if(job_param==2){
              nestedData.push(rows[i].accepted_at);
            }else if(job_param==3){
              nestedData.push(rows[i].raised_at);
            }else if(job_param==4){
              nestedData.push(rows[i].created_at);
              nestedData.push(rows[i].closed_at);
            }else{
              nestedData.push(rows[i].created_at);
            }

            nestedData.push(rows[i].name);
            nestedData.push(rows[i].job_id);
            nestedData.push(rows[i].invoice_no);
            nestedData.push('$'+rows[i].job_value);
            if(req.session.user_type==0){
                nestedData.push(rows[i].email);
            }
            nestedData.push(rows[i].mobile_number);
            nestedData.push(rows[i].status);

            if(parseInt(job_param)===5 && parseInt(rows[i].job_status)===0){
                nestedData.push('<a class="btn btn-sm btn-icon btn-primary btn-arrow viewJobBtn" href="/dashboard/edit-job/'+rows[i].id+'"></a>');
            }else{
                nestedData.push('<a class="btn btn-sm btn-icon btn-primary btn-arrow viewJobBtn" href="/dashboard/view-job/'+rows[i].id+'"></a>');
            }


            if(req.session.user_type==0){
              // business type
              //
              if(job_param==1){
                  nestedData.push('<a class="btn btn-sm btn-icon btn-info btn-edit" href="/dashboard/edit-job/'+rows[i].id+'"></a>');
              }else if(job_param==2){
                nestedData.push('<a class="btn btn-sm btn-icon btn-info btn-edit" href="/dashboard/edit-job/'+rows[i].id+'"></a>');
                console.log(rows[i].fund_str);
                if(rows[i].fund_str!='' && rows[i].fund_str.trim()!='Fund Requested'){
                    nestedData.push('<a class="font-success RequestJobFundBtn" data-name="'+rows[i].name+'" job-value="$'+rows[i].job_value+'" data-amount="'+rows[i].job_value+'" rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" data-status="4" release-state="1" href="javascript:void(0);">'+rows[i].fund_str+'</a>');
                }else{
                  nestedData.push('<a class="font-success"  href="javascript:void(0);">Fund Requested</a>');
                }

              }else if(job_param==3){

                if(rows[i].dispute_by==req.session.user_id){
                  nestedData.push('<a class="font-error applyOperationJob" rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" data-status="2" href="javascript:void(0);">End Dispute</a>');
                }else{
                    nestedData.push('');
                }
              }else if(job_param==4){
                nestedData.push('<a class="btn btn-sm btn-icon btn-success"  href="javascript:void(0);">Closed</a>');
              }else{
                nestedData.push('');
              }

            }else{
              // consumer type

              if(job_param==1){
                  nestedData.push('<a class="btn btn-sm btn-icon btn-success btn-accept acceptPayJobBtn" rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" payment-date="'+rows[i].payment_date+'" job-value="$'+rows[i].job_value+'" data-amount="'+rows[i].job_value+'"  href="javascript:void(0);"></a>');
              }else if(job_param==2){
                // nestedData.push('<a class="font-success" href="javascript:void(0);">Release Funds</a>');
                if(rows[i].fund_str!=''){
                    nestedData.push('<a class="font-success RequestJobFundBtn" data-name="'+rows[i].name+'" job-value="$'+rows[i].job_value+'" data-amount="'+rows[i].job_value+'" rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" data-status="4" release-state="2" href="javascript:void(0);">'+rows[i].fund_str+'</a>');
                }else{
                  nestedData.push('<a class="font-success"  href="javascript:void(0);">Release Fund</a>');
                }
              }else if(job_param==3){

                if(rows[i].dispute_by!=req.session.user_id){
                  nestedData.push('');
                }else{
                  nestedData.push('<a class="font-error applyOperationJob" rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" data-status="2" href="javascript:void(0);">End Dispute</a>');
                }

              }else if(job_param==4){
                nestedData.push('<a class="" href="javascript:void(0);">Closed</a>');
              }else{
                nestedData.push('');
              }

            }

          }else{
            // jobs for drafts
              nestedData.push(rows[i].created_at);
              nestedData.push(rows[i].job_id);
              nestedData.push('<a class="btn btn-sm btn-icon btn-primary btn-arrow viewJobBtn" href="/dashboard/edit-job/'+rows[i].id+'?fromDraft=1"></a>');
              nestedData.push('<a class="btn btn-sm btn-icon btn-danger btn-delete deleteJob" data-target="modal" data-href="deleteJobModel"  rel="'+rows[i].id+'" job-id="'+rows[i].job_id+'" href="javascript:void(0);"></a>');
          }
          data.push(nestedData);
        }

        model.fetchJobsDataCount(tomodel,function(err1,rows1){
              if(err1) return next(err1);
              return res.json({draw:parseInt(req.body.draw),recordsTotal:parseInt(rows1[0].cnt),recordsFiltered:parseInt(rows1[0].cnt),data:data});
        });


    }else{
      model.fetchJobsDataCount(tomodel,function(err1,rows1){
            if(err1) return next(err1);
            if(rows1.length > 0){
                return res.json({draw:parseInt(req.body.draw),recordsTotal:parseInt(rows1[0].cnt),recordsFiltered:parseInt(rows1[0].cnt),data:data});
            }else{
              return res.json({draw:parseInt(req.body.draw),recordsTotal:0,recordsFiltered:0,data:data});
            }

      });
        // return res.json({draw:parseInt(req.body.draw),recordsTotal:parseInt(rows.length),recordsFiltered:parseInt(rows.length),data:data});
    }
  });





  return;

}

function nestedData(i,rows,data,res){
  if(i<rows.length){

      var nestedData = new Array();
      nestedData.push(rows[i].created_at);
      nestedData.push(rows[i].name);
      nestedData.push(rows[i].job_id);
      nestedData.push(rows[i].invoice_no);
      nestedData.push(rows[i].job_value);
      nestedData.push(rows[i].email);
      nestedData.push(rows[i].mobile_number);
      nestedData.push(rows[i].status);
      nestedData.push('<a class="btn btn-sm btn-icon btn-primary btn-arrow" href="javascript:void(0);"></a>');
      nestedData.push('<a class="btn btn-sm btn-icon btn-info btn-edit" href="javascript:void(0);"></a>');
      data.push(nestedData);
      nestedData(i+1,rows,data,res);

  }else{
    var json_data = new Array();
    json_data["draw"] = parseInt(req.body.draw);
    json_data["recordsTotal"] = parseInt(rows.length);
    json_data["recordsFiltered"] = parseInt(rows.length);
    json_data["data"] = data;
    return res.json(json_data);
  }
}





/* Fetch Jobs End */

/* Delete Job Start */
job.prototype.delete_job = function(req,res,next){
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;

    model.deleteJob(tomodel,function(err,rows){
      if(err){
        req.flash('error','Problam in deletion of job');
      }else{
        req.flash('success','Job Deleted Successfully');
      }
      return res.json({status:1,msg:"data deleted"});
    });

}
/* Delete Job End*/

/* cancel Job Start */
job.prototype.cancel_job = function(req,res,next){
  var schema = {

      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },

    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.my_id = req.session.user_id;
    tomodel.user_type = req.session.user_type;
    tomodel.status = 5;
    model.getUserDetailsByJobId(tomodel,function(err1,rows1){
      if(err1) return next(err1);
      if(rows1[0].status===2){
        return res.json({ status: 0,param:'id','check':0 ,messages:{param:'id',msg:"Sorry "+rows[0].name+" has already accepted this job. Please refresh the screen and use 'CANCEL & REFUND' instead"}});
      }else if(rows1[0].status===6){
        return res.json({ status: 0,param:'id','check':0 ,messages:{param:'id',msg:"Sorry "+rows[0].name+" has already declined this job."}});
      }else if(rows1[0].status===4){
        return res.json({ status: 0,param:'id','check':0 ,messages:{param:'id',msg:"Sorry "+rows[0].name+" has already closed this job."}});
      }else{
        model.updateJobStatus(tomodel,function(err,rows){
          if(err){
            req.flash('error','Problam in cancelation of job');
          }else{
            req.flash('success','Job Cancel Successfully');
          }
          /* send notification,mail for rejected job start */

            subject = req.session.user_name+' has cancelled Job';
            message  = req.session.user_name+' has cancelled Job '+tomodel.job_id;
            type = 10; // job cancel type
            console.log(rows1[0].email,rows1[0].email1);
            if(rows1[0].email!=null){
              sendMail(rows1[0].email,rows1[0].name,subject,message,req,res,next);
              io_method(rows1[0].id);
              insert_notification(tomodel.user_id,rows1[0].id,tomodel.id,tomodel.job_id,type,next);
            }else{

              sendMail(rows1[0].email1,rows1[0].name1,subject,message,req,res,next);
            }

          });
      /* send notification,mail for rejected job end */
      return res.json({status:1,msg:"Job canceled"});
    }


    });

}
/* cancel Job End*/


/* decline Job Start */
job.prototype.decline_job = function(req,res,next){
  /* Validation start*/
  var schema = {
     'comment': {
        in: 'body',
        notEmpty: {
          errorMessage:"Please enter a reason for declining"
        }
      },
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },

    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }

    /*validation end */

    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.status = 6;
    tomodel.comment = req.body.comment;
    tomodel.user_type = req.session.user_type;
    model.getUserDetailsByJobId(tomodel,function(err1,rows1){
      if(err1) return next(err1);
      if(rows1[0].status===5){
        return res.json({ status: 0,param:'id','comment':0 ,messages:{param:'comment',msg:'Job canceled by business user'}});
      }else{


      model.updateJobStatus(tomodel,function(err,rows){
        if(err){
          req.flash('error','Problam in declining job');
        }else{
          req.flash('success','Job Declined Successfully');
        }

        model.insertJobComment(tomodel,function(err2,rows2){
          if(err2) return next(err2);
        });
        /* send notification,mail for rejected job start */

          subject = req.session.user_name+' has rejected your quote for Job';
          message  = req.session.user_name+' has rejected your quote for Job '+tomodel.job_id;
          type = 2; // job decline type
          sendMail(rows1[0].email,rows1[0].name,subject,message,req,res,next);
          io_method(rows1[0].id);
          insert_notification(tomodel.user_id,rows1[0].id,tomodel.id,tomodel.job_id,type,next);
        });
      /* send notification,mail for rejected job end */

      return res.json({status:1,msg:"Job Declined"});
    }
    });

}
/* decline Job End*/


/* accept and pay job start */

job.prototype.accept_pay_job = function(req,res,next){
  var schema = {
     'card_id': {
        in: 'body',
        notEmpty: {
          errorMessage:"Please select the bank account you wish to have finds withdrawn from."
        }
      },
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },
        'amount':{
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        }

    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    var exp_month,exp_year;
    tomodel.user_id = req.session.user_id;
    tomodel.cid = req.body.card_id;
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    var amount  = parseInt(req.body.amount)*100;

    /* get card details */
    model.getUserDetailsByJobId(tomodel,function(err2,rows2){
      if(err2) return next(err2);

      if(rows2[0].status===5){ // canceled
          return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:'Job canceled by business user'}});
      }else if(rows2[0].status==6){ // declined
          return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:'Job already declined'}});
      }else if(rows2[0].status==4){ // closed
          return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:'Job already closed'}});
      }else if(rows2[0].status==3){
          return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:'Job already disputed'}});
      }else if(rows2[0].status==2){
          return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:'Job already activated'}});
      } else{
        /* accept job opertion start */
    model.getCardDetailsById(tomodel,function(err1,rows1){
      if(err1) return next(err1);
      if(rows1.length > 0){
        var ar = rows1[0].expire_year.split('/');
        exp_month = ar[0];
        exp_year = ar[1];

        stripe.tokens.create({
            card: {
              exp_month: exp_month,
              exp_year: exp_year,
              number: rows1[0].card_number,
              cvc: rows1[0].cvv_number
            }
        }).then(function(token) {

          return stripe.charges.create({
            amount: amount,
            currency: 'aud',
            source: token.id
          });
        }).then(function(charge) {
          // New charge created on a new customer

          tomodel.status = 2;
          tomodel.charge_id = charge.id;



          /* send notification,mail for accept job and deposit to escrow account start */
          model.updateJobStatus(tomodel,function(err3,rows3){
            if(err3) return next(err3);


              if(rows2[0].notif_job_accept===1){ // if received notifcation enabled
                subject = req.session.user_name+' has accepted your quote for Job';
                message  = req.session.user_name+' has accepted your quote for Job '+tomodel.job_id;

                sendMail(rows2[0].email,rows2[0].name,subject,message,req,res,next);
                io_method(rows2[0].id);
                insert_notification(tomodel.user_id,rows2[0].id,tomodel.id,tomodel.job_id,1,next);


              }else{
                console.log('notif error job accept into escrow account');
              }

              if(rows2[0].notif_fund_deposit===1){
                // type  = 3 deposit amount to escrow account
                subject1 = req.session.user_name+' has deposited funds into escrow for Job';
                message1  = req.session.user_name+' has deposited funds into escrow for Job '+tomodel.job_id;
                sendMail(rows2[0].email,rows2[0].name,subject1,message1,req,res,next);
                io_method(rows2[0].id);
                insert_notification(tomodel.user_id,rows2[0].id,tomodel.id,tomodel.job_id,3,next);
              }else{
                console.log('notif error deposit funds into escrow account');
              }


            /* send notification,mail for accept job and deposit to escrow account end */

            model.insertChargeDetails(tomodel,function(err4,rows4){
              if(err4) return next(err4);
              req.session.flash = new Array("success",'Job Accepted and amount transfer into escrow account');
              return res.json({status:1,msg:'job Accepted'});
            });
          });
        }).catch(function(err) {
          // Deal with an error
          var msg;

          switch (err.type) {

              case 'StripeCardError':
                // A declined card error
                msg = err.message; // => e.g. "Your card's expiration year is invalid."
                break;
              case 'StripeInvalidRequestError':
                // Invalid parameters were supplied to Stripe's API
                msg = err.message;
                break;
              case 'StripeAPIError':
                // An error occurred internally with Stripe's API
                msg = err.message;
                break;
              case 'StripeConnectionError':
                // Some kind of error occurred during the HTTPS communication
                msg = err.message;
                break;
              case 'StripeAuthenticationError':
                // You probably used an incorrect API key
                msg = err.message;
                break;
              case 'StripeRateLimitError':
                // Too many requests hit the API too quickly
                msg = err.message;
                break;
            }
            return res.json({ status: 0,param:'card_id','check':0 ,messages:{param:'card_id',msg:msg}});
        });
      }


    }); // get card id closed

    /* accept job operations closed */
  }// condition closed

  }); // get job details closed

    return;
}

/* accept and pay job end */


/* View Job Start */

job.prototype.view_job = function(req,res,next){
    var schema = {
      'id':{
        notEmpty:true,
        errorMessage:'this field is required'
      }
   };
   req.checkParams(schema);
   backURL = req.header('Referer') || req.headers.referrer || req.headers.referer || '/dashboard';
   errors = req.validationErrors();

   if(errors){
     return res.redirect(backURL);
   }



   var job_id = req.body.id || req.query.id || req.headers['id'] || req.params.id;
   tomodel.user_id = req.session.user_id;
   tomodel.user_type = req.session.user_type;
   tomodel.job_id = job_id;
   /* get job and business list */
   var user_type = req.session.user_type;


   model.getJobDetailsById(tomodel,function(err,rows){
     if(err) return next(err);
     if(rows.length > 0){
        if(req.session.user_type==1){
          model.fetchUserDetails(tomodel.user_id,function(err1,rows1){
            if(err) return next(err);
            return res.render('dashboard/view_job',{job_data:rows,aws_path:config.get('tpay.aws.path'),bank_details:rows1});
          });

        }else{
          bank_details = new Array();
          model.fetchBusinessUserDetails(tomodel.user_id,function(err1,rows1){
            if(err1) return next(err1);
            return res.render('dashboard/view_job',{job_data:rows,aws_path:config.get('tpay.aws.path'),bank_details:rows1});
          });
          // return res.render('dashboard/view_job',{job_data:rows,aws_path:config.get('tpay.aws.path'),bank_details:bank_details});
        }

     }else{

       return res.redirect(backURL);
     }

   });
   return;

}

/* View Job End */

/* export csv start */

job.prototype.exportJobData = function(req,res,next){

  tomodel.user_id = req.session.user_id;
  tomodel.user_type = req.session.user_type;
  var param  = req.body.id || req.query.id || req.headers['id'] || req.params.id;
  var fields;
      if(param.toLowerCase()==='open' || param.toLowerCase()==='active' || param.toLowerCase()==='dispute' || param.toLowerCase()==='closed' || param.toLowerCase()==='drafts' || param.toLowerCase()==='all'){
        if(req.session.user_type==0){
          if(param.toLowerCase()=='open'){
            job_param = 1;
            fields = ['DATE_CREATED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_VALUE','EMAIL_ADDRESS','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='active'){
            job_param = 2;
            fields = ['DATE_ACCEPTED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_VALUE','EMAIL_ADDRESS','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='dispute'){
            job_param = 3;
            fields = ['DATE_RAISED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_VALUE','EMAIL_ADDRESS','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='closed'){
            job_param = 4;
            fields = ['DATE_CREATED','DATE_CLOSED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_VALUE','EMAIL_ADDRESS','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='drafts'){
            job_param = 0;
            fields = ['DATE_CREATED','JOB_ID'];
          }else{
            fields = ['DATE_CREATED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_VALUE','EMAIL_ADDRESS','PHONE_NUMBER','STATUS'];
            job_param = 5;
          }
        }else{
          if(param.toLowerCase()=='open'){
            job_param = 1;
            fields = ['DATE_CREATED','BUSINESS_NAME','JOB_ID','INVOICE_NUMBER','JOB_COST','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='active'){
            job_param = 2;
            fields = ['DATE_ACCEPTED','BUSINESS_NAME','JOB_ID','INVOICE_NUMBER','JOB_COST','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='dispute'){
            job_param = 3;
            fields = ['DATE_RAISED','BUSINESS_NAME','JOB_ID','INVOICE_NUMBER','JOB_COST','PHONE_NUMBER','STATUS'];
          }else if(param.toLowerCase()==='closed'){
            job_param = 4;
            fields = ['DATE_CREATED','DATE_CLOSED','CUSTOMER_NAME','JOB_ID','INVOICE_NUMBER','JOB_COST','PHONE_NUMBER','STATUS'];
          }else{
            fields = ['DATE_CREATED','BUSINESS_NAME','JOB_ID','INVOICE_NUMBER','JOB_COST','PHONE_NUMBER','STATUS'];
            job_param = 5;
          }
        }

      }else{
        job_param = 5;
      }
  tomodel.job_type = job_param;
  var newd = moment().format('YYYY-MM-DD HH:mm:ss');
  model.getExportJobData(tomodel,function(err,rows){
    if(err) return next(err);
    var csv = json2csv({ data: rows, fields: fields });
    res.attachment('jobs_'+newd+'.csv');
    res.status(200).send(csv);
  });

  return;


}


/* export csv end */








/* Apply Job Operation start */

job.prototype.apply_job_operations = function(req,res,next){

  /* validation start */
  var schema = {
     'comment': {
        in: 'body',
        notEmpty: {
          errorMessage:req.body.error_msg
        }
      },
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },
      'status':{
        in:'body',
        notEmpty:{
          errorMessage:"This Field is Required"
        }
      }

    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.my_id = req.session.user_id;
    tomodel.status = req.body.status;
    tomodel.comment = req.body.comment;
    tomodel.user_type = req.session.user_type;
    var subject,message,error_mssg,type,sub1;



    /*
    ==> for dispute case
    1. update job status to dispute
    2. update raised status by user
    3. insert dispute comment
    4. send mail for dispute to other user
    */

  /* validation end */
  if(parseInt(req.body.status)==3 || parseInt(req.body.status)==6){
    // decline and dispute start

    if(parseInt(req.body.status)===3){
      subject = req.session.user_name+' has raised a dispute in relation to Job';
      sub1 = 'Dispute raised';
      message  = req.session.user_name+' has raised a dispute in relation to Job '+tomodel.job_id;
      error_mssg = 'Problem in Dispute of Job';
      type = 4;
    }else if(parseInt(req.body.status)===6){
      subject = req.session.user_name+' has rejected your quote for Job';
      message  = req.session.user_name+'  has rejected your quote for Job '+tomodel.job_id;
      error_mssg = 'Problem in Declining Job';
      sub1 = 'Job declined';
      type = 2;
    }
    model.getUserDetailsByJobId(tomodel,function(err4,rows4){
      if(err4) return next(err4);

    if(rows4[0].status===5){
      if(tomodel.user_type===0){
          return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Job declined by customer'}});
      }else{
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Job canceled by business user'}});
      }

    }else if(rows4[0].status===7){
      return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Job canceled and amount refunded by business user'}});
    }else if(rows4[0].status===3){
      if(tomodel.user_type===0){
          return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'dispute raised by customer'}});
      }else{
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'dispute raised by business user'}});
      }
    }else{

    async.parallel([
            function(callback){
              // point 1 and 2
              model.updateJobStatus(tomodel,function(err1,row1){
                callback(err1,row1);
              });
            },
            function(callback) {
              // point 3
              model.insertJobComment(tomodel,function(err2,row2){
                       callback(err2,row2);
                     });
            }
        ],
        // optional callback
        function(err, results) {

          if(err){
             req.flash('error',error_mssg);
             return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:error_mssg}});
          }else{
            /* send notification,mail for decline/ dispute job by business user start */
            if(parseInt(req.body.status)===6){
              // decline case
              if(rows4[0].notif_job_reject===1){
                sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
                io_method(rows4[0].id);
                insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
              }
            }else{
              sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
              io_method(rows4[0].id);
              insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
            }
            /* send notification,mail for decline/ dispute job by business user end */
            req.session.flash = new Array("success",sub1);
            return res.json({status:1,msg:subject});
          }


        });
      }// condition end
    });


    // decline and dispute end
  }else if(parseInt(req.body.status)===2){

    // end dispute case start
    subject = req.session.user_name+' has ended a dispute in relation to Job';
    message  = req.session.user_name+' has ended a dispute in relation to Job '+tomodel.job_id;
    error_mssg = 'Problem in End Dispute Job';
    type = 5; // end dispute type
    sub1 = 'dispute end and job reactive';

    async.parallel([
            function(callback){
              // point 1 and 2
              model.updateJobStatus(tomodel,function(err1,row1){
                callback(err1,row1);
              });
            },
            function(callback){
              model.deleteJobDisputeComment(tomodel,function(err2,row2){
                  callback(err2,row2);
              });
            },
            function(callback){
              // point 4
              model.getUserDetailsByJobId(tomodel,function(err4,rows4){
                if(err4) return next(err4);
                sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
                io_method(rows4[0].id);
                insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
                callback(err4,rows4);
              });
            }
        ],
        // optional callback
        function(err, results) {

          if(err){
             req.flash('error',error_mssg);
             return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:error_mssg}});
          }else{
             req.session.flash = new Array("success",subject);
             return res.json({status:1,msg:subject});
          }


        });

    // end dispute case end

  }else{
    // refund case
  model.getUserDetailsByJobId(tomodel,function(err4,rows4){
      if(err4) return next(err4);
      if(rows4[0].status===6){
        // declined case
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Job declined by customer'}});

      }else if(rows4[0].status===4){
        // closed and release case
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Amount released by customer'}});
      }else if(rows4[0].status===3){
        // dispute raise case
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Dispute raised by customer'}});
      }else{

        // condition start

    model.getJobPaymentDetailsById(tomodel,function(err,rows){
      if(err) return next(err);
      /*get charge id */
      if(rows.length > 0){


        /*refunding job start from stripe */
        stripe.refunds.create({
            charge: rows[0].charge_id
          }, function(err, refund) {
            // asynchronously called

            if(err) return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Problem in refunding job'}});
            /* async parallel query calls start*/
            async.parallel([
                    function(callback){
                      model.updateJobStatus(tomodel,function(err1,row1){
                        callback(err1,row1);
                      });
                    },
                    function(callback) {
                      // tomodel.status = 7;
                      model.insertJobComment(tomodel,function(err2,row2){
                               callback(err2,row2);
                             });
                    },
                    function(callback){
                      model.deleteJobPayments(tomodel,function(err3,row3){
                               callback(err3,row3);
                      });
                    }
                ],
                // optional callback
                function(err, results) {
                  if(err){
                     req.flash('error','Problam in refunding job');
                     return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Problem in refunding job'}});
                  }else{
                    subject = req.session.user_name+' has cancelled and refunded Job';
                    message  = req.session.user_name+'  has cancelled and refunded Job '+tomodel.job_id;
                    type = 11; // refund job type
                    sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
                    io_method(rows4[0].id);
                    insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
                     req.session.flash = new Array("success","Job Closed and amount refunded to customer");
                     return res.json({status:1,msg:"Job Refunded"});
                  }


                });

                /* async parallel query calls end */

          });
        /*refunding job end from stripe */


      }else{
        req.flash('error','Problam in refunding job');
        return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Problem in refunding job'}});
      }


    });

    /// refund case end
  }// condition end
    });
  }


  return;
}


/* apply job operations closed */

/* Job Request and Release Fund Start */
job.prototype.release_job_funds = function(req,res,next){
  var schema = {
     'account_id': {
        in: 'body',
        notEmpty: {
          errorMessage:'Please select an account for deposit of funds.'
        }
      },
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },
      'release_state':{
        in:'body',
        notEmpty:{
          errorMessage:"This Field is Required"
        }
      }

    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }

    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.my_id = req.session.user_id;
    tomodel.user_id = req.session.user_id;
    tomodel.release_state = req.body.release_state;
    tomodel.account_id = req.body.account_id;
    tomodel.user_type = req.session.user_type;

    if(parseInt(tomodel.release_state)==1){
      // send request fund request
      model.getUserDetailsByJobId(tomodel,function(err4,rows4){
        if(err4) return next(err4);
        if(rows4[0].status===4){
          return res.json({ status: 0,param:'account_id','check':0 ,messages:{param:'account_id',msg:'amount release by customer'}});
        }else{
          tomodel.status = 2;
          model.updateReleaseFundJobStatus(tomodel,function(err1,row1){
            if(err1){
               req.flash('error','Prolmem in sending Request');
               return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Prolmem in sending Request'}});
            }else{
              if(rows4[0].notif_fund_relese===1){
                type = 7; // request for release funds
                subject = req.session.user_name+' has requested funds from Job';
                message = req.session.user_name+' has requested funds from Job '+tomodel.job_id+' be released.';
                sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
                io_method(rows4[0].id);
                insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
              }
               req.session.flash = new Array("success",'Request for release fund sent');
               return res.json({status:1,msg:'Request sent'});
            }

          });


        } // condition closed
        });

    }else{
      // release request fund

      /*
      1. update job to closed
      2. remove account_id = 0
      3. release state = 2
      4. insert amount transfer from stripe
      5. send mail to user if notif setting on

      */
      model.getUserDetailsByJobId(tomodel,function(err4,rows4){
        if(err4) return next(err4);
        if(rows4[0].status===5){
          // cancel msg
          return res.json({ status: 0,param:'account_id','check':0 ,messages:{param:'account_id',msg:'Job canceled by business user'}});

        }else if(rows4[0].status===7){
          // refund msg
          return res.json({ status: 0,param:'account_id','check':0 ,messages:{param:'account_id',msg:'Job canceled and amount refund by business user'}});
        }else if(rows4[0].status===3){
          // dispute msg
          return res.json({ status: 0,param:'account_id','check':0 ,messages:{param:'account_id',msg:'dispute raised by business user'}});
        }else{

      async.parallel([
              function(callback){
                // point 1 and 2
                tomodel.status = 4;
                model.updateReleaseFundJobStatus(tomodel,function(err1,row1){
                  callback(err1,row1);
                });
              },
              function(callback){
                tomodel.charge_id = 'test_id';
                tomodel.type = 1;
                model.insertReleaseFundPaymentsDetails(tomodel,function(err1,row1){
                  callback(err1,row1);
                });
              }
          ],
          // optional callback
          function(err, results) {
            if(err){
               req.flash('error','Prolmem in authorisation');
               return res.json({ status: 0,param:'comment','check':0 ,messages:{param:'comment',msg:'Prolmem in authorisation'}});
            }else{
              /* notification for release of fund start */
              if(rows4[0].notif_fund_approved===1){
                type = 6; // release funds from escrow account
                subject = req.session.user_name+' has approved release of funds for Job';
                message = req.session.user_name+' has approved release of funds for Job '+tomodel.job_id;
                sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
                io_method(rows4[0].id);
                insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
              }
              /* notification for release of fund end */
               req.session.flash = new Array("success",'Authorise release funds');
               return res.json({status:1,msg:'Authorise Release Funds'});
            }

          }); // async callback closed
        }// condition closed
      }); // get job details closed

    }




}
/* Job Request and Release Fund End   */


/* insert rating module for job start */

job.prototype.rating_given = function(req,res,next){
  /*validation start */
  var schema = {
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        },
      'comment':{
        in:'body',
        notEmpty:{
          errorMessage:"This Field is Required"
        }
      },
      'rating_given':{
        in:'body',
        notEmpty:{
          errorMessage:"This Field is Required"
        }
      },
      'mode':{
        in:'body',
        notEmpty:{
          errorMessage:"This Field is Required"
        }
      },
    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    if( typeof req.body.radio1 !== 'undefined' ) { tomodel.radio1 =  req.body.radio1 }else{ tomodel.radio1 = 0; }
    if( typeof req.body.radio2 !== 'undefined' ) { tomodel.radio2 =  req.body.radio2 }else{ tomodel.radio2 = 0; }
    if( typeof req.body.radio3 !== 'undefined' ) { tomodel.radio3 =  req.body.radio3 }else{ tomodel.radio3 = 0; }
    if( typeof req.body.mode !== 'undefined' ) { tomodel.mode =  req.body.mode }else{ tomodel.mode = 'create'; }

    tomodel.my_id = req.session.user_id;
    tomodel.user_type = req.session.user_type;
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.comment = req.body.comment;
    tomodel.rating_given = req.body.rating_given;
    var subject = '';
    var message = '';
    var type = '';

  /*validation end */

  /* get job details by id and insert review comment */

  model.getUserDetailsByJobId(tomodel,function(err4,rows4){
    console.log(err4,rows4);
    if(err4) return next(err4);
    if(tomodel.mode==='create'){
        subject = req.session.user_name+' has left a review in relation to Job';
        message = req.session.user_name+' has left a review in relation to Job '+tomodel.job_id;
        type = 8; // review made
        if(parseInt(tomodel.user_type)===1){
            req.session.flash = new Array("success",'Authorise release funds and Review Given');
        }else{
            req.session.flash = new Array("success",'Review Given');
        }

        tomodel.type = 13;
        model.delete_notif(tomodel,function(err11,rows11){
            if(err11) return next(err11);
        });
    }else if(tomodel.mode==='edit'){
        subject = req.session.user_name+' has edited a review in relation to Job';
        message = req.session.user_name+' has edited a review in relation to Job '+tomodel.job_id;
        type = 9; //review edit type
        req.session.flash = new Array("success",'Review edited');
    }

    if(rows4.length > 0){

      tomodel.user_id = rows4[0].id;
      model.insertReview(tomodel,function(err,rows){
        if(err) return next(err);

        if(rows4[0].notif_review_made===1){
          sendMail(rows4[0].email,rows4[0].name,subject,message,req,res,next);
          io_method(rows4[0].id);
          insert_notification(tomodel.my_id,rows4[0].id,tomodel.id,tomodel.job_id,type,next);
        }
        return res.json({status:1,msg:'Authorise release funds and Review Given'});
      });
    }

  });
  return;
}

job.prototype.getReviewDetails = function(req,res,next){
  var schema = {
      'id': {
         in: 'body',
         notEmpty: {
           errorMessage:"This field is required"
         }
       },
       'job_id': {
          in: 'body',
          notEmpty: {
            errorMessage:"This field is required"
          }
        }
    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if(errors){
      return res.json({ status: 0, messages: errors[0] });
    }
    tomodel.my_id = req.session.user_id;
    tomodel.user_type = req.session.user_type;
    tomodel.id = req.body.id;
    tomodel.job_id = req.body.job_id;
    tomodel.user_id = req.body.user_id;


    model.getReviewDetails(tomodel,function(err,rows){
      if(err) return next(err);
      if(rows.length > 0 ){
          return res.json({status:1,msg:'review details',review_data:rows});
      }else{
          return res.json({status:1,msg:'review details',review_data:[]});
      }

    });
    return;

}


/* insert rating module for job end */



module.exports = new job();
