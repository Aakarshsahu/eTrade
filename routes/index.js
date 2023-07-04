var express = require('express');
var router = express.Router();
var passport = require("passport")
var path = require("path")
var crypto = require("crypto")
var userModel = require("./users.js")
var orderModel = require("./orders.js")
var productModel = require("./product.js")
var reviewModel = require("./review.js")
var subsModel = require("./subscription.js")
const nodemailer = require('../nodemailer.js');
const Razorpay = require('razorpay');
// var ImageKit = require("imagekit");
var multer = require("multer")
require('dotenv').config()
var LocalStrategy = require('passport-local');
var GoogleStrategy = require('passport-google-oidc');
passport.use(new LocalStrategy(userModel.authenticate()));

// ---------------------------------
router.get('/login/federated/google', passport.authenticate('google'));

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/oauth2/redirect/google',
  scope: [ 'email','profile' ]
 }, function verify(issuer, profile, cb) {
 userModel.findOne({username:profile.emails[0].value}).then(function(user){
  if(user){
    return cb(null,user)
  }else{
    var data = new userModel({
      username:profile.emails[0].value,
      fullname:profile.displayName
     })
     userModel.register(data, "1234").then(function(newuser){
      return cb(null,newuser)
     })
  }
 })
}));
router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// ----------------------------------------------------------

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/images/uploads')
//   },
//   filename: function (req, file, cb) {
//    crypto.randomBytes(13, function(err,buffer){
//   var fn =  buffer.toString("hex") + path.extname(file.originalname);
//   cb(null, fn)
//    })
//   }
// })

// const upload = multer({ storage :storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
//       cb(null, true);
//     } else {
//       cb(null, false);
//       return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
//     }
//   }
//  });

//  -------------------
var instance = new Razorpay({
  key_id: 'rzp_test_kNNGbyOiNhCZYG',
  key_secret: 'gyCm1M4HZSoAZRBAj2MquIut',
});
router.post('/create/orderId/:price',function(req,res){
  var options = {
    amount: req.params.price * 100,  // amount in the smallest currency unit
    currency: "INR",
    receipt: "order_rcptid_11"
  };
  instance.orders.create(options, function(err, order) {
    // console.log(order);
    if(err){
      throw err
    }else{
      res.send(order);
    }
  });
})
router.post("/api/payment/verify",(req,res)=>{

  let body=req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;
 
   var crypto = require("crypto");
   var expectedSignature = crypto.createHmac('sha256', 'gyCm1M4HZSoAZRBAj2MquIut')
        .update(body.toString())
        .digest('hex');
      //  console.log("sig received " ,req.body.response.razorpay_signature);
      //  console.log("sig generated " ,expectedSignature);
   var response = {"signatureIsValid":"false"}
   if(expectedSignature === req.body.response.razorpay_signature)
    response={"signatureIsValid":"true"}
       res.send(response);
});

// -----------------------------------
router.get("/check/:username",async function(req,res){
  var user = await userModel.findOne({$or:[{"username":req.params.username},{"mobilenumber":req.params.username}]})
 res.json(user)
 })
/* GET home page. */
router.get('/', function(req, res, next) {
  productModel.find().then(function(product){
      res.render('index', {user: req.user, isLoggedIn: req.isLogged ,product ,title:"home"});
  })
});

router.get('/contact', function(req, res, next) {
  res.render('contact', {user: req.user, isLoggedIn: req.isLogged ,title:"contact"});
});

router.post("/subscribe",async function(req,res){
   var subs = await subsModel.create({
      email:req.body.newsletter
    })
    res.redirect("back")
})

router.get('/about', function(req, res, next) {
  res.render('about', {user: req.user, isLoggedIn: req.isLogged ,title:"about"});
});
router.get('/policy', function(req, res, next) {
  res.render('policy', {user: req.user, isLoggedIn: req.isLogged ,title:"policy"});
});
// --------------------
router.get("/order",isLoggedin,function(req,res,next){
  userModel.findOne({username:req.session.passport.user})
  .populate([{
    path:"buyed",
    populate:{
      path:"productid"
    }
  }
]).then(function(loginuser){
      res.render('order', {user: req.user,title:"orders" ,loginuser});
  })
})

