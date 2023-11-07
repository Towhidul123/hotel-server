const express = require('express');
const cors = require ('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app. use(express.json());




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
   const userCollection =  client.db('hotelDB').collection('user');


    app.get('/services',async(req,res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })


    //api based on ID
    app.get('/products/:productId', async (req, res) => {
        const productId = req.params.productId;
      
        console.log('Received productId:', productId);
        
        try {
          const query = {_id: new ObjectId(productId) }; 
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