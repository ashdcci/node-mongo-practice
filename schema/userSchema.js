db = require('../config/db');
var Schema = db.Schema;

var userSchema = new Schema({
  first_name:  String,
  last_name: String,
  email:   { type: String,required: true, index: { unique: true }},
  password: String,
  access_token: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: String, default: null },
  is_deleted: {type:Boolean, default:null}
});
userSchema.index({ email: 1, _id: -1 });

module.exports = userSchema
