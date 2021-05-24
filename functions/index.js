const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')

admin.initializeApp()
const app = express()


app.get('/reviews', (request, response) => {
  admin.firestore().collection('reviews').orderBy('createdAt', 'desc').get()
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

  admin.firestore().collection('reviews').add(review)
    .then(doc => {
      response.json({ message: `Document ${doc.id} created successfully` })
    })
    .catch(error => {
      response.status(500).json({ error: 'Something went wrong' })
      console.error(error)
    })
})

// format url as : https://baseurl.com/api/
exports.api = functions.region('europe-west1').https.onRequest(app)