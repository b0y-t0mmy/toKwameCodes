const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');

const User = require('../models/user');
const Personnel = require('../models/members');

let storage = multer.diskStorage({
    destination: 'public/uploads/images/',
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

let upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
});

router.get("/trial", (req, res) => {
    res.render("trial")
});

router.get("/login", (req, res) => {
    res.render("login")
});

router.get("/newaccountpage1", (req, res) => {
    res.render("newAccountPage1")
});

router.get("/newaccountpage2/", (req, res) => {
    res.render("newAccountPage2")
});

router.get("/newaccountpage3", (req, res) => {
    Personnel.findOne({}).populate('user')
      .then(image => {
        res.render("newAccountPage3", {image : image})
      })
});

router.get("/mainpage/profile", (req, res) => {
    res.render("profile")
});

router.get("/personnel", (req, res) => {
    let searchQuery = {username : req.query.username}

    Personnel.findOne(searchQuery).populate('user')
      .then(personnel)
})

router.get("/transaction", (req, res) => {
    res.render("transaction")
});

router.get("/accounts", (req, res) => {
    Personnel.find({}).populate('user')
        .then(personnels => {
            res.render("accounts", { personnels: personnels });
        })
        .catch(err => {
            console.log(err);
            req.flash('error_msg', 'ERROR :' + err)
            res.redirect('/accounts');
        })
});

router.get("/mainpage", (req, res) => {
    Personnel.find({}).populate('user')
        .then(personnels => {
           
            res.render("mainPage", { personnels: personnels });
        })
        .catch(err => {
            console.log(err);
            req.flash('error_msg', 'ERROR :' + err)
        })
});

router.get("/update/:id", (req, res) => {

    let searchQuery = { _id: req.params.id };
    Personnel.findOne(searchQuery).populate('user')
        .then(personnel => {
            res.render("update", { personnel: personnel });
        })
        .catch(err => {
            console.log(err);
        })
});

router.get("/forgot", (req, res) => {
    res.render("forgot")
});

router.get("/logout", (req, res) => {
    req.logOut();
    req.flash('success_msg', 'You have been logged out.');
    res.redirect("/login")
})


//POST ROUTES

router.post('/login', passport.authenticate('local', {
    successRedirect: '/mainpage',
    failureRedirect: '/login',
    failureFlash: 'Invalid email or password. Try again.'
}))

router.post("/newaccountpage1", async (req, res) => {

    let newUser = {
        username: req.body.username,
        email: req.body.email
    }

    let user = null

    try {
        user = await User.register(newUser, req.body.password);

    }catch(e) {
        req.flash('error_msg', 'ERROR :' + e)
        res.redirect('/login');
    }

    let { genderRadios, phone, date } = req.body;

    const personnel = await Personnel.create({
        genderRadios,
        phone,
        date,
        user: user.id
    });
   
    if(!personnel) {
        console.log(err);
        req.flash('error_msg', 'ERROR: ' + err);
        res.redirect('/login');
    }

    req.session.userId = user.id;

    res.redirect('/newaccountpage2');
});


router.put("/newaccountpage2", async (req, res) => {

    try {
         await Personnel.updateOne({ user: req.session.userId }, {
            region : req.body.region,
            category : req.body.category,
            farmName : req.body.farmName,
            location : req.body.location,
            city : req.body.city,
            address : req.body.address,
            hometown : req.body.hometown
        })

        res.redirect("/newaccountpage3");
    }catch(err) {
        console.log('ERROR:' + err)
        req.flash('error_msg', 'ERROR: ' + err);
        res.redirect('/login');
    }   
})

router.post("/newaccountpage3", upload.single('picture'), async (req,res, next) => {
   
    try{
       
        await Personnel.updateOne({ user: req.session.userId }, {
            produce : req.body.produce,
            imgUrl: req.file.filename
        })

        res.redirect("/mainpage");
    }catch(err) {
        console.log('ERROR:' + err)
        req.flash('error_msg', 'ERROR: ' + err);
        res.redirect('/login');
    } 
})



function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
        return cb(null, true);
    } else {
        cb('Error : Please images only');
    }
}


router.post('/uploadpicture', upload.single('picture'), (req, res, next) => {
    const file = req.file;
    if (!file) {
         req.flash("error_msg", "Please select an image")
         return console.log('Please select an image'); 
    }

    let url = file.path.replace('public', '');

    Personnel.findOne({ imgUrl: url }).populate('user')
        .then(img => {
            if (img) {
                console.log('Picture already exist. Try again');
                return res.redirect('/newaccountpage3');
            }

            Personnel.create({ imgUrl: url })
                .then(img => {
                    console.log('Image saved');
                    return res.redirect('/newaccountpage3');
                })
        })
        .catch(err => {
            return console.log('ERROR :' + err)
        })
});


