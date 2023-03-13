const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Message = mongoose.model("Message");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");


require("dotenv").config();

const nodemailer = require("nodemailer");

async function mailer(recieveremail, code) {
  // console.log('mailer function called')
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.NodeMailer_email, // generated ethereal user
      pass: process.env.NodeMailer_password, // generated ethereal password
    },
  });

  let info = await transporter.sendMail({
    from: "GeekChat Vinayak",
    to: `${recieveremail}`,
    subject: `Email Verification Code is ${code}`,
    text: `Your Verification Code is ${code}`, // plain text body
    html: `<b> Your Verification Code is ${code} </b>`,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL : %s", nodemailer.getTestMessageUrl(info));
}

router.post("/verify", (req, res) => {
  // console.log(req.body);
  const { email } = req.body;

  if (!email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  // else{
  User.findOne({ email: email }).then(async (savedUser) => {
    // console.log(savedUser);
    // return res.status(200).json({message:'Email sent'});
    if (savedUser) {
      return res.status(422).json({ error: "Invalid Credentials" });
    }
    try {
      let VerificationCode = Math.floor(100000 + Math.random() * 900000);
      await mailer(email, VerificationCode);
      console.log("verification code :" + VerificationCode);
      res.send({
        message: "Verification Code Sent to your Email",
        VerificationCode,
        email,
      });
    } catch (err) {
      console.log(err);
    }
  });
  // return res.status(200).json({message:'Email sent'});
  // }
  //return res.status(200).json({message :'verify route called'});
});

router.post("/changeusername", (req, res) => {
  const { username, email } = req.body;

  User.find({ username }).then(async (savedUser) => {
    if (savedUser.length > 0) {
      return res.status(422).json({ error: "Username already exists" });
    } else {
      return res
        .status(200)
        .json({ message: "Username Available", username, email });
    }
  });
});

router.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    const user = new User({
      username,
      email,
      password,
    });
    try {
      await user.save();
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      return res
        .status(200)
        .json({ message: "User Registered Successfully", token });
    } catch (err) {
      console.log(err);
      return res.status(422).json({ error: "User Not Registered" });
    }
  }
});

//FORGOT PASSWORD

router.post("/verifyfp", (req, res) => {
  // console.log(req.body);
  console.log("sent by client", req.body);
  const { email } = req.body;

  if (!email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  // else{
  User.findOne({ email: email }).then(async (savedUser) => {
    // console.log(savedUser);
    // return res.status(200).json({message:'Email sent'});
    if (savedUser) {
      try {
        let VerificationCode = Math.floor(100000 + Math.random() * 900000);
        await mailer(email, VerificationCode);
        console.log("verification code :" + VerificationCode);
        res.send({
          message: "Verification Code Sent to your Email",
          VerificationCode,
          email,
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      return res.status(422).json({ error: "Invalid Credentials" });
    }
  });
});

router.post("/resetpassword", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        savedUser.password = password;
        savedUser
          .save()
          .then((user) => {
            res.json({ message: "Password Changed Successfully" });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        return res.status(422).json({
          error: "Invalid Credentials",
        });
      }
    });
  }
});

router.post("/signin", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email })
      .then(async (savedUser) => {
        if (!savedUser) {
          return res.status(422).json({ error: "Invalid Credentials" });
        } else {
          console.log(savedUser);
          //res.status(200).json({message:"User Logged In Successfully",savedUser})
          bcrypt.compare(password, savedUser.password).then((doMatch) => {
            if (doMatch) {
              const token = jwt.sign(
                { _id: savedUser._id },
                process.env.JWT_SECRET
              );

              const { _id, username, email } = savedUser;
              res.json({
                message: "Successfully Signed In",
                token,
                user: { _id, username, email },
              });
            } else {
              return res.status(422).json({ error: "Invalid Credentials" });
            }
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

// router.post("/userdata", (req, res) => {
//   const { email } = req.body;

//   User.findOne({ email: email }).then((savedUser) => {
//     if (!savedUser) {
//       return res.status(422).json({ error: "Invalid Credentials" });
//     } else {
//       console.log(savedUser);
//       res.status(200).json({ message: "User Found", user: savedUser });
//     }
//   });
// });

router.post("/userdata", (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res
      .status(401)
      .json({ error: "You must be logged in, token not given" });
  }
  const token = authorization.replace("Bearer ", "");
  // console.log(token);

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "You must be logged in, token invalid" });
    }
    const { _id } = payload;
    User.findById(_id).then((userdata) => {
      res.status(200).send({
        message: "User Found",
        user: userdata,
      });
    });
  });
});

