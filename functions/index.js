const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const firebase = require('firebase')

admin.initializeApp()
const app = express()

const firebaseConfig = {
  apiKey: "AIzaSyC_T0AFIyR_8Uowg82Ddpas1qtgycViT6o",
  authDomain: "movies-181e8.firebaseapp.com",
  projectId: "movies-181e8",
  storageBucket: "movies-181e8.appspot.com",
  messagingSenderId: "1024435590017",
  appId: "1:1024435590017:web:2400e1f6659cc133720e80",
  measurementId: "G-CF881YXC9E"
}

firebase.initializeApp(firebaseConfig)

const db = admin.firestore()


app.get('/reviews', (request, response) => {
  db.collection('reviews').orderBy('createdAt', 'desc').get()
    .then(data => {
      const reviews = []
      data.forEach(doc => {
        reviews.push({
          reviewId: doc.id,
          ...doc.data()
        })
      })
      return response.json(reviews)
    })
    .catch(error => {
      response.status(500).json({ error: 'Something went wrong' })
      console.error(error)
    })
})

app.post('/review', (request, response) => {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Method not allowed' })
  }
  const review = {
    userId: request.body.userId,
    movieId: request.body.movieId,
    review: request.body.review,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  db.collection('reviews').add(review)
    .then(doc => {
      response.json({ message: `Document ${doc.id} created successfully` })
    })
    .catch(error => {
      response.status(500).json({ error: 'Something went wrong' })
      console.error(error)
    })
})

const isEmpty = string => {
  return string.trim() === ''
}

const isValidEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return email.match(emailRegEx)
}

// Signup route
app.post('/signup', (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    username: request.body.username
  }

  let errors = {}

  if (isEmpty(user.email)) {
    errors.email = 'Must not be empty'
  } else {
    if (!isValidEmail(user.email)) {
      errors.email = 'Must be a valid email address '
    }
  }

  if (isEmpty(user.password)) {
    errors.password = 'Must not be empty'
  }

  if (user.password !== user.confirmPassword) {
    errors.confirmPassword = 'Passwords must match'
  }

  if (isEmpty(user.username)) {
    errors.username = 'Must not be empty'
  }

  if (Object.keys(errors).length !== 0) {
    response.status(400).json(errors)
  }

  let token, userId
  db.doc(`/users/${user.username}`).get()
    .then(doc => {
      if (doc.exists) {
        response.status(400).json({ message: 'This username is already taken' })
      } else {
        return firebase.auth().createUserWithEmailAndPassword(user.email, user.password)
      }
    })
    .then(data => {
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(userToken => {
      token = userToken
      const userCredentials = {
        username: user.username,
        email: user.email,
        createdAt: new Date().toISOString(),
        userId
      }

      db.doc(`/users/${user.username}`).set(userCredentials)
        .then(() => {
          response.status(201).json({ token })
        })
    })
    .catch(error => {
      if (error.code === 'auth/email-already-in-use') {
        response.status(400).json({ error: 'Email already in use' })
      } else {
        response.status(500).json({ error: error.code })
      }
      console.error(error)
    })
})

// Login route 
app.post('/login', (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  }

  const errors = {}

  if (isEmpty(user.email)) {
    errors.email = 'Must not be empty'
  }
  if (isEmpty(user.password)) {
    errors.password = 'Must not be empty'
  }
  if (Object.keys(errors).length !== 0) {
    response.status(400).json(errors)
  }

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      response.json({ token })
    })
    .catch(error => {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        response.status(403).json({ general: 'Wrong credentials' })
      } else {
        response.status(500).json({ error: error.code })
      }
      console.error(error)
    })
})

// format url as : https://baseurl.com/api/
exports.api = functions.region('europe-west1').https.onRequest(app)