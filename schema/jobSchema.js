db = require('../config/db');
moment = require('moment');
var Schema = db.Schema;



var jobSchema = new Schema({
  job_id:  { type: String,required: true, index: { unique: true }},
  business_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  customer_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  invoice_no:{ type: String,required: true, index: { unique: true }},
  site_address:String,
  payment_date: Date,
  job_value: String,
  app_fee_value: { type:Number, enum : [0,10],default: 10},
  total_job_value: { type:Number, default:0},
  app_fees:{ type:Number, default:0},
  dispute_by:Number,
  resolve_dispute:{ type:Number, default:0},
  fill_job:{ type:Number, default:0},
  status:{ type: Number,enum : [0,1,2,3,4,5,6],default: 1},
  isDeleted: { type: Number,enum : [0,1],default: 0},
  fund_status: {type:Number,enum:[0,1,2],default:0},
  fund_request_id:{type:Number},
  stripe_actualtransfer:{type:Number,enum:[0,1],default:0},
  draft_status:{type:Number,enum:[0,1],default:0},
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  accepted_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  raised_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  closed_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
});
jobSchema.index({_id: -1 });



jobDetailsSchema = new Schema({
  job_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  job_note:String,
  name:String,
  email:String,
  phone:String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
})


jobAttachmantSchema = new Schema({
  job_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  filename:String,
  original_name:String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
})

jobCommentSchema = new Schema({
  job_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  user_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  job_status:{ type: Number,enum : [0,1,2,3,4,5,6],default: 1},
  comment:String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
})

jobPaymentSchema = new Schema({
  job_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  user_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: true }},
  charge_id: String,
  type:{ type: Number,default: 0},
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
})

jobDetailsSchema.index({_id: -1,job_id:1 });
jobAttachmantSchema.index({_id: -1,job_id:1 });
jobCommentSchema.index({_id: -1,job_id:1 });
jobPaymentSchema.index({_id: -1,job_id:1 });

module.exports = {
  jobSchema:jobSchema,
  jobDetailsSchema:jobDetailsSchema.
  jobAttachmantSchema:jobAttachmantSchema,
  jobCommentSchema:jobCommentSchema
  jobPaymentSchema:jobPaymentSchema
}