router.post("/changepassword", (req, res) => {
  const { oldpassword, newpassword, email } = req.body;

  if (!oldpassword || !newpassword || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        bcrypt.compare(oldpassword, savedUser.password).then((doMatch) => {
          if (doMatch) {
            savedUser.password = newpassword;
            savedUser
              .save()
              .then((user) => {
                res.json({ message: "Password Changed Successfully" });
              })
              .catch((err) => {
                // console.log(err);
                return res.status(422).json({ error: "Server Error" });
              });
          } else {
            return res.status(422).json({ error: "Invalid Credentials" });
          }
        });
      } else {
        return res.status(422).json({ error: "Invalid Credentials" });
      }
    });
  }
});

router.post("/setusername", (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }

  User.find({ username }).then(async (savedUser) => {
    if (savedUser.length > 0) {
      return res.status(422).json({ error: "Username already exists" });
    } else {
      User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
          savedUser.username = username;
          savedUser
            .save()
            .then((user) => {
              res.json({ message: "Username Updated Successfully" });
            })
            .catch((err) => {
              return res.status(422).json({ error: "Server Error" });
            });
        } else {
          return res.status(422).json({ error: "Invalid Credentials" });
        }
      });
    }
  });
});

router.post("/setdescription", (req, res) => {
  const { description, email } = req.body;
  if (!description || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }

  User.findOne({ email: email }).then(async (savedUser) => {
    if (savedUser) {
      savedUser.description = description;
      savedUser
        .save()
        .then((user) => {
          res.json({ message: "Description Updated Successfully" });
        })
        .catch((err) => {
          return res.status(422).json({ error: "Server Error" });
        });
    } else {
      return res.status(422).json({ error: "Invalid Credentials" });
    }
  });
});

