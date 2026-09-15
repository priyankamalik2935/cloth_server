import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
      profile_img:{type:object},
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    gender: {type: String,  enum:['Male', 'Female', 'Other'], required: true},
role: {type: String, enum:['Admin', 'User'], required: true},
    email: {type: String,required: true,unique: true },
    password: {type: String,required: true }
    is_active: {type: Boolean, required: true},
    is_deleted: {type: Boolean, required: true},
    verification:{
      user{
            is_verified: {type: Boolean},
            is_expired_time: {type: Number},
            is_expired_otp: {type:Boolean},
            otp_atttempts: {type:Number,degfault:3},
            lock_time: {type: Number},
      }
      admin:{

      }
    }
    order_list: [{type: mongoose.Schema.Types.ObjectId, ref: 'Order'}],
    cart_list: [{type: mongoose.Schema.Types.ObjectId, ref: 'Cart'}],
    address_list: [{type: Array, required: true}],
    is_address_list:{type: Boolean, default: false}
}
{timestamps: true});
export default mongoose.model('User', userSchema);