router.get("/deleteorder/:orderid/:productid",async function(req,res){
  var user =await userModel.findOne({username:req.session.passport.user})
  var product = await productModel.findOne({_id:req.params.productid})
  var order = await orderModel.findOne({_id:req.params.orderid})
  // product.orderId.splice(product.orderId.indexOf(req.params.productid),1)
  // user.buyed.splice(user.buyed.indexOf(req.params.orderid),1)
  order.deliverystatus="Cancled"
  // await user.save()
  // await product.save()
  await order.save()
  var email = "codecrushers01@gmail.com";
  var html = ` <p><h5>ORDER ID : ${req.params.orderid}</h5> 
    <h3>product : ${product.productname}</h3>
    <h3>price: ${product.price}</h3>
    has been cencled.
  </p>`;
  var subject = "order cencle"
  // -------
  nodemailer(email,subject,html).then(function(){
    res.redirect("back")
  })
})


// ------------------------------
router.get('/account',isLoggedin, function(req, res, next) {
  userModel.findOne({username:req.session.passport.user}).then(function(loginuser){
    res.render('myaccount', {user: req.user, isLoggedIn: req.isLogged,title:"account" ,loginuser});
})});

router.get('/login', isLoggedout,function(req, res, next) {
  res.render('login', {user: req.user, isLoggedIn: req.isLogged,title:"login"});
});

router.get('/checkout/:id',isLoggedin,async function(req, res) {
  var product =await productModel.findOne({_id:req.params.id})
    res.render('checkout', {user: req.user,title:"checkout" ,product});

});

router.get('/cart',isLoggedin, function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .populate({
    path:"cart",
    populate: {
      path: "userid" // in blogs, populate comments
  }
  })
  .then(async function(loginuser){
    const carts = await productModel.find({_id:loginuser.cart});
    // Sum up the cart prices using the reduce method
    const totalPrice = carts.reduce((acc, cart) => acc + cart.currentprice, 0);
    res.render('cart', {user: req.user, isLoggedIn: req.isLogged,title:"cart" ,loginuser,totalPrice});
  })

});

router.get("/wishlist/:id",isLoggedin,function(req,res,next){
  userModel.findOne({username:req.session.passport.user}).then(function(loginuser){
    if (loginuser.wishlist.indexOf(req.params.id) == -1) {
      loginuser.wishlist.push(req.params.id)
    }else{
      loginuser.wishlist.splice(loginuser.wishlist.indexOf(req.params.id),1)
    }
    loginuser.save().then(function(){
      res.redirect("back")
    })
  })
})
router.get("/cart/:id",isLoggedin,function(req,res,next){
  userModel.findOne({username:req.session.passport.user}).then(function(loginuser){
    if (loginuser.cart.indexOf(req.params.id) == -1) {
      loginuser.cart.push(req.params.id)
    }else{
      loginuser.cart.splice(loginuser.cart.indexOf(req.params.id),1)
    }
    loginuser.save().then(function(){
      res.redirect("back")
    })
  })
})


router.post("/buy/:id",isLoggedin,async function(req,res,next){
  var loginuser = await userModel.findOne({username:req.session.passport.user})
  var product = await productModel.findOne({_id:req.params.id})
  var address = {
    username:req.body.username,
    street:req.body.flateno,
    landmark:req.body.landmark,
    town:req.body.town,
    state:req.body.state,
    country:req.body.country,
    pincode:req.body.pincode,
    number:req.body.number,
    notes:req.body.notes
  }
    orderModel.create({
    price:product.currentprice,
    paymentmode:req.body.payment,
    productid:req.params.id,
    userid:loginuser._id
  }).then(async function(order){
    var x =Math.random().toString().substr(2, 6); //6digit otp
    if(req.body.payment === "cod"){
      order.paymentstatus ="Pending"
    }else{
      order.paymentstatus ="Success"
    }
    order.deliverystatus ="approved"
    order.userotp =x
    product.orderId.push(order._id)
    order.address.push(address)
    loginuser.buyed.push(order._id)
    await order.save()
    await product.save()
    await loginuser.save()
    var email = loginuser.username;
    var html = `<p><strong>congratulation your order with </strong> <h4>ORDER ID : ${order._id}</h4>
    <h3>product : ${product.productname}</h3>
    <h3> Price : ${product.price}</h3>
    has been confirmed. please note down otp <strong>${x}</strong>. <br> and confirm at the time of delivey <br><br> <strong>Thank you </strong>
    </p> `;
    var subject = "order confirmation"
    // -------
    nodemailer(email,subject,html).then(function(){
      res.redirect("/order")
    })

  })
})