router.post("/forgot", (req, res, next) => {
    let recoveryPassword = "";
    async.waterfall([
        (done) => {
            crypto.randomBytes(30, (err, buf) => {
                let token = buf.toString("hex");
                done(err, token);
            });
        },
        (token, done) => {
            Personnel.findOne({ email: req.body.email }).populate('user')
                .then(personnel => {
                    if (!personnel) {
                        req.flash("error_msg", "User with this email does not exist.");
                        return res.redirect("/login");
                    }

                    personnel.resetPasswordToken = token;
                    personnel.resetPasswordExpires = Date.now() + 1800000;

                    personnel.save(err => {
                        done(err, token, personnel);
                    });
                })
                .catch(err => {
                    req.flash("error_msg", "ERROR: " + err);
                    res.redirect("/login");
                })
        },
        (token, personnel) => {
            let smtpTransport = nodemailer.createTransport({
                service: "GMAIL",
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                },
                debug: true,
                logger: true
            });


            let mailOptions = {
                to: personnel.email,
                from: "Treshold Buckler treshold001@gmail.com",
                subject: "Recovery email from Glorious Shining Star International School",
                text: "Please click on the following link to recover your password: \n\n" +
                    "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                    "If you did not request this, please ignore this email."
            };
            smtpTransport.sendMail(mailOptions, err => {
                req.flash("success_msg", "An email with further instructions has been sent to you. Please check your email.");
                res.redirect("/login");
            });
        }
    ], err => {
        if (err) res.redirect("/login")
    });
});

router.post("/reset/:token", (req, res) => {
    async.waterfall([
        (done) => {
            Personnel.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }).populate('user')
                .then(personnel => {
                    if (!personnel) {
                        req.flash("error_msg", "Password token is invalid or has expired.");
                        res.redirect("/login");
                    }
                    if (req.body.password !== req.body.confirmPassword) {
                        req.flash("error_msg", "Password does not match.");
                        return res.redirect("/login");
                    }
                    personnel.setPassword(req.body.password, err => {
                        res.resetPasswordToken = undefined;
                        res.resetPasswordExpires = undefined;

                        employee.save(err => {
                            req.logIn(employee, err => {
                                done(err, employee);
                            })
                        });
                    });
                })
                .catch(err => {
                    req.flash("error_msg", "ERROR:" + err)
                    res.redirect("/login");
                });
        },
        (personnel) => {
            let smtpTransport = nodemailer.createTransport({
                service: "GMAIL",
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    PASS: process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: personnel.email,
                from: "treshold001@gmail.com",
                subject: "Your password has been changed",
                text: "Hello" + employee.name + "\n\n" +
                    "This is a confirmation that your password for your account " + employee.email + "has been changed"
            };

            smtpTransport.sendMail(mailOptions, err => {
                req.flash("succes_msg", "Your password has been changed successfully.");
                res.redirect("/login");
            })
        }
    ], err => {
        res.redirect("/login")
    }
    )
})




//PUT ROUTES
router.put("/update/:id", (req, res) => {
    let id = { _id: req.params.id }

    Personnel.updateOne(id, {
        $set: {
            genderRadios: req.body.genderRadios,
            date: req.body.date,

        }
    }).then(result => {

        let personnel = Personnel.findOne(id).populate('user').then(personnel => {
            User.updateOne({ _id: personnel.user.id }, { username: req.body.username }, { email: req.body.email }, (err, user) => {
                if (err) {
                    req.flash('error_msg', 'ERROR :' + err)
                    res.redirect('/accounts/' + req.params.id);
                }

                req.flash('success_msg', 'Info has been updated')
                res.redirect('/accounts');
            })
        })
    }).catch(err => {
        console.log(err)
        req.flash('error_msg', 'ERROR :' + err)
        res.redirect('/accounts/' + req.params.id);
    })
});

//DELETE routes
router.delete("/delete/:id", (req, res) => {
    let searchQuery = { _id: req.params.id }

    Personnel.remove(searchQuery).populate('user')
        .then(personnel => {
            req.flash('success_msg', 'Deleted successfully')
            res.redirect("/accounts");
        })
        .catch(err => {
            console.log(err);
        });
})


module.exports = router; 