const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    //'http://127.0.0.1:5173',
    'http://localhost:5173',
   // 'https://ass-11-5faf8.web.app',
   // 'https://ass-11-5faf8.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


//middleware
const logger = async(req, res, next) =>{
  console.log('called:', req.host ,req.originalUrl)
  next();
}


const verifyToken = async(req, res, next) =>{
  const token = req.cookies?.token;
  console.log('value of token in middleware',token)
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded) =>{
    if(err){
      console.log(err)
      return res.status(401).send({message:'unauthorized'})
    }
    console.log('value in the token', decoded)
    req.user = decoded;

    next();
  })

 
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dc6i71y.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('hotelDB').collection('rooms');
    const userCollection = client.db('hotelDB').collection('user');
    const reviewsCollection = client.db('hotelDB').collection('reviews');
    
    //auth related api
    app.post('/jwt', logger, async(req,res)=>{
      console.log("auth setting")
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

      console.log('Before setting cookie');
      res.cookie(
        "token",
        token,
        {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true: false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        }
        )
        .send({success: true});
      console.log('After setting cookie');
    
    })

    //services related api
    app.get('/services', logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
      console.log("made by me")
    })


    //api based on ID
    app.get('/products/:productId', async (req, res) => {
      const productId = req.params.productId;

      console.log('Received productId:', productId);

      try {
        const query = { _id: new ObjectId(productId) };
        //console.log(query);
        const result = await serviceCollection.findOne(query);
        // console.log(result);

        if (!result) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }

        res.json(result);

      } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    //add to cart
    app.post('/addToCart', async (req, res) => {
      try {
        const newUserProduct = req.body;
        const result = await userCollection.insertOne(newUserProduct);
        res.send(result);
      } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // reading cart
    app.get('/addToCart',verifyToken, async (req, res) => {
      console.log(req.query.email);
   //   console.log('toktok',req.cookies.token)
   console.log('user in the valid token', req.user)
   if(req.query.email !== req.user.email){

    return res.status(403).send({message:'forbidden access'})

   }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })


    //deleting from cart

    app.delete('/addToCart/:id', async (req, res) => {
      const id = req.params.id;
      console.log(req.params.id)
      const query = { _id: new ObjectId(id) }
      console.log(query);

      const result = await userCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    })

    //updating

    // Add a new route for updating the booking date
app.patch('/updateBookingDate/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updatedBooking = req.body;
  const newDate = updatedBooking.newDate; // Assuming you're sending the new date in the request body

  const updateDoc ={
    $set: {
      formattedDate: newDate // Update the property name accordingly
    },
  };
  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);
})


  //reviews
  app.post('/reviews', async (req, res) => {
    try {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/reviews', async (req, res) => {
    const roomId = req.query.roomId;
    try {
      const query = { roomId: roomId };
      const result = await reviewsCollection.find(query).toArray();
      res.json(result);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  //review counts

  app.get('/reviewCount/:serviceId', async (req, res) => {
    const serviceId = req.params.serviceId;
    try {
      const query = { roomId: serviceId };
      const count = await reviewsCollection.countDocuments(query);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching review count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  

  app.patch('/updateRoomAvailability/:productId', async (req, res) => {
    const productId = req.params.productId;
    const { roomCount, availability } = req.body;

    if (roomCount >= 0 && (availability === 'available' || availability === 'unavailable')) {
        try {
            const query = { _id: new ObjectId(productId) };
            const updateDoc = {
                $set: {
                    room_count: roomCount,
                    availability: availability
                }
            };
            const result = await serviceCollection.updateOne(query, updateDoc);

            res.send({ ok: result.modifiedCount > 0 });
        } catch (error) {
            console.error('Error updating room availability:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(400).json({ error: 'Invalid request parameters' });
    }
});



  


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port} `)
})