router.post("/cartbuy",isLoggedin,async function(req,res){
  var loginuser = await userModel.findOne({username:req.session.passport.user})
  var address = {
    username:req.body.username,
    street:req.body.street,
    landmark:req.body.landmark,
    town:req.body.town,
    state:req.body.state,
    country:req.body.country,
    pincode:req.body.pincode,
    number:req.body.number,
    notes:req.body.notes
  }
  var product = await productModel.find({_id:req.body['productid[]']})
  try{
    const productid = req.body['productid[]']
    const productprice = req.body['price[]']
    for (let i = 0; i < productid.length; i++) {
    var order = await orderModel.create({
     price:productprice[i],
    paymentmode:req.body.payment,
    productid:productid[i],
    userid:loginuser._id,
    address:address,
    deliverystatus:"approved"
    })
    if(req.body.payment === "cod"){
      order.paymentstatus ="Pending"
    }else{
      order.paymentstatus ="Success"
    }

    loginuser.cart.splice(0,loginuser.cart.length)
    loginuser.buyed.push(order._id)
    await order.save()
    await loginuser.save()
  }
res.redirect("/order")
  }catch(err){
    res.send(err)
  }
})


router.get("/wishlist",isLoggedin,async function(req,res){
  var loginuser = await userModel.findOne({username:req.session.passport.user}).populate({
    path:"wishlist"
  })

  res.render('wishlist', {user: req.user, isLoggedIn: req.isLogged,title:"wishlist" ,loginuser})

})

router.get('/view/:id', function(req, res) {
  var id = req.params.id;
  productModel.findOne({_id:id})
  .populate({
    path:"reviewid",
    populate:{
      path:"userid"
    }
  })
  .then(function(product){
    res.render('productview', {user: req.user,title:"view" ,product});
    // res.send(product)
  })
});

router.get('/shop',async function(req, res, next) {
  var search = await productModel.find()
  var product = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})

    res.render('shop', {user: req.user, isLoggedIn: req.isLogged ,headphone,accessories,search, smartphone,laptop,computer ,product,title:"shop"});
});

router.get('/shop/low-to-high',async function(req, res, next) {
  var search = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find().sort({price:1})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
  res.render('shop', {user: req.user, isLoggedIn: req.isLogged,headphone,accessories ,search,smartphone,laptop,computer,product,title:"low to high"});
});

router.get('/shop/high-to-low',async function(req, res, next) {
    var search = await productModel.find()
    var headphone = await productModel.find({category:"headphone"})
    var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find().sort({price:-1})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
  res.render('shop', {user: req.user, isLoggedIn: req.isLogged,headphone,accessories,smartphone,search,laptop,computer ,product,title:"high to low"});
});

router.get('/shop/accessories',async function(req, res, next) {
  var search = await productModel.find()

  var product = await productModel.find({category:"accessories"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged,search ,headphone,accessories,smartphone,laptop,computer,product,title:"smartphones"});
});
router.get('/shop/headphone',async function(req, res, next) {
  var search = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find({category:"headphone"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged,search,headphone,accessories ,smartphone,laptop,computer,product,title:"headphone"});
});
router.get('/shop/smartphone',async function(req, res, next) {
  var search = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find({category:"smartphone"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged,search,headphone,accessories ,smartphone,laptop,computer,product,title:"Accessories"});
});

router.get('/shop/laptop',async function(req, res, next) {
  var search = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find({category:"laptop"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged,search,headphone,accessories ,smartphone,laptop,computer,product,title:"laptops"});
});

router.get('/shop/computer',async function(req, res, next) {
  var search = await productModel.find()
  var headphone = await productModel.find({category:"headphone"})
  var accessories = await productModel.find({category:"assorries"})
  var product = await productModel.find({category:"computer"})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged,search ,headphone,accessories,smartphone,laptop,computer,product,title:"computers"});
});
// ------------------------security----------------

