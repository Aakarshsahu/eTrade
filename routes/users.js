var mongoose = require("mongoose")
var passportLocalMongoose = require("passport-local-mongoose")
mongoose.connect("mongodb+srv://aakarshsshu2:Aakarsh1437@cluster0.moy0ws9.mongodb.net/etrad?retryWrites=true&w=majority")
.then(()=>{
  console.log("Database connected")
}).catch((err)=>{
  console.log(err)
})

// mongoose.connect("mongodb://127.0.0.1:27017/etrade",{useNewUrlParser: true,useUnifiedTopology: true})
// .then(()=>{
//   console.log("Database connected")
// }).catch((err)=>{
//   console.log(err)
// })
var userSchema = new mongoose.Schema({
  username:{
    type:String,
    require:true,
    unique: true
  },
  fullname:{
    type:String,
    require:true
  },
  gender:String,
  password:{
    type:String,
  },
  photo:{
    type:String,
    require:false
  },
  mobilenumber:{
    type:String,
  },
  address:{
    type:Array,
    default:[]
  },
  expiringtime:String,
  otp:String,
  review:[{ type:mongoose.Schema.Types.ObjectId,ref:"review"}],
  wishlist:[{ type:mongoose.Schema.Types.ObjectId,ref:"product"}],
  cart:[{ type:mongoose.Schema.Types.ObjectId,ref:"product"}],
  buyed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'order' }]

},{
 timestamps: true 
})

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("user", userSchema);
