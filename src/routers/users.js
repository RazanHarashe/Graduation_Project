const User = require("../models/user");
const express = require("express");
const router = new express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../emails/sendEmail");

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
    // link=`http://localhost:3001/users/confirmEmail/${token}`

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

    if (!user) {
      return res.status(400).json({ message: "your email is not verified" });
    }
    if (user) {
      return res.status(400).json({ message: "your email is verified" });
    }
  } catch (error) {
    console.error(error);
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