router.get('/forget', isLoggedout,function(req, res, next) {
  res.render('forget', {user: req.user, isLoggedIn: req.isLogged,title:"forget"});
});

router.post("/forget",async function(req,res){
  var user1 = await userModel.findOne({$or:[{"mobilenumber":req.body.username},{"username":req.body.username}]})
  if(user1){
    var x =Math.random().toString().substr(2, 6); //6digit otp
    user1.otp = x;
    user1.expiringtime = Date.now() + 300000;  //5mint
    await user1.save()
    // --------nodemailer file
    var email = user1.username;
    var subject = "password change request"
    var html = ` <p>  Please fill the following otp to reset your password.</p><h2> ${x} </h2>
    this link is valid only for 5 minuts.
    If you did not request this, please ignore this email and your password will remain unchanged. `;
    
    // -------
    
    nodemailer(email,subject,html).then(function(){
      res.render("otpform",{user1,user: req.user, isLoggedIn: req.isLogged ,title:"reset password"})
    })
  }else{
    res.render("error",{message:"The Given UserName Was Invalid" ,error:"User Not Found"})

  }
})

router.post("/forget/:id",async function(req,res){
  var user = await userModel.findOne({_id:req.params.id})
  if(user.otp !== req.body.otp){
    res.render("error",{message:"The Given Otp Was Not Matched Try Again.",error:"Otp Not Matched" })

  }else if(user.expiringtime > Date.now()){
    user.setPassword(req.body.password, function(){
      user.expiringtime=null
      user.otp =null
      user.save();
      res.redirect('/login')
    });
  }else{
    res.render("error",{message:"The Given Otp Has Been Expired Try Again.",error:"Otp Expired" })

  }
})
// ------------------------------------------------
router.post("/search",async function(req,res){
  var search = await productModel.find()

  var product = await productModel.find({$or:[{"productname":req.body.search},{"brand":req.body.search},{"category":req.body.search}]})
  var smartphone = await productModel.find({category:"smartphone"})
  var laptop = await productModel.find({category:"laptop"})
  var computer = await productModel.find({category:"computer"})
    res.render('shop', {user: req.user, isLoggedIn: req.isLogged ,search,smartphone,laptop,computer ,product,title:"search"});

})
// ----------------------update------------------------------


//=========================storage Aakarsh Sahu===========================================//

const { S3Client, GetObjectCommand,PutObjectCommand } = require('@aws-sdk/client-s3');
const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");

const multerS3 = require('multer-s3');



// AWS SDK configuration
const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

// Multer middleware for handling file uploads
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: 'kranti2023',
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `uploads/user-uploads/${uniqueSuffix}.${file.originalname.split('.').pop()}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    
  }),
});

router.post("/updatephoto",upload.single('filename'),function(req,res){
  const imageUrl = `https://kranti2023.s3.ap-south-1.amazonaws.com/${req.file.key}`;
  userModel.findOneAndUpdate({username:req.session.passport.user},{photo:imageUrl}).then(function(){
    res.redirect("back")
  })
})

router.post("/updateuser",isLoggedin,function(req,res){
  userModel.findOneAndUpdate({username:req.session.passport.user},{fullname:req.body.fullname ,username:req.body.username , mobilenumber:req.body.number , gender:req.body.gender}).then(function(){
    res.redirect("back")
  })
})

router.post("/changepassword",isLoggedin,function(req,res){
  userModel.findOne({username:req.session.passport.user}).then(function(loginuser){
   
      loginuser.changePassword(req.body.oldpassword, 
        req.body.newpassword, function(err) {
        if (err) {
          res.render("error",{message:"Password Not Matched.",error:"Password Not Matched" })
        }else{
          res.redirect("back")
        }
    })
  })
})