router.post("/setprofilepic", (req, res) => {
  const { email, profilepic } = req.body;

  User.findOne({ email: email })
    .then((savedUser) => {
      if (!savedUser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      }
      savedUser.profilepic = profilepic;
      savedUser
        .save()
        .then((user) => {
          res.json({ message: "Profile picture updated successfully" });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.post("/addpost", (req, res) => {
  const { email, post, postdescription } = req.body;

  User.findOne({ email: email })
    .then((savedUser) => {
      if (!savedUser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      }
      savedUser.posts.push({ post, postdescription, likes: [], comments: [] });
      savedUser
        .save()
        .then((user) => {
          res.json({ message: "Post added successfully" });
        })
        .catch((err) => {
          res.json({ error: "Error adding post" });
        });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.post("/searchuser", (req, res) => {
  const { keyword } = req.body;

  if (!keyword) {
    return res.status(422).json({ error: "Please search a username" });
  }
  User.find({ username: { $regex: keyword, $options: "i" } })
    .then((user) => {
      console.log(user);
      let data = [];
      user.map((item) => {
        data.push({
          _id: item._id,
          username: item.username,
          email: item.email,
          description: item.description,
          profilepic: item.profilepic,
        });
      });
      console.log(data);
      if (data.length == 0) {
        return res.status(422).json({ error: "No User Found" });
      }
      res.status(200).send({
        message: "User Found",
        user: data,
      });
    })
    .catch((err) => {
      res.status(422).json({ error: "Server Error" });
    });
});
//get user by id

router.post("/otheruserdata", (req, res) => {
  const { email } = req.body;

  User.findOne({ email: email }).then((saveduser) => {
    if (!saveduser) {
      return res.status(422).json({ error: "Invalid Credentials" });
    }
    //    console.log(saveduser);

    let data = {
      _id: saveduser._id,
      username: saveduser.username,
      email: saveduser.email,
      description: saveduser.description,
      profilepic: saveduser.profilepic,
      followers: saveduser.followers,
      following: saveduser.following,
      posts: saveduser.posts,
    };

    // console.log(data);

    res.status(200).send({
      user: data,
      message: "User Found",
    });
  });
});

router.post('/getuserbyid', (req, res) => {
  const {userid } = req.body;

  User.findById({ _id: userid })
      .then(saveduser => {
          if (!saveduser) {
              return res.status(422).json({ error: "Invalid Credentials" });
          }
          //    console.log(saveduser);

          let data = {
              _id: saveduser._id,
              username: saveduser.username,
              email: saveduser.email,
              description: saveduser.description,
              profilepic: saveduser.profilepic,
              followers: saveduser.followers,
              following: saveduser.following,
              posts: saveduser.posts
          }

          // console.log(data);

          res.status(200).send({
              user: data,
              message: "User Found"
          })
      })
      .catch(
          err => {
              console.log('error in getuserbyid ');
          }
      )
})

router.post("/checkfollow", (req, res) => {
  const { followfrom, followto } = req.body;
  //follow from = my emial
  //follow to =friend email
  console.log(followfrom, followto);
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        let data = mainuser.following.includes(followto);
        console.log(data);
        if (data == true) {
          res.status(200).send({
            message: "User in following list",
          });
        } else {
          res.status(200).send({
            message: "User not in following list",
          });
        }
      }
    })
    .catch((err) => {
      return res.status(422).json({ error: "Server Error" });
    });
});

router.post("/followuser", (req, res) => {
  const { followfrom, followto } = req.body;
  //follow from = my emial
  //follow to =friend email
  console.log(followfrom, followto);
  //our profile -> add friend email to following
  //friends profile -> add our email to friend's followers
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        if (mainuser.following.includes(followto)) {
          console.log("already following");
        } else {
          mainuser.following.push(followto);
          mainuser.save();
        }
        // console.log(mainuser);

        User.findOne({ email: followto })
          .then((otheruser) => {
            if (!otheruser) {
              return res.status(422).json({ error: "Invalid Credentials" });
            } else {
              if (otheruser.followers.includes(followfrom)) {
                console.log("already followed");
              } else {
                otheruser.followers.push(followfrom);
                otheruser.save();
              }
              res.status(200).send({
                message: "User Followed",
              });
            }
          })
          .catch((err) => {
            return res.status(422).json({ error: "Server Error" });
          });
      }
    })
    .catch((err) => {
      return res.status(422).json({ error: "Server Error" });
    });
});

router.post("/unfollowuser", (req, res) => {
  const { followfrom, followto } = req.body;
  //follow from = my emial
  //follow to =friend email
  console.log(followfrom, followto);
  //our profile -> add friend email to following
  //friends profile -> add our email to friend's followers
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        if (mainuser.following.includes(followto)) {
          let index = mainuser.following.indexOf(followto);
          mainuser.following.splice(index, 1);
          mainuser.save();

          User.findOne({ email: followto })
            .then((otheruser) => {
              if (!otheruser) {
                return res.status(422).json({ error: "Invalid Credentials" });
              } else {
                if (otheruser.followers.includes(followfrom)) {
                  let index = otheruser.followers.indexOf(followfrom);
                  otheruser.followers.splice(index, 1);
                  otheruser.save();
                }
                res.status(200).send({
                  message: "User Unfollowed",
                });
              }
            })
            .catch((err) => {
              return res.status(422).json({ error: "Server Error" });
            });
        } else {
          console.log("not following");
        }
        // console.log(mainuser);
      }
    })
    .catch((err) => {
      return res.status(422).json({ error: "Server Error" });
    });
});

router.post('/savemessagetodb',async (req,res)=>{
  const {senderid,message,roomid,recieverid} = req.body;
   console.log("MESSAGE RECIEVED - ",req.body);

  try {
    const newMessage = new Message({
      senderid,
      message,
      roomid,
      recieverid
    });
    await newMessage.save();
    res.send({ message: "Message saved successfully" });
  } catch (error) {
    console.log("ERROR WHILE SAVING MESSAGE TO DB ",error);
    res.status(422).send(error.message);
  }
})

router.post('/getmessages',async (req,res)=>{
  const {roomid} =req.body;

  Message.find({roomid:roomid})
  .then(messages=>{
    res.status(200).send(messages);
  })
  .catch(err=>{
    console.log(err);
    res.status(422).send(err.message);
  })
})

router.post("/setusermessages",async (req,res)=>{
  const {ouruserid,fuserid,lastmessage,roomid}=req.body;
   console.log("MESSAGE RECIEVED - ",req.body);
  User.findOne({_id:ouruserid})
  .then(user=>{
    user.allmessages.map((item)=>{
      if (item.fuserid == fuserid) {
        user.allmessages.pull(item);
      }
      const date = Date.now();

      user.allmessages.push({
        ouruserid,
        fuserid,
        lastmessage,
        roomid,
        date
      })

      user.save()
      res.status(200).send({message:"Message Saved Successfully"});
    })
    .catch(err=>{
      console.log("error updating all chats",err);
      res.status(422).send(err.message)
    })
  })
})

router.post("/getusermessages",async (req,res)=>{
  const {userid} = req.body;
  console.log("USER ID RECEIVED - ", userid);
  User.findOne({_id:userid})
  .then(user=>{
    res.status(200).send(user.allmessages);
  })
  .catch(err=>{
    console.log("error getting all chats " , err);
    res.status(422).send(err.message);
  })
})

module.exports = router;
