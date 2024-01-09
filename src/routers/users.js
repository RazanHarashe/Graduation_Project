const User = require("../models/user");
const express = require("express");
const router = new express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../emails/sendEmail");
const fs = require("fs").promises;
router.post("/users/signup", async (req, res) => {
  const user = new User(req.body);
  const email = req.body.email;
  try {
    if (await User.findOne({ email: email })) {
      return res.status(400).send(`Email is already used!`);
    }
    if (!req.body.confirmPassword) {
      return res.status(400).send({ error: "Confirm password is required." });
    }
    if (req.body.password !== req.body.confirmPassword) {
      return res
        .status(400)
        .send({ error: "Passwords do not match. Please try again." });
    }
    await user.save();
    const token = jwt.sign({ email }, process.env.EMAILTOKEN, {
      expiresIn: "1h",
    });
    const link = `${req.protocol}://${req.headers.host}/users/confirmEmail/${token}`;

    sendEmail(email, "confirm email", link, user.name);

    res.status(201).send({ user, successful: true });
  } catch (e) {
    res.status(500).send(e);
  }
});

router.get("/users/confirmEmail/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const decoded = jwt.verify(token, process.env.EMAILTOKEN);
    const user = await User.findOneAndUpdate(
      { email: decoded.email, confirmEmail: false },
      { confirmEmail: true }
    );

    const template = await fs.readFile(
      "./src/emails/confemail.ejs",
      "utf-8"
    );
    

    if (!user) {
      return res
        .status(200)
        .send(
          template
            .replace(
              /<img src="\${img}" alt="">/g,
              `<img src="https://icon-library.com/images/sad-icon/sad-icon-6.jpg" alt="" style = "width: 100%">`
            )
            .replace(
              /\${status}/g,
              `<h3 style= "color: #FF0000">Sorry! Something went wrong.<br> <br> Your email is Not verified!</h3>`
            )
        );
    }
    if (user) {
      return res
        .status(400)
        .send(
          template
            .replace(
              /<img src="\${img}" alt="">/g,
              `<img src="https://img.freepik.com/premium-vector/opened-envelope-document-with-green-check-mark-line-icon-official-confirmation-message-mail-sent-successfully-email-delivery-verification-email-flat-design-vector_662353-720.jpg" alt="" style = "width: 100%"></img>`
            )
            .replace(
              /\${status}/g,
              `<h3 style= "color: #4CAF50">Congrats! Your email is verified.<br> <br> You can continue using the website.</h3>`
            )
        );
    }
  } catch (error) {
    return res
      .status(500)
      .send(
        template
          .replace(
            /<img src="\${img}" alt="">/g,
            `<img src="https://icon-library.com/images/sad-icon/sad-icon-6.jpg" alt="" style = "width: 100%">`
          )
          .replace(
            /\${status}/g,
            `<h3 style= "color: #FF0000">Sorry! Something went wrong.<br> <br> Your email is Not verified!</h3>`
          )
      );
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).send("User not found!");
    }
    if (!user.confirmEmail) {
      return res.status(400).json({ message: "plz confirm your eamil " });
    }
    if (await bcrypt.compare(req.body.password, user.password)) {
      const token = jwt.sign(
        { userId: user.id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );
      user.tokens = user.tokens.concat({ token });
      await user.save();
      res.send({ user, token });
    } else {
      return res.status(400).send("password is wrong!");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