router.get("/resendotp/:userid",async function(req,res) {
  var user = await userModel.findOne({_id:req.params.userid})
    var x =Math.random().toString().substr(2, 6); //6digit otp
    user.otp = x;
    user.expiringtime = Date.now() + 300000;  //5mint
    await user.save()
    // --------nodemailer file
    var email = user.username;
    var html = ` <p>  Please fill the following otp to reset your password.</p><h2> ${x} </h2>
    this link is valid only for 5 minuts.
    If you did not request this, please ignore this email and your password will remain unchanged `;
    var subject = "password change request"
    // -------
    nodemailer(email,subject,html).then(function(){
      res.json("otp sent")
    })
})
// ----------------------------------------
router.get("/deactivateotp",async function(req,res){
  var user =await userModel.findOne({username:req.session.passport.user})
  var x =Math.random().toString().substr(2, 6); //6digit otp
  user.expiringtime = Date.now() + 300000;  //5mint
  user.otp = x
  await user.save()
  var email = user.username
  var subject = "account deactivation request"
  var html =`<p> your account deactivaion otp is <strong>${x}</strong>
  kindly fill this otp to deactivate your account .if you are not requested for this please ignore this email and your account remain activated</p>`
  nodemailer(email,subject,html).then(function(){
    res.json(user)
  })
})

router.post("/deactivateaccount",async function(req,res){
  var loginuser = await userModel.findOne({username:req.session.passport.user})
    loginuser.authenticate(req.body.password,async function(err,model,passwordError){
        if(passwordError){
            res.json("password wrong")
        } else if(model) {
          var review = await reviewModel.deleteMany({userid:req.params.userid})
          var order = await orderModel.deleteMany({userid:req.params.userid})
          var user =await userModel.findOneAndDelete({username:req.session.passport.user})
          res.json("done")
        }
    })

 })
// -----------------------------

router.post("/login",function(req,res){
  if (!req.body.username) {
    res.redirect("back")
  }
  else if (!req.body.password) {
    res.redirect("back")}
  else {
    passport.authenticate("local", {
      successRedirect:'..',
      failureRedirect:'back',
    })(req, res);
}
})

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.post("/register",async function(req,res){

  var x =await userModel.findOne({$or:[{"username":req.body.username},{"mobilenumber":req.body.username}]})
  if(x){
    res.render("error",{message:"The Given UserName or Mobile Number was ALready In Use Please Try Another.",error:"User Found" })
  }else if(req.body.password !== req.body.confirmpassword){
    res.render("error",{message:"Password And Confirm Password Not Matched.",error:"Password Not Matched" })

  }else{
    var data = new userModel({
      username:req.body.username,
      fullname:req.body.fullname,
    })
      userModel.register(data,req.body.password).then(function(u){
        passport.authenticate('local')(req,res,function(){
          res.redirect("/")
        })
      })
  }
})

// ----------------------------------
router.post("/useraddress",isLoggedin,function(req,res){
  userModel.findOne({username:req.session.passport.user}).then(function(user){
    var address = {
      username:req.body.username,
      street:req.body.street,
      landmark:req.body.landmark,
      town:req.body.town,
      state:req.body.state,
      country:req.body.country,
      pincode:req.body.pincode,
      number:req.body.number
    }
    user.address.push(address)
    user.save().then(function(){
      res.redirect("back")
    })
  })
})

router.get("/addressdelete/:indexof",isLoggedin,function(req,res){
  userModel.findOne({username:req.session.passport.user}).then(function(user){
    user.address.splice(user.address.indexOf(req.params.indexof),1)
      user.save().then(function(){
      res.redirect("back")
    })
  })
})


// -------------------------------------
// router.get("/read",function(req,res){
//   userModel.find().then(function(user){
//     res.send(user)
//   })
// })

// router.get("/reado",function(req,res){
//   orderModel.find().then(function(user){
//     res.send(user)
//   })
// })

// router.get("/readr",function(req,res){
//   reviewModel.find().then(function(user){
//     res.send(user)
//   })
// })

// router.get("/readp",function(req,res){
//   productModel.find().then(function(user){
//     res.send(user)
//   })
// })

// -------------------------feedback----
router.get("/reviewdelete/:productid/:id",async function(req,res){
  var user = await userModel.findOne({username:req.session.passport.user})
 var review = await reviewModel.findOneAndDelete({_id:req.params.id})
 var product =await productModel.findOne({_id:req.params.productid})
 product.reviewid.splice(product.reviewid.indexOf(req.params.id),1)
 user.review.splice(user.review.indexOf(req.params.id),1)

await product.save()
await user.save()
res.redirect("back")
})

