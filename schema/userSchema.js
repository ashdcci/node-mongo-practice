db = require('../config/db');
moment = require('moment');
var Schema = db.Schema;



var userSchema = new Schema({
  first_name:  String,
  last_name: String,
  email:   { type: String,required: true, index: { unique: true }},
  password: String,
  access_token: String,
  stripe_customer_id:String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  deleted_at: { type: String, default: null },
  is_deleted: { type:Number, default:0}
});
userSchema.index({ email: 1, _id: -1 });



var PasswordResetSchema = new Schema({
  email: { type: String,required: true, index: { unique: false }},
  token: {type: String,required: true},
  created_at: { type: Date,required: true, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  expired_at: { type: String,required: true, default: moment().format('YYYY-MM-DD HH:mm:ss') },
},{
  strict: true
})

PasswordResetSchema.index({ email: 1, _id: -1 });

var ProfileSchema = new Schema({
  user_id : { type: db.Schema.Types.ObjectId,required: true, index: { unique: false }},
  about: String,
  dob: String,
  gender:String,
  address: String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  deleted_at: { type: String, default: null }
})


var ImageSchema = new Schema({
  user_id : { type: db.Schema.Types.ObjectId,required: true, index: { unique: false }},
  filename: String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  deleted_at: { type: String, default: null }
})


var cardSchema = new Schema({
  user_id:{ type: db.Schema.Types.ObjectId,required: true, index: { unique: false }},
  card_id:String,
  customer_id:String,
  last_four: String,
  created_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') },
  updated_at: { type: Date, default: moment().format('YYYY-MM-DD HH:mm:ss') }
})


module.exports = {
  userSchema:userSchema,
  PasswordResetSchema:PasswordResetSchema,
  ProfileSchema:ProfileSchema,
  ImageSchema:ImageSchema,
  cardSchema: cardSchema
}
