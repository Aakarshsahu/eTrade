var mongoose = require("mongoose")

var subscriptionSchema = new mongoose.Schema({
    email:String
},{
    timestamps:true
})
module.exports = mongoose.model("subscription" , subscriptionSchema);