router.post("/review/:productid",isLoggedin,async function(req,res){
  var user = await userModel.findOne({username:req.session.passport.user})
  var product =await productModel.findOne({_id:req.params.productid})
  reviewModel.create({
    userid:user._id,
    productid:product._id,
    review:req.body.review
  }).then(async function(review){
    product.reviewid.push(review._id)
    user.review.push(review._id)
    await product.save()
    await user.save()
    res.redirect("back")
  })
  })

router.post("/message", function(req,res){
  var name = req.body.contact-name
  var number = req.body.contact-phone
  var email = req.body.contact-email
  var text = req.body.contact-message
  
    var email =  "codecrushers01@gmail.com";
    var html = `<h2>Name </h2> ${name}
    <h2>Phone :</h2> ${number}
    <h2>Email :</h2> ${email}
    <h2>Message :</h2> <p> ${text}</p>
    `;
    var subject = "customer request"
    // -------
    nodemailer(email,subject,html).then(function(){
      res.redirect("back")
    })
  })
  
// -------------------------------------
router.get("/orderotp/:orderid/:userid",async function(req,res) {
  var order = await orderModel.findOne({_id:req.params.orderid})
  var product = await productModel.findOne({_id:order.productid[0]})
 var user = await userModel.findOne({_id:req.params.userid})
    var x =Math.random().toString().substr(2, 6); //6digit otp
    order.userotp = x;
    await order.save()
    // --------nodemailer file
    var email = user.username;
    var html = ` <p>The verification otp for Your order </p><strong> ${order._id} </strong>
      <P> <strong>${product.productname }</strong>  <br> your otp is : <h2>${x}</h2></p>
    `;
    var subject = "order verification otp"
    // -------
    nodemailer(email,subject,html).then(function(){
      res.json("otp sent")
    })
})
router.get("/productdelete/:id",async function(req,res){
  var order = await orderModel.find({productid:req.params.id})
  var user = await userModel.find({buyed:order._id})
 
  await orderModel.deleteMany({productid:req.params.id})
  await productModel.findOneAndDelete({_id:req.params.id})
  res.redirect("back")
})
router.get('/sell', function(req, res, next) {
  productModel.find().then(function(product){
    res.render('sell', {user: req.user, isLoggedIn: req.isLogged,title:"sell" ,product});
  })
});


//=================================Aakarsh Sahu Storage code=================================================//


router.post("/sell",upload.single('filename'),function(req,res){

  const imageUrl = `https://kranti2023.s3.ap-south-1.amazonaws.com/${req.file.key}`;
  console.log(imageUrl);
    productModel.create({
      username:req.body.username,
      productname:req.body.productname,
      oldprice:req.body.oldprice,
      currentprice:req.body.currentprice,
      category:req.body.category,
      photo:imageUrl,
      brand:req.body.brand,
    }).then(function(product){
          res.redirect("back")
       })
})

router.get("/allproduct",function(req,res){
  productModel.find().then((products)=>{
    res.send(products);
  })
})

router.get("/sell/view/:id",function(req,res){
  orderModel.findOne({_id:req.params.id}).populate({
    path:"productid"
  }).then(function(product){
    res.render("sellview",{product})
  })
})

router.get("/orderlist",async function(req,res){
var orderlist = await orderModel.find({deliverystatus:"approved"}).populate({path:"productid"})
var deliverdlist = await orderModel.find({deliverystatus:"deliverd"}).populate({path:"productid"})
res.render("orderlist",{orderlist ,deliverdlist})
})
router.post("/userverify/:orderid/:userid/:productid",async function(req,res){
  var user = await userModel.findOne({_id:req.params.userid})
  var order = await orderModel.findOne({_id:req.params.orderid})
  var product = await productModel.findOne({_id:req.params.productid})
  if (order.userotp === req.body.orderotp) {
    order.deliverystatus ="deliverd";
    order.paymentstatus ="Success"
    await order.save()
    res.redirect("/orderlist")
  }else{
    res.render("error",{message:"The Given Otp Was Not Matched Try Again.",error:"Otp Not Matched" })
  }
})

// -----------------midelware-------------------



function isLoggedin(req,res,next){
  if(req.isAuthenticated()){
    req.isLogged = true
    return next();
  }else{
    res.redirect("/login")
  }
}

function isLoggedout(req,res,next){
  if(req.isAuthenticated() == false){
    return next();
  }else{
    res.redirect("/")
  }
}



module.exports = router;
