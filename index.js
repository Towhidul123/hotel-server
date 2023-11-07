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
  origin: ['http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());




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
    app.post('/jwt',async(req,res)=>{
    
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})


      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
      
      })
      .send({success: true});
    
    })

    //services related api
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
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
    app.get('/addToCart', async (req, res) => {
      console.log(req.query.email);
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